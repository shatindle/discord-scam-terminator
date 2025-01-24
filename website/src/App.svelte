<script>
	import { onMount } from 'svelte';
	import { getUser } from './store/scamTerminatorApi';
	import Drawer, {
		AppContent,
		Content,
		Header,
		Title,
		Subtitle,
		Scrim,
	} from '@smui/drawer';
	import List, { Item, Text, Graphic, Separator, Subheader } from '@smui/list';
	import { Router, Route, navigate } from 'svelte-routing';
    import IconButton from '@smui/icon-button';

	
	import Graylist from './pages/Graylist.svelte';
	import Home from './pages/Home.svelte';
	import Activity from './pages/Activity.svelte';
	import ContentReview from './pages/ContentReview.svelte';

	let open = false;
	const menu = () => (user ? (open = !open) : "");

	export let url = '';
	
	function setActive(value) {
		url = value;
		console.log(url);
		open = false;
		navigate(url, { replace: true });
	}

	let user;

	onMount(async () => {
		user = await getUser();
	});

	let usermenu = false;
	const toggleUsermenu = () => usermenu = !usermenu;
</script>

<div class="drawer-container">
	<Drawer variant="modal" fixed={true} bind:open>
		<Header>
			<Title>Scam Hunter</Title>
			<Subtitle>Save Your Server</Subtitle>
		</Header>
		<Content>
			<List>
				<Item href="javascript:void(0)" on:click={() => setActive('/')} activated={url === '/'}>
					<Graphic class="material-icons" aria-hidden="true">home</Graphic>
					<Text>Home</Text>
				</Item>
				{#if user && user.isAdmin}
				<Item href="javascript:void(0)" on:click={() => setActive('/review')} activated={url === '/review'}>
					<Graphic class="material-icons" aria-hidden="true">warning</Graphic>
					<Text>Review</Text>
				</Item>
				<Item href="javascript:void(0)" on:click={() => setActive('/maliciouscontent')} activated={url === '/maliciouscontent'}>
					<Graphic class="material-icons" aria-hidden="true">gpp_bad</Graphic>
					<Text>Malicious Content</Text>
				</Item>
				{/if}
				<Item href="javascript:void(0)" on:click={() => setActive('/activity')} activated={url === '/activity'}>
					<Graphic class="material-icons" aria-hidden="true">show_chart</Graphic>
					<Text>Activity</Text>
				</Item>
			</List>
		</Content>
	</Drawer>

	<Scrim fixed={true} />
	<AppContent class="app-content">
		<main class="main-content">
			<div class="container">
				<div class="row">
					<div class="p-2 mb-4 bg-light rounded-3 jumbotron mdc-elevation--z6" style="position:relative;">
						<div class="col">
							<h1 style="color:white;padding-top:16px">
								<IconButton on:click={menu} class="material-icons" style="color:white;{user ? "" : "opacity:0;cursor:auto;"}">menu</IconButton>
								Scam Hunter 
							</h1>
						</div>
						<!-- <div style="position:absolute;left:12px;top:12px;">
							{#if user}
							<IconButton on:click={menu} class="material-icons" style="color:white">menu</IconButton>
							{/if}
						</div> -->
						<div style="position:absolute;right:12px;top:8px;">
							{#if user}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div id="userinfo" on:click={toggleUsermenu}>
								<div class="usermenu" style="{usermenu ? "" : "display: none;"}">
									<!-- <div style="height:70px;width:1px;"></div> -->
									<!-- <div class="item">
										<a href="/settings">
											Settings
										</a>
									</div> -->
									<div class="item" style="padding-top:10px;">
										<a href="/logout">
											<button type="button" class="btn btn-primary">Logout</button>
										</a>
									</div>
								</div>
								<img src="{user.avatar}" id="useravatar" alt="avatar" />
							</div>
							{:else} 
							<div class="needtologin">
								<a href="/auth/oauth2">
									<button class="btn btn-success" type="button" style="margin-top:14px;">Login</button>
								</a>
							</div>
							{/if}
						</div>
					</div>
				</div>
				<div class="row">
					<div class="col">
						<Router {url}>
							<Route path="/" component={Home} {user}/>
							{#if user && user.isAdmin}
							<Route path="/review" component={Graylist} {user} />
							<Route path="/maliciouscontent" component={ContentReview} {user} />
							{/if}
							<Route path="/activity" component={Activity} {user} />
						</Router>
					</div>
				</div>
			</div>
		</main>
	  </AppContent>
</div>


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
		background-color: #3f0d6d !important;
		background-size:cover;
		background-position: left;
		padding-top:10px;
		margin-bottom: 10px;
		padding-bottom: 10px;
		position: relative;
		color: black;
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
		top: 4px;
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
</style>