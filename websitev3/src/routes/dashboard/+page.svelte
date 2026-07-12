<script>
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	const servers = $derived(
		/** @type {Array<{ id: string; name: string; avatarUrl: string; memberCount: number; totalActions: number; owner: { id: string; username: string; avatarUrl: string } }>} */
		(data.servers ?? [])
	);
	const selectedSort = $derived(data.selectedSort ?? 'members');
	const selectedGraphRange = $derived(data.selectedGraphRange ?? '24h');
	const selectedGraphWindowOffset = $derived(Math.max(0, data.selectedGraphWindowOffset ?? 0));
	const maxGraphWindowOffset = $derived(maxGraphWindowOffsetForRange(selectedGraphRange));
	const canGoBackWindow = $derived(selectedGraphWindowOffset < maxGraphWindowOffset);
	const canGoForwardWindow = $derived(selectedGraphWindowOffset > 0);
	const graphRangeLabel = $derived(
		selectedGraphRange === '24h'
			? 'Last 24h'
			: selectedGraphRange === '1w'
				? 'Last Week'
				: selectedGraphRange === '2w'
					? 'Last 2 Weeks'
				: selectedGraphRange === '1m'
					? 'Last Month (Weekly)'
					: selectedGraphRange === '2m'
						? 'Last 2 Months (Weekly)'
					: 'Last 6 Months (Monthly)'
	);
	const selectedServer = $derived(
		servers.find((server) => server.id === data.selectedServerId) ?? null
	);
	const selectedServerConfig = $derived(data.selectedServerConfig ?? null);

	let nitroSteamScamEnabled = $derived(data.selectedServerConfig?.nitro_steam_spam);
	let maliciousRedirectsEnabled = $derived(data.selectedServerConfig?.malicious_redirects);
	let imageSpamEnabled = $derived(data.selectedServerConfig?.image_spam);
	let linkSpamEnabled = $derived(data.selectedServerConfig?.link_spam);
	let textSpamEnabled = $derived(data.selectedServerConfig?.text_spam);
	let profileSpamEnabled = $derived(data.selectedServerConfig?.profile_spam);
	let removalActionSelected = $derived(data.selectedServerConfig?.removal_action);

	const guildNameMap = $derived(new Map(servers.map((server) => [server.id, server.name])));
	const streamPageSize = 3;
	let visibleEventCount = $state(streamPageSize);
	let viewportWidth = $state(0);
	const visibleEvents = $derived((data.events ?? []).slice(0, visibleEventCount));
	const hasMoreEvents = $derived((data.events ?? []).length > visibleEventCount);
	let isGraphLoading = $state(false);
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let graphLoadingTimeout;
	let toastVisible = $state(false);
	let toastMessage = $state('');
	/** @type {'success' | 'error'} */
	let toastType = $state('success');
	let toastId = $state(0);
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let toastTimeout;
	const timeline = $derived(
		data.timeline ?? {
			labels: [],
			series: { warn: [], kick: [], timeout: [], ban: [], fail: [] }
		}
	);

	const graphBucketSize = $derived(
		selectedGraphRange !== '24h' ? 1 : viewportWidth <= 640 ? 3 : viewportWidth <= 940 ? 2 : 1
	);

	const shouldCondense24h = $derived(graphBucketSize > 1);

	/**
	 * @param {number[]} values
	 * @param {number} bucketSize
	 */
	function groupSeries(values, bucketSize) {
		const grouped = [];

		for (let index = 0; index < values.length; index += bucketSize) {
			let total = 0;

			for (let offset = 0; offset < bucketSize; offset += 1) {
				total += values[index + offset] ?? 0;
			}

			grouped.push(total);
		}

		return grouped;
	}

	const graphTimeline = $derived(
		shouldCondense24h
			? {
				labels: timeline.labels.reduce((labels, label, index) => {
					if (index % graphBucketSize !== 0) {
						return labels;
					}

					const endLabel = timeline.labels[index + (graphBucketSize - 1)] ?? label;
					labels.push(endLabel ? `${label}-${endLabel}` : label);
					return labels;
				}, /** @type {string[]} */ ([])),
				series: {
					warn: groupSeries(timeline.series.warn, graphBucketSize),
					kick: groupSeries(timeline.series.kick, graphBucketSize),
					timeout: groupSeries(timeline.series.timeout, graphBucketSize),
					ban: groupSeries(timeline.series.ban, graphBucketSize),
					fail: groupSeries(timeline.series.fail, graphBucketSize)
				}
			}
			: timeline
	);

	const bucketTotals = $derived(
		graphTimeline.labels.map(
			(_, index) =>
				graphTimeline.series.warn[index] +
				graphTimeline.series.kick[index] +
				graphTimeline.series.timeout[index] +
				graphTimeline.series.ban[index] +
				graphTimeline.series.fail[index]
		)
	);

	const timelineMax = $derived(Math.max(1, ...bucketTotals));

	const yAxisTicks = $derived(
		[1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
			ratio,
			value: Math.max(0, Math.round(timelineMax * ratio))
		}))
	);

	/** @type {HTMLDetailsElement | undefined} */
	let serverFilterDetails = $state(undefined);

	/** @param {string | string[] | null | undefined} serverId */
	function dashboardUrl(
		serverId,
		sortBy = selectedSort,
		graphRange = selectedGraphRange,
		graphWindowOffset = selectedGraphWindowOffset
	) {
		const params = new URLSearchParams();
		const normalizedServerId = Array.isArray(serverId) ? serverId[0] : serverId;

		if (normalizedServerId) {
			params.set('server', normalizedServerId);
		}

		if (sortBy && sortBy !== 'members') {
			params.set('sort', sortBy);
		}

		if (graphRange && graphRange !== '24h') {
			params.set('range', graphRange);
		}

		if (graphWindowOffset > 0) {
			params.set('window', String(graphWindowOffset));
		}

		const query = params.toString();
		return query ? `/dashboard?${query}` : '/dashboard';
	}

	/** @param {number} delta */
	function dashboardWindowUrl(delta) {
		const nextOffset = Math.min(
			maxGraphWindowOffset,
			Math.max(0, selectedGraphWindowOffset + delta)
		);
		return dashboardUrl(data.selectedServerId, selectedSort, selectedGraphRange, nextOffset);
	}

	/** @param {'24h' | '1w' | '2w' | '1m' | '2m' | '6m'} graphRange */
	function maxGraphWindowOffsetForRange(graphRange) {
		if (graphRange === '24h') {
			return 179;
		}

		if (graphRange === '1w') {
			return 25;
		}

		if (graphRange === '2w') {
			return 12;
		}

		if (graphRange === '1m') {
			return 4;
		}

		if (graphRange === '2m') {
			return 2;
		}

		return 0;
	}

	/** @param {number} index */
	function totalAt(index) {
		return bucketTotals[index] ?? 0;
	}

	function closeServerFilter() {
		serverFilterDetails?.removeAttribute('open');
	}

	function clearGraphLoading() {
		isGraphLoading = false;

		if (graphLoadingTimeout) {
			clearTimeout(graphLoadingTimeout);
			graphLoadingTimeout = undefined;
		}
	}

	function onServerSelected() {
		closeServerFilter();
		clearGraphLoading();
		isGraphLoading = true;
		graphLoadingTimeout = setTimeout(() => {
			isGraphLoading = false;
			graphLoadingTimeout = undefined;
		}, 12000);
	}

	$effect(() => {
		data.events;
		visibleEventCount = streamPageSize;
		clearGraphLoading();
	});

	$effect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const onResize = () => {
			viewportWidth = window.innerWidth;
		};

		onResize();
		window.addEventListener('resize', onResize);

		return () => {
			window.removeEventListener('resize', onResize);
		};
	});

	/** @param {string | null | undefined} guildId */
	function guildNameFor(guildId) {
		if (!guildId) {
			return 'Unknown Guild';
		}

		return guildNameMap.get(guildId) ?? `Unknown Guild (${guildId})`;
	}

	/** @param {string | null | undefined} iso */
	function localizedDateTime(iso) {
		if (!iso) {
			return 'Unknown time';
		}

		const date = new Date(iso);

		if (Number.isNaN(date.valueOf())) {
			return 'Unknown time';
		}

		return new Intl.DateTimeFormat(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(date);
	}

	/** @param {string | null | undefined} username */
	function displayUsername(username) {
		if (!username) {
			return 'Unknown User';
		}

		return username.endsWith('#0') ? username.slice(0, -2) : username;
	}

	/** @param {string | null | undefined} value */
	async function copyId(value) {
		if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
			return;
		}

		await navigator.clipboard.writeText(value);
	}

	function showMoreEvents() {
		visibleEventCount += streamPageSize;
	}

	/**
	 * @param {string} message
	 * @param {'success' | 'error'} type
	 */
	function showToast(message, type) {
		toastMessage = message;
		toastType = type;
		toastId += 1;
		toastVisible = true;

		if (toastTimeout) {
			clearTimeout(toastTimeout);
		}

		toastTimeout = setTimeout(() => {
			toastVisible = false;
			toastTimeout = undefined;
		}, 5000);
	}

	async function saveServerConfig() {
		if (!selectedServer) return;

		try {
			const result = await fetch('/dashboard/update_config', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					guildId: selectedServer.id,
					image_spam: imageSpamEnabled,
					link_spam: linkSpamEnabled,
					malicious_redirects: maliciousRedirectsEnabled,
					nitro_steam_spam: nitroSteamScamEnabled,
					profile_spam: profileSpamEnabled,
					removal_action: removalActionSelected,
					text_spam: textSpamEnabled
				})
			});

			const { success, error } = await result.json();

			if (success) {
				showToast('Server configuration saved successfully', 'success');
				return;
			}

			showToast(error ?? 'Unable to save server configuration', 'error');
		} catch {
			showToast('Unable to save server configuration', 'error');
		}
	}
</script>

<main class="dashboard-shell">
	<section class="dashboard-hero panel">
		<div>
			<h1>Scam Hunter Dashboard</h1>
			<p class="lead">
				Review activities the bot has taken over time, then refine the rules you want enabled for your communities.
			</p>

			{#if servers.length > 0}
				<details class="server-filter" bind:this={serverFilterDetails}>
					<summary>
						<div class="server-choice">
							<img
								src={selectedServer?.avatarUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png'}
								alt="server avatar"
								class="server-avatar"
							/>
							<div>
								<p class="choice-title">
									{selectedServer ? selectedServer.name : 'All Servers'}
								</p>
								<p class="choice-subtitle">
									{selectedServer
										? `Owner: ${selectedServer.owner.username} | Users: ${selectedServer.memberCount} | Actions: ${selectedServer.totalActions}`
										: 'Filter graph by server'}
								</p>
							</div>
						</div>
					</summary>

					<div class="server-menu">
						<div class="server-sort-row">
							<span class="choice-subtitle">Sort servers by:</span>
							<div class="server-sort-options">
								<a
									href={dashboardUrl(data.selectedServerId, 'members')}
									data-sveltekit-noscroll
									class={`server-sort-pill ${selectedSort === 'members' ? 'active' : ''}`}
								>
									User Count
								</a>
								<a
									href={dashboardUrl(data.selectedServerId, 'actions')}
									data-sveltekit-noscroll
									class={`server-sort-pill ${selectedSort === 'actions' ? 'active' : ''}`}
								>
									Actions Taken
								</a>
								<a
									href={dashboardUrl(data.selectedServerId, 'name')}
									data-sveltekit-noscroll
									class={`server-sort-pill ${selectedSort === 'name' ? 'active' : ''}`}
								>
									Name
								</a>
							</div>
						</div>

						<a href={dashboardUrl(null)} data-sveltekit-noscroll class="server-item" onclick={onServerSelected}>
							<img
								src="https://cdn.discordapp.com/embed/avatars/0.png"
								alt="all servers"
								class="server-avatar"
							/>
							<div>
								<p class="choice-title">All Servers</p>
								<p class="choice-subtitle">Show global bot actions</p>
							</div>
						</a>

						{#each servers as server}
							<a href={dashboardUrl(server.id)} data-sveltekit-noscroll class="server-item" onclick={onServerSelected}>
								<img src={server.avatarUrl} alt={`${server.name} avatar`} class="server-avatar" />
								<div class="server-meta">
									<p class="choice-title">{server.name}</p>
									<p class="choice-subtitle">Users: {server.memberCount} | Actions: {server.totalActions}</p>
									<div class="owner-line">
										<img src={server.owner.avatarUrl} alt="owner avatar" class="owner-avatar" />
										<p class="choice-subtitle">Owner: {server.owner.username}</p>
									</div>
								</div>
							</a>
						{/each}
					</div>
				</details>
			{/if}
		</div>
	</section>

	<section class="dashboard-kpis">
		{#each data.metrics as metric}
			<article>
				<p class="dashboard-value">{metric.value}</p>
				<p class="dashboard-label">{metric.label}</p>
			</article>
		{/each}
	</section>

	<section class="dashboard-card action-graph-card">
		<div class="graph-head">
			<h2>Recent Action Graph ({graphRangeLabel})</h2>
			<p class="stream-copy">warn, kick, timeout, ban, and fail actions attempted by the bot over time</p>
			<div class="graph-window-row">
				{#if canGoBackWindow}
					<a
						href={dashboardWindowUrl(1)}
						data-sveltekit-noscroll
						class="server-sort-pill graph-window-nav"
						aria-label="View previous time window"
					>
						← Back
					</a>
				{:else}
					<span
						class="server-sort-pill graph-window-nav disabled"
						aria-disabled="true"
						aria-label="Maximum six-month history reached"
					>
						← Back
					</span>
				{/if}
				<span class="stream-copy timeframe-indicator">
					{#if selectedGraphWindowOffset === 0}
					Today
					{:else}
					{#if selectedGraphRange === '24h'}
						{selectedGraphWindowOffset} 
						{#if selectedGraphWindowOffset > 1}
						days ago
						{:else}
						day ago
						{/if}
					{:else if selectedGraphRange === '2w'}
						{selectedGraphWindowOffset * 2} 
						{#if selectedGraphWindowOffset > 1}
						weeks ago
						{:else}
						weeks ago
						{/if}
					{:else if selectedGraphRange === '1m'}
						{selectedGraphWindowOffset} 
						{#if selectedGraphWindowOffset > 1}
						months ago
						{:else}
						month ago
						{/if}
					{:else if selectedGraphRange === '2m'}
						{selectedGraphWindowOffset * 2} 
						{#if selectedGraphWindowOffset > 1}
						months ago
						{:else}
						months ago
						{/if}
					{:else if selectedGraphRange === '6m'}
						{selectedGraphWindowOffset * 6} 
						{#if selectedGraphWindowOffset > 1}
						months ago
						{:else}
						months ago
						{/if}
					{:else}
					Back
					{/if}
				{/if}
				</span>
				{#if canGoForwardWindow}
					<a
						href={dashboardWindowUrl(-1)}
						data-sveltekit-noscroll
						class="server-sort-pill graph-window-nav"
						aria-label="View next time window"
					>
						Forward →
					</a>
				{:else}
					<span
						class="server-sort-pill graph-window-nav disabled"
						aria-disabled="true"
						aria-label="Already at current time window"
					>
						Forward →
					</span>
				{/if}
			</div>
			<div class="graph-range-row">
				<a
					href={dashboardUrl(data.selectedServerId, selectedSort, '24h', 0)}
					data-sveltekit-noscroll
					class={`server-sort-pill ${selectedGraphRange === '24h' ? 'active' : ''}`}
				>
					24 Hours
				</a>
				<a
					href={dashboardUrl(data.selectedServerId, selectedSort, '2w', 0)}
					data-sveltekit-noscroll
					class={`server-sort-pill ${selectedGraphRange === '2w' ? 'active' : ''}`}
				>
					2 Weeks
				</a>
				<a
					href={dashboardUrl(data.selectedServerId, selectedSort, '1m', 0)}
					data-sveltekit-noscroll
					class={`server-sort-pill ${selectedGraphRange === '1m' ? 'active' : ''}`}
				>
					1 Month
				</a>
				<a
					href={dashboardUrl(data.selectedServerId, selectedSort, '2m', 0)}
					data-sveltekit-noscroll
					class={`server-sort-pill ${selectedGraphRange === '2m' ? 'active' : ''}`}
				>
					2 Months
				</a>
				<a
					href={dashboardUrl(data.selectedServerId, selectedSort, '6m', 0)}
					data-sveltekit-noscroll
					class={`server-sort-pill ${selectedGraphRange === '6m' ? 'active' : ''}`}
				>
					6 Months
				</a>
			</div>
		</div>

		<div class="graph-legend">
			<span><i class="legend-dot warn"></i>warn</span>
			<span><i class="legend-dot kick"></i>kick</span>
			<span><i class="legend-dot timeout"></i>timeout</span>
			<span><i class="legend-dot ban"></i>ban</span>
			<span><i class="legend-dot fail"></i>fail</span>
		</div>

		<div class="action-graph-wrap">
			{#if isGraphLoading}
				<div class="graph-loading-overlay" aria-live="polite" aria-label="Loading graph data">
					<div class="graph-spinner"></div>
					<span>Loading graph...</span>
				</div>
			{/if}

			<div class="graph-layout">
				<div class="graph-y-axis" aria-hidden="true">
					{#each yAxisTicks as tick}
						<span>{tick.value}</span>
					{/each}
				</div>

				<div class="action-graph-area">
					<div class="graph-grid-lines" aria-hidden="true">
						{#each yAxisTicks as tick}
							<span class="grid-line" style={`top:${(1 - tick.ratio) * 100}%`}></span>
						{/each}
					</div>

					<div class="action-graph" class:is-condensed-24h={shouldCondense24h}>
						{#each graphTimeline.labels as label, index}
							<div class="graph-column">
								<div class="graph-bars" role="img" aria-label={`Action counts at ${label}; total ${totalAt(index)}`}>
									{#if graphTimeline.series.warn[index] > 0}
										<div
											class="graph-bar warn"
											style={`height:${(graphTimeline.series.warn[index] / timelineMax) * 100}%`}
											title={`${label} warn: ${graphTimeline.series.warn[index]}`}
										></div>
									{/if}
									{#if graphTimeline.series.kick[index] > 0}
										<div
											class="graph-bar kick"
											style={`height:${(graphTimeline.series.kick[index] / timelineMax) * 100}%`}
											title={`${label} kick: ${graphTimeline.series.kick[index]}`}
										></div>
									{/if}
									{#if graphTimeline.series.timeout[index] > 0}
										<div
											class="graph-bar timeout"
											style={`height:${(graphTimeline.series.timeout[index] / timelineMax) * 100}%`}
											title={`${label} timeout: ${graphTimeline.series.timeout[index]}`}
										></div>
									{/if}
									{#if graphTimeline.series.ban[index] > 0}
										<div
											class="graph-bar ban"
											style={`height:${(graphTimeline.series.ban[index] / timelineMax) * 100}%`}
											title={`${label} ban: ${graphTimeline.series.ban[index]}`}
										></div>
									{/if}
									{#if graphTimeline.series.fail[index] > 0}
										<div
											class="graph-bar fail"
											style={`height:${(graphTimeline.series.fail[index] / timelineMax) * 100}%`}
											title={`${label} fail: ${graphTimeline.series.fail[index]}`}
										></div>
									{/if}
								</div>
								<p class="graph-label">
									{#if shouldCondense24h && label.includes('-')}
										{label.slice(0, label.indexOf('-') + 1)}<br />
										{label.slice(label.indexOf('-') + 1)}
									{:else}
										{label}
									{/if}
								</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="dashboard-grid">
		<div class="dashboard-card detection-card">
			<h2>Recent Detection Stream (Last 7 Days)</h2>
			<ul class="event-stream">
				{#each visibleEvents as event}
					<li 
						class:is-warning={event.title === 'Warning event captured'}
						class:is-kick={event.title === 'Compromised account removed (kick)'}
						class:is-timeout={event.title === 'Account containment timeout applied'}
						class:is-error={event.title === 'Removal escalation failed and logged'}
						class:is-ban={event.title === 'Ban action completed successfully'}>
						<span class="stream-title">{event.title}</span>
						{#if event.guildId || event.userId || event.dateIso}
							<div class="stream-meta-grid">
								<span class="stream-copy">
									Guild: {guildNameFor(event.guildId)}
								</span>
								{#if event.guildId}
									<button type="button" class="copy-chip" onclick={() => copyId(event.guildId)}>
										Copy Guild ID
									</button>
								{/if}

								<span class="stream-copy">
									User: {displayUsername(event.username)}
								</span>
								{#if event.userId}
									<button type="button" class="copy-chip" onclick={() => copyId(event.userId)}>
										Copy User ID
									</button>
								{/if}

								<span class="stream-copy">Time: {localizedDateTime(event.dateIso)}</span>
								{#if event.reason}
									<span class="stream-copy">Reason: {event.reason}</span>
								{/if}
							</div>
						{:else}
							<span class="stream-copy">{event.copy}</span>
						{/if}
					</li>
				{/each}
			</ul>
			{#if hasMoreEvents}
				<div class="stream-pagination">
					<button type="button" class="copy-chip stream-more-btn" onclick={showMoreEvents}>
						Show More
					</button>
				</div>
			{/if}
		</div>

		<div class="dashboard-card server-config-card">
			<h2>Server Configuration</h2>
			{#if selectedServer && selectedServerConfig}
			<p class="clean-lead">Adjust which rules are enabled for your server</p>
			<br/>
			<summary>
				<div class="server-choice">
					<img
						src={selectedServer?.avatarUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png'}
						alt="server avatar"
						class="server-avatar"
					/>
					<div>
						<p class="choice-title">
							{selectedServer ? selectedServer.name : 'All Servers'}
						</p>
						<p class="choice-subtitle">
							{selectedServer
								? `Owner: ${selectedServer.owner.username} | Users: ${selectedServer.memberCount} | Actions: ${selectedServer.totalActions}`
								: 'Filter graph by server'}
						</p>
					</div>
				</div>
			</summary>
			<hr class="rule-divider" />
			<article>
				<div class="rule-toggle-stack">
					<div class="rule-toggle-row">
						<span class="rule-name">Nitro/Steam Scams</span>
						<label class="rule-toggle" aria-label="Toggle Nitro and Steam scam protection">
							<input type="checkbox" bind:checked={nitroSteamScamEnabled} />
							<span class="rule-toggle-track">
								<span class="rule-toggle-thumb"></span>
							</span>
							<span class="rule-toggle-text">{nitroSteamScamEnabled ? 'Enabled' : 'Disabled'}</span>
						</label>
					</div>

					<div class="rule-toggle-row">
						<span class="rule-name">Malicious Redirects</span>
						<label class="rule-toggle" aria-label="Toggle malicious redirect protection">
							<input type="checkbox" bind:checked={maliciousRedirectsEnabled} />
							<span class="rule-toggle-track">
								<span class="rule-toggle-thumb"></span>
							</span>
							<span class="rule-toggle-text">{maliciousRedirectsEnabled ? 'Enabled' : 'Disabled'}</span>
						</label>
					</div>

					<div class="rule-toggle-row">
						<span class="rule-name">Image Spam</span>
						<label class="rule-toggle" aria-label="Toggle Image Spam protection">
							<input type="checkbox" bind:checked={imageSpamEnabled} />
							<span class="rule-toggle-track">
								<span class="rule-toggle-thumb"></span>
							</span>
							<span class="rule-toggle-text">{imageSpamEnabled ? 'Enabled' : 'Disabled'}</span>
						</label>
					</div>

					<div class="rule-toggle-row">
						<span class="rule-name">Link Spam</span>
						<label class="rule-toggle" aria-label="Toggle link spam protection">
							<input type="checkbox" bind:checked={linkSpamEnabled} />
							<span class="rule-toggle-track">
								<span class="rule-toggle-thumb"></span>
							</span>
							<span class="rule-toggle-text">{linkSpamEnabled ? 'Enabled' : 'Disabled'}</span>
						</label>
					</div>

					<div class="rule-toggle-row">
						<span class="rule-name">Text Spam</span>
						<label class="rule-toggle" aria-label="Toggle text spam protection">
							<input type="checkbox" bind:checked={textSpamEnabled} />
							<span class="rule-toggle-track">
								<span class="rule-toggle-thumb"></span>
							</span>
							<span class="rule-toggle-text">{textSpamEnabled ? 'Enabled' : 'Disabled'}</span>
						</label>
					</div>

					<div class="rule-toggle-row">
						<span class="rule-name">Profile Spam</span>
						<label class="rule-toggle" aria-label="Toggle profile spam protection">
							<input type="checkbox" bind:checked={profileSpamEnabled} />
							<span class="rule-toggle-track">
								<span class="rule-toggle-thumb"></span>
							</span>
							<span class="rule-toggle-text">{profileSpamEnabled ? 'Enabled' : 'Disabled'}</span>
						</label>
					</div>
				</div>

				<div class="removal-action-row">
					<label class="removal-action-label" for="removal-action">Removal Actions</label>
					<select id="removal-action" class="removal-action-select" bind:value={removalActionSelected}>
						<option value="kick">Kick</option>
						<option value="timeout">Timeout</option>
						<option value="ban">Ban</option>
					</select>
				</div>

				<hr class="rule-divider action-divider" />

				<div class="config-action-row">
					<button type="button" class="config-action-button cancel" onclick={invalidateAll}>Cancel</button>
					<button type="button" class="config-action-button save" onclick={saveServerConfig}>Save</button>
				</div>
			</article>
			{:else}
			<p class="clean-lead">Select a server at the top to show configuration options</p>
			{/if}
		</div>
	</section>
</main>

{#if toastVisible}
	{#key toastId}
		<div class={`save-toast ${toastType}`} role="status" aria-live="polite">
			<span>{toastMessage}</span>
			<span class="save-toast-progress" aria-hidden="true"></span>
		</div>
	{/key}
{/if}

<style>
	.save-toast {
		position: relative;
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 90;
		max-width: min(24rem, calc(100vw - 2rem));
		padding: 0.85rem 1rem;
		border-radius: 0.65rem;
		overflow: hidden;
		color: #ffffff;
		font-weight: 600;
		line-height: 1.35;
		box-shadow: 0 12px 30px rgba(15, 23, 42, 0.35);
		animation: toast-in 0.2s ease-out;
	}

	.save-toast-progress {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 3px;
		width: 0;
		background: rgba(255, 255, 255, 0.8);
		animation: toast-progress 5s linear forwards;
	}

	.save-toast.success {
		background: #166534;
	}

	.save-toast.error {
		background: #b91c1c;
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes toast-progress {
		from {
			width: 0;
		}

		to {
			width: 100%;
		}
	}

	.timeframe-indicator {
		width: 7.4em;
		text-align: center;
		white-space: nowrap;
	}
</style>