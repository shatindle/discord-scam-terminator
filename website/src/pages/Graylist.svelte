<script>
	import { onMount, onDestroy } from 'svelte';
	import { getGraylist, move } from '../store/scamTerminatorApi';
	let graylist = {}, 
        whitelist = {};

    let tracking = {
        attempt: 0,
        ws: null,
        stop: false,
        heartbeat: null
    };

    const connect = () => {
        // Create a new websocket
        const ws = new WebSocket(document.location.host === "localhost" ? "ws://localhost/" : `wss://${document.location.host}`);
        tracking.ws = ws;
        ws.addEventListener("open", (event) => {
            console.log('Now connected'); 
            tracking.attempt = 0;
            tracking.heartbeat = setInterval(() => {
                ws.send("{}");
            }, 30000);
         });
        ws.addEventListener("close", (event) => { 
            if (tracking.heartbeat) {
                clearInterval(tracking.heartbeat);
                tracking.heartbeat = null;
            }

            if (tracking.stop) {
                // do nothing, we're done
                console.log(`Connection closed cleanly.  Not reconnecting.`);
                console.dir(event);
            } else if (tracking.attempt++ > 5) {
                location.reload();
            } else {
                console.log(`Connection closed. Reconnect attempt ${tracking.attempt} of 6.`);
                console.dir(event);
                setTimeout(function() {
                    Object.keys(graylist).forEach(key => graylist[key] = null);
                    Object.keys(whitelist).forEach(key => whitelist[key] = null);
                    connect();
                }, 1000);
            }
        });
        ws.addEventListener("error", (event) => {
            console.error('Socket encountered error: ', event.message, 'Closing socket');
            ws.close();
        });
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

    onDestroy(() => {
        tracking.stop = true;
        if (tracking.ws) tracking.ws.close();
    })
</script>

<div>
    <h3>Graylist</h3>
    {#if graylist}
    {#if Object.keys(graylist).length > 0}
    <ul>
        {#each Object.values(graylist) as item}
        {#if item}
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
        {/if}
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