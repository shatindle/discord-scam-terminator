<script>
	import { onDestroy, onMount } from 'svelte';

	let { data } = $props();

	const features = [
		{
			title: 'Macro Observation',
			description: 'Instead of looking for individual threats, Scam Hunter observes user patterns and behaviors to detect maliciously intended behavior.'
		},
		{
			title: 'Simple yet effective rules',
			description: 'The bot looks for Nitro/Steam scams, malicious redirects, image and link spam, and even malicious message requests.'
		},
		{
			title: 'Action logging',
			description: 'Set a log channel via the /log command to keep track of moderation actions.'
		},
		{
			title: 'Customize active rules',
			description: "Enable or disable specific moderation rules to tailor the bot's behavior to your community's needs."
		}
	];

	const steps = [
		'Detect the threat',
		'Apply the server rule',
		'Review the result'
	];

	const examples = [
		{ src: '/img/crypto-removal.png', alt: 'Crypto removal illustration' },
		{ src: '/img/malicious-invite.png', alt: 'Malicious invite illustration' },
		{ src: '/img/link-spam.png', alt: 'Link spam illustration' },
		{ src: '/img/profile-spam.png', alt: 'Profile spam illustration' }
	];

	let activeExample = $state(0);
	/** @type {ReturnType<typeof setInterval> | undefined} */
	let autoplayTimer;

	function nextExample() {
		activeExample = (activeExample + 1) % examples.length;
	}

	function previousExample() {
		activeExample = (activeExample - 1 + examples.length) % examples.length;
	}

	/** @param {number} index */
	function goToExample(index) {
		activeExample = index;
	}

	function stopAutoplay() {
		if (autoplayTimer) {
			clearInterval(autoplayTimer);
			autoplayTimer = undefined;
		}
	}

	function startAutoplay() {
		stopAutoplay();
		autoplayTimer = setInterval(() => {
			nextExample();
		}, 4000);
	}

	function resetAutoplay() {
		startAutoplay();
	}

	onMount(() => {
		startAutoplay();
	});

	onDestroy(() => {
		stopAutoplay();
	});
</script>

<main class="clean-page">
	<section class="clean-hero panel">
		<div class="clean-copy">
			<h1>Protecting over 1.5 million Discord users</h1>
			<p class="clean-lead">
				Since Scam Hunter's creation on December 25, 2021, the bot has evolved to be an efficient moderation tool for Discord communities that detects threats and removes bad actors and their content before they become a problem for the community and moderation team.
			</p>

			<div class="clean-actions">
				<a
					class="clean-button primary"
					href="/setup"
				>
					Protect your server
				</a>
				<a
					class="clean-button secondary support-server-button"
					href="https://discord.gg/8ykjyQ8wJw"
					target="_blank"
					rel="noreferrer"
				>
					Get Support
				</a>
				<a class="clean-button secondary" href="/dashboard">Open Dashboard</a>
			</div>

			{#if data.user}
				<p class="clean-note">Signed in as {data.user.username}</p>
			{/if}
		</div>

		<div class="clean-hero-carousel">
			<div class="clean-section-head">
				<p class="clean-eyebrow">Examples</p>
				<h2>Actions the bot has taken</h2>
			</div>

			<div
				class="example-carousel"
				onmouseenter={stopAutoplay}
				onmouseleave={startAutoplay}
				role="region"
				aria-label="Scam Hunter moderation examples"
			>
				<div class="example-carousel-viewport">
					<div class="example-carousel-track" style={`transform: translateX(-${activeExample * 100}%);`}>
						{#each examples as example}
							<div class="example-carousel-slide">
								<img src={example.src} alt={example.alt} class="example-carousel-image" />
							</div>
						{/each}
					</div>
				</div>

				<div class="example-carousel-controls">
					<button
						type="button"
						class="example-carousel-button"
						onclick={() => {
							previousExample();
							resetAutoplay();
						}}
						aria-label="Previous image"
					>
						Prev
					</button>
					<button
						type="button"
						class="example-carousel-button"
						onclick={() => {
							nextExample();
							resetAutoplay();
						}}
						aria-label="Next image"
					>
						Next
					</button>
				</div>

				<div class="example-carousel-dots" role="tablist" aria-label="Example image selector">
					{#each examples as example, index}
						<button
							type="button"
							class={`example-carousel-dot ${activeExample === index ? 'active' : ''}`}
							onclick={() => {
								goToExample(index);
								resetAutoplay();
							}}
							aria-label={`Go to example ${index + 1}`}
							aria-selected={activeExample === index}
							role="tab"
						></button>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section class="clean-section panel">
		<div class="clean-section-head">
			<p class="clean-eyebrow">Bot design</p>
			<h2>How accurate compromised removal and clean up happens</h2>
		</div>

		<div class="clean-feature-grid">
			{#each features as feature}
				<article class="clean-feature-card">
					<h3>{feature.title}</h3>
					<p>{feature.description}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="clean-section panel clean-disclaimer">
		<div class="clean-section-head">
			<p class="clean-eyebrow">Disclaimer</p>
			<h2>This site and bot is not affiliated with Discord.</h2>
		</div>
		<p class="clean-body">
			This application is for server moderators to monitor threats on their server via the <b>Scam Hunter</b> bot.
			Want to see how it works? The bot is open source. Review the code here:
			<a href="https://github.com/shatindle/discord-scam-terminator" target="_blank" rel="noreferrer"
				>https://github.com/shatindle/discord-scam-terminator/</a
			>
		</p>
		<p class="clean-body">
			Discord single sign-on is used to show which servers you moderate in the Dashboard. All other information Discord sends about you is discarded as it is not needed for the site or bot to function.
		</p>
		<p class="clean-body">If you run into issues, please reach out to @shane in the support server.</p>
	</section>
</main>
