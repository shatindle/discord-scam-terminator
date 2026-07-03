<script>
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children, data } = $props();
	let profileMenuOpen = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Scam Hunter</title>
	<meta
		name="description"
		content="Scam Hunter helps Discord communities detect scams, manage moderation responses, and review activity in one calm dashboard."
	/>
</svelte:head>


<div class="clean-shell">
	<div class="site-atmosphere" aria-hidden="true">
		<span class="atmosphere-orbit atmosphere-orbit-a"></span>
		<span class="atmosphere-orbit atmosphere-orbit-b"></span>
		<span class="atmosphere-glow atmosphere-glow-a"></span>
		<span class="atmosphere-glow atmosphere-glow-b"></span>
	</div>
	<header class="clean-header">
		<a class="clean-brand" href="/">Scam Hunter</a>

		{#if data.user}
			<div class="clean-user-actions">
				<a class="clean-button secondary" href="/dashboard">Dashboard</a>
				<a
					class="clean-button github-source-button with-icon"
					href="https://github.com/shatindle/discord-scam-terminator"
					target="_blank"
					rel="noreferrer"
				>
					<svg class="github-logo" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
						<path
							fill="currentColor"
							d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
						></path>
					</svg>
					<span>View Source</span>
				</a>
				<div class="clean-profile-menu-wrap">
					<button
						type="button"
						class="clean-profile-toggle"
						onclick={() => {
							profileMenuOpen = !profileMenuOpen;
						}}
						aria-expanded={profileMenuOpen}
						aria-label="Open profile menu"
					>
						{#if data.user.avatarUrl}
							<img src={data.user.avatarUrl} alt="Discord avatar" class="clean-avatar" />
						{/if}
						<span class="clean-username">{data.user.username}</span>
						<span class="clean-profile-caret" aria-hidden="true">▾</span>
					</button>

					{#if profileMenuOpen}
						<div class="clean-profile-menu" role="menu">
							<a class="clean-button secondary clean-profile-action" href="/logout">Logout</a>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="clean-user-actions">
				<a
					class="clean-button github-source-button with-icon"
					href="https://github.com/shatindle/discord-scam-terminator"
					target="_blank"
					rel="noreferrer"
				>
					<svg class="github-logo" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
						<path
							fill="currentColor"
							d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
						></path>
					</svg>
					<span>View Source</span>
				</a>
				<a class="clean-button primary" href="/auth/discord">Login with Discord</a>
			</div>
		{/if}
	</header>

	{@render children()}
</div>
