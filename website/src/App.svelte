<script>
	import { onMount } from 'svelte';
	import { getUser, getBlacklist, getGraylist, getWhitelist, move } from './store/scamTerminatorApi';
	let user;
	let blacklist, graylist, whitelist;

	onMount(async () => {
		user = await getUser();
		graylist = await getGraylist();
	});

	let usermenu = false;

	const toggleUsermenu = () => usermenu = !usermenu;

	const moveToWhitelist = async (url) => {
		await move(url, "graylist", "whitelist");
		graylist.splice(graylist.indexOf(url), 1);
		console.dir(graylist);
	};

	const moveToBlacklist = async (url) => {
		await move(url, "graylist", "blacklist");
		graylist.splice(graylist.indexOf(url), 1);
		console.dir(graylist);
	};
</script>

<main>
	<div class="container">
		<div class="row">
			<div class="col">
				<h1>Discord Scam Terminator</h1>
			</div>
			<div class="col">
				{#if user}
				<div id="userinfo" on:click={toggleUsermenu}>
					<div class="usermenu" style="{usermenu ? "" : "display: none;"}">
						<div style="height:70px;width:1px;"></div>
						<div class="item">
							<a href="/settings">
								Settings
							</a>
						</div>
						<div class="item">
							<a href="/logout">
								Logout
							</a>
						</div>
					</div>
					<img src="{user.avatar}" id="useravatar" alt="avatar" />
				</div>
				{:else} 
				<div class="needtologin">
					<a id="loginDiscord" href="/auth/discord">
						<button class="btn btn-primary" type="button">Discord Login</button>
					</a>
				</div>
				{/if}
			</div>
		</div>
		<div class="row">
			<div class="col">
				<h3>Whitelist</h3>
				<button type="button" on:click={async () => whitelist = await getWhitelist()}>Load</button>
				{#if whitelist}
				<ul>
					{#each whitelist as url}
					<li>{url}</li>
					{/each}
				</ul>
				{/if}
			</div>
			<div class="col">
				<h3>Graylist</h3>
				<button type="button" on:click={async () => graylist = await getGraylist()}>Reload</button>
				{#if graylist}
				<ul>
					{#each graylist as url}
					<li>
						<button type="button" class="btn btn-primary" on:click={async () => await moveToWhitelist(url)}>
							<i class="bi bi-arrow-bar-left"></i>
						</button>
						{url}
						<button type="button" class="btn btn-primary float-right" on:click={async () => await moveToBlacklist(url)}>
							<i class="bi bi-arrow-bar-right"></i>
						</button>
					</li>
					{/each}
				</ul>
				{/if}
			</div>
			<div class="col">
				<h3>Blacklist</h3>
				<button type="button" on:click={async () => blacklist = await getBlacklist()}>Load</button>
				{#if blacklist}
				<ul>
					{#each blacklist as url}
					<li>{url}</li>
					{/each}
				</ul>
				{/if}
			</div>
		</div>
	</div>
</main>

<style>
	.container {
		position: relative;
	}
	#userinfo img {
		border-radius: 50%;
		width: 60px;
		position: absolute;
		top: 10px;
		right: 20px;
		border-width:4px;
		border-color: white;
		border-style: solid;
		box-shadow: 2px 2px 5px black;
		transition: transform 250ms;
		cursor: pointer;
	}

	.needtologin {
		position: absolute;
		top: 10px;
		right: 20px;
	}

	#userinfo img:hover {
		transform: translateY(-6px);
	}

	.usermenu {
		min-width: 200px;
		margin: 6px 8px;
		background: lightgray;
		position: absolute;
		right: 4px;
		border-radius: 2%;
		top: 0;
		box-shadow: 2px 2px 7px black;
		opacity: 0.9;
	}

	.usermenu .item {
		padding: 4px 12px;
		font-family: "SplatRegular";
		color:black;
	}

	.usermenu .item a {
		color:black;
	}

	.col {
		position: relative;
	}

	ul {
		margin: 0;
		padding: 0;
	}
	li {
		width: 100%;
		list-style-type: none;
		margin: 0;
		padding: 0;
	}

	.float-right {
		position: absolute;
		right: 0;
	}
</style>