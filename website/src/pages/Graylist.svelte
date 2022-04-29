<script>
	import { onMount } from 'svelte';
	import { getGraylist, move } from '../store/scamTerminatorApi';
	let graylist = {}, 
        whitelist = {};

    const connect = () => {
        // Create a new websocket
        const ws = new WebSocket(document.location.host === "localhost" ? "ws://localhost/" : `wss://${document.location.host}`);
        ws.addEventListener("open", (event) => { });
        ws.addEventListener("close", (event) => { });
        ws.addEventListener("error", (event) => { });
        ws.addEventListener("message", (message) => {
            // Parse the incoming message here
            const item = JSON.parse(message.data);

            switch (item.list) {
                case "graylist":
                    if (item.action === "add") graylist[item.data._id] = item.data;
                    else graylist[item.data._id] = null;
                    break;
                case "whitelist":
                    if (item.action === "add") whitelist[item.data._id] = item.data;
                    else whitelist[item.data._id] = null;
                    break;
            }
        });
    };

	onMount(async () => {
		// graylist = await getGraylist();
        console.log("opening");
        connect();
	});

	const moveToVerified = async (url) => {
		await move(url, "graylist", "verifieddomains");
		// delete graylist[url];
		// graylist = { ...graylist };
	};

	const moveToWhitelist = async (url) => {
		await move(url, "graylist", "whitelist");
		// delete graylist[url];
		// graylist = { ...graylist };
	};

	const moveToBlacklist = async (url) => {
		await move(url, "graylist", "blacklist");
		// delete graylist[url];
		// graylist = { ...graylist };
	};
</script>

<div>
    <h3>Graylist</h3>
    {#if graylist}
    {#if Object.keys(graylist).length > 0}
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
                    <button type="button" class="btn btn-primary" on:click={async () => await move(item.url, "graylist", "verifieddomains")}>
                        <i class="bi bi-check-all"></i> Verified
                    </button>
                </div>
                <div class="col" style="text-align:center;">
                    <button type="button" class="btn btn-warning" on:click={async () => await move(item.url, "graylist", null)}>
                        <i class="bi bi-x"></i> Remove 
                    </button>
                </div>
                <div class="col" style="text-align:right;">
                    <button type="button" class="btn btn-danger" on:click={async () => await move(item.url, "graylist", "blacklist")}>
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

    <hr class="rounded">
    <h3>Whitelist</h3>
    {#if whitelist}
    {#if Object.keys(whitelist).length > 0}
    <ul>
        {#each Object.values(whitelist) as item}
        {#if item}
        <li>
            <div style="position:relative;display:block;">
                {item.url}
                {#if item.example}
                <div style="position:relative;">
                    <p>Example: <a href={item.example} target="_blank">{item.example}</a></p>
                </div>
                {/if}
            </div>
            <div class="row">
                <div class="col" style="text-align:left;">
                    <button type="button" class="btn btn-primary" on:click={async () => await move(item.url, "whitelist", "verifieddomains")}>
                        <i class="bi bi-check-all"></i> Verified
                    </button>
                </div>
                <div class="col" style="text-align:center;">
                    <button type="button" class="btn btn-warning" on:click={async () => await move(item.url, "whitelist", null)}>
                        <i class="bi bi-x"></i> Remove 
                    </button>
                </div>
                <div class="col" style="text-align:right;">
                    <button type="button" class="btn btn-danger" on:click={async () => await move(item.url, "whitelist", "blacklist")}>
                        <i class="bi bi-emoji-dizzy-fill"></i> Malicious
                    </button>
                </div>
            </div>
        </li>
        {/if}
        {/each}
    </ul>
    {:else}
    <div>
        There are no items in the gray list
    </div>
    {/if}
    {/if}
</div>

<style>
    ul {
		margin: 0;
		padding: 0;
	}
	li {
		width: 100%;
		list-style-type: none;
		margin: 4px 6px;
		padding: 10px 12px;
		box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
        border-radius: 8px;
        word-wrap: break-word;
	}

	.badlink {
		border: 2px solid red;
	}
</style>