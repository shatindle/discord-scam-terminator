<script>
	import { onMount } from 'svelte';
	import { getGraylist, move } from '../store/scamTerminatorApi';
	let graylist;

	onMount(async () => {
		graylist = await getGraylist();
	});

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

<div>
    <h3>Graylist</h3>
    <button type="button" on:click={async () => graylist = await getGraylist()}>Reload</button>
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