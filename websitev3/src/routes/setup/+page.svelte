<main class="clean-page setup-page">
	<section class="clean-section panel setup-section">
		<div class="clean-section-head">
			<p class="clean-eyebrow">Getting started</p>
			<h1>Setup the bot</h1>
			<p class="clean-lead setup-intro">
				Follow these steps in order to get Scam Hunter running in your server.
			</p>
		</div>

		<div class="clean-feature-grid">
			<article class="clean-feature-card setup-step">
				<h2>Step 1: Add the bot</h2>
				<p>
					<a
						class="clean-inline-link"
						href="https://discord.com/oauth2/authorize?client_id=924388372854767646"
						target="_blank"
					>
						Invite Scam Hunter
					</a>
					to your Discord server.
				</p>
				<div class="setup-detail-block">
					<p class="setup-list-title">The bot requires the following permissions to function:</p>
					<ul class="clean-note setup-list">
						<li>View Channels - Scam Hunter needs to be able to see channels to manage messages in them.</li>
						<li>Send Messages - required when Scam Hunter needs to warn a user that their actions may get them removed if they don't stop.</li>
						<li>Send Messages in Threads - required when Scam Hunter needs to warn a user that their actions may get them removed if they don't stop.</li>
						<li>Manage Messages - the bot needs to be able to remove malicious messages.</li>
						<li>Embed Links - used by the bot to log actions taken in a clean format.</li>
						<li>Read Message History - required to clean up malicious messages sent in the past once a user is deemed malicious.</li>
						<li>Bypass Slowmode - used by the bot to warn users regardless of rate limiting.</li>
					</ul>
					<br/>
					<p class="setup-list-title">
						The bot also needs at least one of the following permissions (depending on what action you intend the bot to take for malicious users):
					</p>
					<ul class="clean-note setup-list">
						<li>Kick Members - used when "Kick" is the behavior you set for the server (this is the default behavior).</li>
						<li>Ban Members - used when either "Kick" or "Ban" is the behavior you set for the server. Note that if the bot should kick users, if it has the Ban Members permissions, the bot will soft ban (ban then immediately unban) the user from the server.</li>
						<li>Moderate Members - used when "Timeout" is the behavior you set for the server.</li>
					</ul>
				</div>
			</article>

			<article class="clean-feature-card setup-step">
				<h2>Step 2: Make sure the bot has a role above regular user roles</h2>
				<p>
					After inviting the bot, move its role above standard member roles so moderation actions can be applied correctly.
				</p>
				<div class="setup-detail-block">
					<p class="clean-note">
						A best practice when adding a bot is to create a dedicated "BOT" role with no extra permissions, move that above all roles that regular users can get, and assign that role to the bot.
					</p>
					<br/>
					<p class="clean-note">
						A common misconception is that permissions only work if the role with those permissions are high up in the hierarchy, so many server owners will add a bot, then move that bot's auto-created role above other user roles.
					</p>
					<br/>
					<p class="clean-note">
						The problem with this approach is if you ever re-invite the bot (when debugging an issue or wanting to easily add new permissions the bot requires), Discord will move that bot's role back to the bottom of the list.
						So long as you remember to move the role up again, then there's no problem. 
					</p>
					<br/>
					<p class="clean-note">
						A simpler solution is to add a permissionless "BOT" role to the bot and move that role up instead.
						The bot's permissions are additive across all roles, and which users the bot can manage is only dictated by how high up their highest role is (regardless of that role's actual permissions).
					</p>
					<br/>
					<p class="clean-note">
						tldr - my advice is:
					</p>
					<ul class="clean-note setup-list">
						<li>Create a dedicated permissionless "BOT" role.</li>
						<li>Move that role above regular user roles.</li>
						<li>Give that "BOT" role to your bots.</li>
					</ul>
				</div>
			</article>

			<article class="clean-feature-card setup-step">
				<h2>Step 3: Optionally, set up logging</h2>
				<p>
					If you want an audit trail of actions, configure a logging channel for Scam Hunter.
				</p>
				<div class="setup-detail-block">
					<p class="clean-note">
						I highly recommend you make a private (or public, up to you) channel where the bot can log any actions it takes. This can help you with debugging if the bot flagged a false positive or help diagnose missed scams.
					</p>
					<br/>
					<p class="clean-note">
						The command to designate a channel that the bot can use to log it's findings is:
						<code>/log to:CHANNEL</code>
					</p>
				</div>
			</article>

			<article class="clean-feature-card setup-step">
				<h2>Step 4: Configure the bot's behaviors</h2>
				<p>
					Choose which protections are enabled and how removals are handled so behavior matches your moderation policy.
				</p>
				<div class="setup-detail-block">
					<p class="clean-note">
						Scam Hunter runs a series of rulesets and logic, each tuned to handle different scenarios. By default, all rules are enabled, with "kick" being the action the bot will take.
					</p>
					<br/>
					<p class="clean-note">
						You can customize which rules are enabled in one of two ways:
					</p>
					<ul class="clean-note setup-list">
						<li>Via logging into this site, visiting the dashboard, selecting your server, and adjusting the bot behaviors at the bottom of the page.</li>
						<li>Via the <code>/behaviors [...options]</code> command</li>
					</ul>
					<br/>
					<p class="clean-note">
						The behaviors the bot supports and what they do are as follows:
					</p>
					<ul class="clean-note setup-list">
						<li>Nitro/Steam Spam - removes "free nitro" and "free steam" messages that point a user to a link that is not Discord or Steam</li>
						<li>Malicious redirects - removes messages that contain website links that are pretending to be Discord or Steam. This rule is not always effective if the malicious site has inspection prevention.</li>
						<li>Image Spam - removes image spam when spammed across channels such as the Mr Beast crypto scams.</li>
						<li>Link Spam - removes link spam when spammed across channels.</li>
						<li>Text Spam - removes large text spam across channels using similarity detection, so even if the message changes slightly, the bot can still identify it and remove it.</li>
						<li>Profile Spam - removes the "check my bio" style spam. Also uses similarity detection.</li>
						<li>Removal Action - whether the bot should kick, ban, or timeout a user that has been flagged as malicious.</li>
					</ul>
					<br/>
					<p class="clean-note">
						Keep in mind: Scam Hunter is designed to scope all actions it takes against a given user to that server. This is so the bot cannot be abused to harass a user across multiple servers.
					</p>
					<br/>
					<p class="clean-note">
						I have seen users recover their accounts often enough that I generally recommend "kick" as the action the bot should take. If your server is one of the unlucky few were botted users are re-joining post kick and continuing their malicious behavior, you may want to change the bot's removal action to ban or timeout.
					</p>
				</div>
			</article>

			<article class="clean-feature-card setup-step">
				<h2>Step 5: Moderate your members or go have some tea</h2>
				<p>
					That's all there is to it. The bot is designed to be easy to configure.
				</p>
				<div class="setup-detail-block">
					<p class="clean-note">
						Self hosting is an option if you'd like more fine-grained control. See the 
						<a
							class="clean-inline-link"
							href="https://github.com/shatindle/discord-scam-terminator"
							target="_blank"
						>
							GitHub repo
						</a>
						for more detailed instructions on how to run a copy of the bot on your own hardware.
					</p>
					<br/>
					<p class="clean-note">
						If you run into any issues, need help, or want to provide feedback on what is working and what is not, please join
						<a
							class="clean-inline-link"
							href="https://discord.gg/8ykjyQ8wJw"
							target="_blank"
						>
							the support server
						</a>. We'd love to hear from you!
					</p>
				</div>
			</article>
		</div>

		<div class="clean-actions">
			<a class="clean-button secondary" href="/">Back to Home</a>
		</div>
	</section>
</main>
