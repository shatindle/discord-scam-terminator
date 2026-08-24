<svelte:head>
	<meta name="robots" content="index, follow" />
</svelte:head>

<main class="clean-page privacy-policy-page">
	<section class="clean-section panel privacy-policy">
		<div class="clean-section-head">
			<p class="clean-eyebrow">Scam Hunter</p>
			<h1>Privacy Policy</h1>
		</div>

		<p class="clean-body">
			The use of the Discord Scam Hunter application ("Application") in a server requires the collection of some user data ("Data"). The Data collected includes, but is not limited to:
		</p>
		<ul>
			<li>Discord User IDs</li>
			<li>Discord Username (at the time of use)</li>
			<li>Discord Guild IDs</li>
			<li>Discord Channel IDs</li>
			<li>Message content sent in a server where the bot has read access</li>
		</ul>
		<p class="clean-body">Use of the Application is considered an agreement to the terms of this Policy.</p>

		<h2>Access to Data</h2>
		<p class="clean-body">
			Access to Data is only permitted to the Application's developers, and only in the scope required for the development, testing, and implementation of features for Application. Data is not sold, provided to, or shared with any third party, except where required by law or a Terms of Service agreement. You can view the data upon request from <code>@shane</code> on Discord.
		</p>
		<p class="clean-body">
			Actions (warnings, bans, timeouts, and kicks) are recorded and summarized for the server owners on the <a href="https://scamhunter.xyz/" target="_blank">dashboard website</a> ("Website"). The Website will show moderators summaries of actions issued on their servers. Moderators do not have access to actions issued in servers they do not moderate. The Application's developers may see the summaries across all servers for the purposes of debugging and tuning the Application.
		</p>

		<h2>Storage of Data</h2>
		<p class="clean-body">
			Configuration and suspected malicious message data is stored in Google Cloud Firestore. Google Cloud Firestore is <a href="https://cloud.google.com/firestore/docs/server-side-encryption" target="_blank">encrypted at rest</a>. The database is secured to prevent external access, however no guarantee is provided and the Application owners assume no liability for the unintentional or malicious breach of Data. In the event of an unauthorised Data access, users will be notified through the Discord client application.
		</p>
		<p class="clean-body">
			Messages and domains the Application suspects of being malicious is reviewed daily or weekly, then purged unless a domain is deemed to be always malicious or never malicious. In that case, only the domain of the malicious URL is retained. This is to allow the Application to more quickly identify malicious content sent by users and skip over content that cannot be malicious (example being content published by a company, not users).
		</p>
		<p class="clean-body">
			If you believe a domain has been flagged incorrectly, you may submit a request through the <a href="https://discord.gg/8ykjyQ8wJw" target="_blank">Discord Server</a> to have it removed or marked as safe.
		</p>
		<p class="clean-body">
			Discord Server Moderators setting up the Application in their servers may also ask the Application to log messages flagged as malicious by the Application in the server. If you wish to have this information purged, you must contact the Discord server's moderation team.
		</p>

		<h2>User Rights</h2>
		<p class="clean-body">
			At any time, you have the right to request to view the Data pertaining to your Discord account. You may submit a request through the <a href="https://discord.gg/8ykjyQ8wJw" target="_blank">Discord Server</a>. You have the right to request the removal of relevant Data.
		</p>

		<h2>Underage Users</h2>
		<p class="clean-body">
			The use of the Application is not permitted for minors under the age of 13, or under the age of legal consent for their country. This is in compliance with the <a href="https://discord.com/terms" target="_blank">Discord Terms of Service</a>. No information will be knowingly stored from an underage user. If it is found out that a user is underage we will take all necessary action to delete the stored data.
		</p>

		<h2>Questions</h2>
		<p class="clean-body">
			If you have any questions or are concerned about what data might be being stored from your account contact <code>shane</code> through the <a href="https://discord.gg/8ykjyQ8wJw" target="_blank">Discord Server</a>. For more information check the <a href="https://discord.com/terms" target="_blank">Discord Terms Of Service</a>.
		</p>
	</section>
</main>