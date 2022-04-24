<script>
	import { onMount } from 'svelte';
	import { getUser, getBlacklist, getGraylist, getWhitelist, move } from './store/scamTerminatorApi';
	let user;
	let blacklist, graylist;

	onMount(async () => {
		user = await getUser();
		graylist = await getGraylist();
	});

	let usermenu = false;

	const toggleUsermenu = () => usermenu = !usermenu;

	const moveToVerified = async (url) => {
		await move(url, "graylist", "verifieddomains");
		delete graylist[url];
		graylist = { ...graylist };
	};

	const moveToWhitelist = async (url) => {
		await move(url, "graylist", "whitelist");
		delete graylist[url];
		graylist = { ...graylist };
	};

	const moveToBlacklist = async (url) => {
		await move(url, "graylist", "blacklist");
		delete graylist[url];
		graylist = { ...graylist };
	};
</script>

<main>
	<div class="container">
		<div class="row">
			<div class="p-5 mb-4 bg-light rounded-3 jumbotron" style="position:relative;">
				<div class="col">
					<h1 style="color:white;padding-bottom:30px;padding-top:30px;">Scam Terminator</h1>
				</div>
				<div style="position:absolute;right:12px;top:30%;">
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
		</div>
		<div class="row">
			<!-- <div class="col">
				<h3>Whitelist</h3>
				<button type="button" on:click={async () => whitelist = await getWhitelist()}>Load</button>
				{#if whitelist}
				<ul>
					{#each whitelist as url}
					<li>{url}</li>
					{/each}
				</ul>
				{/if}
			</div> -->
			<div class="col">
				<h3>Graylist</h3>
				<button type="button" on:click={async () => graylist = await getGraylist()}>Reload</button>
				{#if graylist}
				{#if graylist.length > 0}
				<ul>
					{#each Object.values(graylist) as item}
					<li>
						<div style="position:relative;display:block;" class="{item.removed ? "badlink" : ""}">
							{item.url}{item.removed ? " : MALICIOUS" : ""}
							<div style="position:relative;">
								<p>Example: <a href={item.example} target="_blank">{item.example}</a></p>
							</div>
						</div>
						<div class="row">
							<div class="col" style="text-align:left;">
								<button type="button" class="btn btn-primary" on:click={async () => await moveToVerified(item.url)}>
									<i class="bi bi-check-all"></i> Verified
								</button>
							</div>
							<div class="col" style="text-align:center;">
								<button type="button" class="btn btn-success" on:click={async () => await moveToWhitelist(item.url)}>
									<i class="bi bi-check"></i> Safe 
								</button>
							</div>
							<div class="col" style="text-align:center;">
								<button type="button" class="btn btn-warning" on:click={async () => await moveToWhitelist(item.url)}>
									<i class="bi bi-x"></i> Remove 
								</button>
							</div>
							<div class="col" style="text-align:right;">
								<button type="button" class="btn btn-danger" on:click={async () => await moveToBlacklist(item.url)}>
									<i class="bi bi-emoji-dizzy-fill"></i> Malicious
								</button>
							</div>
						</div>
					</li>
					{/each}
				</ul>
				{:else}
				<div>
					There are no items in the gray list
				</div>
				{/if}
				{/if}
			</div>
			<!-- <div class="col">
				<h3>Blacklist</h3>
				<button type="button" on:click={async () => blacklist = await getBlacklist()}>Load</button>
				{#if blacklist}
				<ul>
					{#each blacklist as url}
					<li>{url}</li>
					{/each}
				</ul>
				{/if}
			</div> -->
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

	.jumbotron {
		background-image: url("/lib/img/header.jpg");
		background-size:cover;
		background-position: left;
		padding-top:10px;
		margin-bottom: 10px;
		padding-bottom: 10px;
		position: relative;
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
		margin: 4px 6px;
		padding: 4px 6px;
		box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
	}

	.float-right {
		position: absolute;
		right: 0;
	}

	.badlink {
		background-color: yellow;
	}
</style>