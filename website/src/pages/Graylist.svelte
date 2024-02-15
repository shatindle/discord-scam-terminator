<script>
	import { onMount } from 'svelte';
	import { move, getSnapshot, batchRemove } from '../store/scamTerminatorApi';
    import { startWebsocket, graylist, whitelist } from '../store/adminContent';

	onMount(async () => {
        console.log("opening");
        startWebsocket();
        console.dir($graylist);
	});

    let selectedUrl = "";

    const snapshot = async (url) => {
        jQuery('#snapshotmodal').modal('show');
        const response = await getSnapshot(url);
        const imageBlob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(imageBlob);
        reader.onloadend = () => {
            const base64data = reader.result;
            selectedUrl = base64data;
        }
    }

    const removeAll = async (list, type) => {
        let uniqueUrls = [...new Set(list.map(t => t.url))];

        await batchRemove(uniqueUrls, type);
    };
</script>

<div>
    <h3>
        Graylist
        {#if $graylist}
        <button type="button" class="btn btn-danger" on:click={async () => await removeAll($graylist, "graylist")}>
            Clear All
        </button>
        {/if}
    </h3>
    {#if $graylist}
    {#if Object.keys($graylist).length > 0}
    <ul>
        {#each Object.values($graylist) as item}
        {#if item}
        <li>
            <div style="position:relative;display:block;width:100%;" class:badlink="{item.removed}">
                {item.url}{item.removed ? " : MALICIOUS" : ""}
                <div style="position:relative;">
                    <p>Example: <a href={item.example} target="_blank">{item.example}</a></p>
                </div>
                <button style="position:absolute;top:0;right:0;" type="button" class="btn btn-info" on:click={async () => await snapshot(item.example)}>View</button>
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
    <h3>
        Whitelist
        {#if $whitelist}
        <button type="button" class="btn btn-danger" on:click={async () => await removeAll($whitelist, "whitelist")}>
            Clear All
        </button>
        {/if}
    </h3>
    {#if $whitelist}
    {#if Object.keys($whitelist).length > 0}
    <ul>
        {#each Object.values($whitelist) as item}
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

<!-- Modal -->
<div style="color:black;" id="snapshotmodal" class="modal fade" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="staticBackdropLabel">Screenshot of Content</h5>
            </div>
            <div class="modal-body" style="position:relative">
                {#if selectedUrl}
                <img src={selectedUrl} style="width:100%" alt="snapshot" />
                {:else}
                <div class="d-flex justify-content-center">
                    <div class="spinner-border" role="status">
                        <span class="sr-only"></span>
                    </div>
                </div>
                {/if}
            </div>
            <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" on:click={() => selectedUrl = ""}>Close</button>
            </div>
        </div>
    </div>
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