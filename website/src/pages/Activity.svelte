<script>
	import { onMount, afterUpdate, beforeUpdate, onDestroy } from 'svelte';
    import { getWarnings, getKicks, getFails, getServers } from '../store/scamTerminatorApi';
    import SegmentedButton, { Segment } from '@smui/segmented-button';
    import { Label } from '@smui/common';

    let xAxis, warningYAxis, kickYAxis, failYAxis, data, activityLineChart, activityLineChartElement, ownerChart, ownerChartElement, servers, warnings, kicks, fails;

    let selectedServer = "";
    let serverFilter = "";

    let groupChoices = ["Month", "Week", "Day", "Hour"];
    let groupSelected = "Month";
    let previousGroupSelected = "Month";

    let sortChoices = ["Scams Caught", "Name", "User Count", "Owner"];
    let sortSelected = "Scams Caught";
    let previousSortSelected = "Scams Caught";

    // TODO: turn these into a toggle
    let includeWarnings = true;
    let includeKicks = true;
    let includeFails = true;

    onMount(async () => {
        const urlParams = new URLSearchParams(window.location.search);

        const filterToGuild = urlParams.get('guild');

        if (filterToGuild) {
            serverFilter = filterToGuild;
            selectedServer = filterToGuild;
        }

        // activity line chart
        warnings = await getWarnings();
        kicks = await getKicks();
        fails = await getFails();
        servers = await getServers();

        servers.forEach(server => {
            server.count = 0;
            server.warnings = 0;
            server.kicks = 0;
            server.fails = 0;

            let warningCount = warnings.filter(item => item.guildId === server.id).length;
            let kickCount = kicks.filter(item => item.guildId === server.id).length;
            let failCount = fails.filter(item => item.guildId === server.id).length;

            server.count = warningCount + kickCount + failCount;
            server.warnings = warningCount;
            server.kicks = kickCount;
            server.fails = failCount;
        });

        servers = servers.sort((a, b) => (a.count > b.count ? -1 : 1));

        // massage the data down to month groups
        xAxis = getX(groupSelected);

        let warningTemp = getY(warnings, selectedServer, groupSelected, xAxis);
        let kickTemp = getY(kicks, selectedServer, groupSelected, xAxis);
        let failTemp = getY(fails, selectedServer, groupSelected, xAxis);

        warningYAxis = [];
        kickYAxis = [];
        failYAxis = [];

        for (let xDate of xAxis) {
            warningYAxis.push(warningTemp[xDate] ?? 0);
            kickYAxis.push(kickTemp[xDate] ?? 0);
            failYAxis.push(failTemp[xDate] ?? 0);
        }

        const datasetstoshow = [];
        const colors = [];

        if (includeWarnings) {
            datasetstoshow.push({
                name: "Warnings",
                values: warningYAxis,
                chartType: 'bar'
            });
            colors.push('#ffc107');
        }

        if (includeKicks) {
            datasetstoshow.push({
                name: "Kicks",
                values: kickYAxis,
                chartType: 'line'
            });
            colors.push('#dc3545');
        }

        if (includeFails) {
            datasetstoshow.push({
                name: "Failed Kicks",
                values: failYAxis,
                chartType: 'line'
            });
            colors.push('#000000');
        }

        data = {
            labels: xAxis,
            datasets: datasetstoshow,
            yMarkers: [
                {
                    label: '',
                    value: 0,
                    type: 'solid'
                }
            ]
        };

        rendered = true;
        activityLineChart = new frappe.Chart(activityLineChartElement, {
            // title: "Potentially Malicious Removals",
            data,
            type: "axis-mixed",
            height: 400,
            colors: colors
        });

        // owner line chart
    });

    onDestroy(() => {
        activityLineChart.unbindWindowEvents();
    });

    let rendered = false;

    const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });

    /**
     * 
     * @param {Date} date
     * @param {string | null} format
     */
    function formatTime(date, format) {
        if (!format) return `${monthFormatter.format(date)}-${date.getFullYear()}`;
        
        switch (format.toLowerCase()) {
            case "hour":
                return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}h`;
            case "day":
                return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            case "week":
                const oneJan = new Date(date.getFullYear(),0,1);
                const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
                const result = Math.ceil(( date.getDay() + 1 + numberOfDays) / 7);
                return `${date.getFullYear()} week ${result}`;
            case "month":
            default:
                return `${monthFormatter.format(date)}-${date.getFullYear()}`;
        }
    }

    function getX(format) {
        // TODO: get rid of magic number...
        let then;
        const now = new Date();
        const computedNow = new Date(now);

        switch (format.toLowerCase()) {
            case "month":
                then = new Date(computedNow.setMonth(computedNow.getMonth() - 4));
                break;
            case "week":
                then = new Date(computedNow.setDate(computedNow.getDate() - 28));
                break;
            case "day":
                then = new Date(computedNow.setDate(computedNow.getDate() - 7));
                break;
            case "hour":
                then = new Date(computedNow.setDate(computedNow.getDate() - 5));
        }

        const currentMonYear = formatTime(now, format);

        let instance;

        let allTime = [];
        const gotAllTime = {};

        do {
            instance = formatTime(then, format);
            if (!gotAllTime[instance]) {
                allTime.push(instance);
                gotAllTime[instance] = true;
            }
            switch (format.toLowerCase()) {
                case "month":
                    then = new Date(then.setDate(then.getDate() + 1));
                    break;
                case "week":
                    then = new Date(then.setDate(then.getDate() + 1));
                    break;
                case "day":
                    then = new Date(then.setDate(then.getDate() + 1));
                    break;
                case "hour":
                    then = new Date(then.setTime(then.getTime() + 1000 * 60 * 60));
                    break;
                default:
                    then = new Date(then.setDate(then.getDate() + 1));
                    break;
            }
            
        } while (instance !== currentMonYear);

        return allTime;
    }

    function getY(data, server, format, xAxis) {
        let formattedData = {};

        data.forEach(item => {
            let time = formatTime(new Date(Date.parse(item.date)), format);
            if (!formattedData[time])
                formattedData[time] = 0;

            if ((!server || server === item.guildId) && xAxis.indexOf(time) > -1) formattedData[time]++;
        });

        return formattedData;
    }

    const recalculateActivityLineChartData = () => {
        xAxis = getX(groupSelected);
        let warningTemp = getY(warnings, selectedServer, groupSelected, xAxis);
        let kickTemp = getY(kicks, selectedServer, groupSelected, xAxis);
        let failTemp = getY(fails, selectedServer, groupSelected, xAxis);

        warningYAxis = [];
        kickYAxis = [];
        failYAxis = [];

        for (let xDate of xAxis) {
            warningYAxis.push(warningTemp[xDate] ?? 0);
            kickYAxis.push(kickTemp[xDate] ?? 0);
            failYAxis.push(failTemp[xDate] ?? 0);
        }

        const datasetstoshow = [];
        const colors = [];

        if (includeWarnings) {
            datasetstoshow.push({
                name: "Warnings",
                values: warningYAxis,
                chartType: 'bar'
            });
            colors.push('#ffc107');
        }

        if (includeKicks) {
            datasetstoshow.push({
                name: "Kicks",
                values: kickYAxis,
                chartType: 'line'
            });
            colors.push('#dc3545');
        }

        if (includeFails) {
            datasetstoshow.push({
                name: "Failed Kicks",
                values: failYAxis,
                chartType: 'line'
            });
            colors.push('#000000');
        }

        data = {
            labels: groupSelected.toLowerCase() === "day" ? xAxis.map(day => day.substring(5)) : xAxis,
            datasets: datasetstoshow,
            yMarkers: [
                {
                    label: '',
                    value: 0,
                    type: 'solid'
                }
            ]
        };

        activityLineChart.update(data);
    }

    const setSelectedServer = (server) => {
        if (selectedServer === server) {
            selectedServer = "";
        } else {
            selectedServer = server;
        }

        recalculateActivityLineChartData();
    }

    beforeUpdate(() => {
        if (previousSortSelected !== sortSelected) {
            servers.sort((a, b) => {
                if (sortSelected === "User Count") return a.members > b.members ? -1 : 1;
                if (sortSelected === "Scams Caught") return a.count > b.count ? -1 : 1;
                if (sortSelected === "Owner") return a.owner.id > b.owner.id ? -1 : 1;
                return a.name > b.name ? 1 : -1;
            });

            servers = [...servers];

            previousSortSelected = sortSelected;
        }
    })

    afterUpdate(() => {
        if (previousGroupSelected !== groupSelected) {
            previousGroupSelected = groupSelected;

            recalculateActivityLineChartData();
        }
    });
</script>

<div id="activity">
    <h3>Potentially Malicious Removals</h3>
    <div id="activity-container">
        <div id="activity-line-chart" bind:this={activityLineChartElement} class="mdc-elevation--z4"></div>
    </div>
    <div id="owner-container">
        <div id="owner-chart" bind:this={ownerChartElement} class="mdc-elevation--z4"></div>
    </div>
    {#if servers}
    <div id="server-list" style="position:relative;">
        <h3>Servers</h3>
        <div class="row">
            <div class="col-12 col-md-6">
                <label for="serverfilter" id="serverfilter-label">Search by</label>
                <div class="input-group mb-3">
                    <input id="serverfilter" type="text" bind:value={serverFilter} class="full form-control" placeholder="Search servers by name or ID" aria-label="Search" name="serverfilter">
                    <small>note: Scam counts only reflect the last 6 months of data. Older records are purged. Usernames and user IDs of compromised accounts may be kept up to one week, but are usually purged sooner than that. New servers may take up to 24 hours to show up in metrics.</small>
                </div>
            </div>
            <div class="col-12 col-md-6">
                <label for="grouplist">Group by</label>
                <SegmentedButton segments={groupChoices} let:segment singleSelect bind:selected={groupSelected} style="width:100%;" name="grouplist">
                    <!-- Note: the `segment` property is required! -->
                    <Segment {segment}>
                        <Label>{segment}</Label>
                    </Segment>
                </SegmentedButton>
            </div>
        </div>
        
        <div class="row">
            <div class="col">
                <label for="sortlist">Sort by</label>
                <SegmentedButton segments={sortChoices} let:segment singleSelect bind:selected={sortSelected} style="width:100%;" name="sortlist">
                    <!-- Note: the `segment` property is required! -->
                    <Segment {segment}>
                        <Label>{segment}</Label>
                    </Segment>
                </SegmentedButton>
            </div>
        </div>
        <div class="row">
            {#each servers.filter(server => server.id.toLowerCase().indexOf(serverFilter.toLowerCase()) > -1 || server.name.toLowerCase().indexOf(serverFilter.toLowerCase()) > -1) as server}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="col-12 col-sm-6 col-md-4 server-icon" class:selected={selectedServer === server.id} class:safe={server.count === 0} class:bad-setup={server.fails > 0} on:click={() => setSelectedServer(server.id)}>
                <div class="row mdc-elevation--z6">
                    <div class="col-3">
                        <img src={server.avatar} alt={server.name + "Server Icon"} class="mdc-elevation--z2"/>
                    </div>
                    <div class="col-9">
                        <div data-verified={server.verified} data-partnered={server.partnered} class="servername">
                            {#if server.verified}
                            <img src="/lib/img/verified-logo.png" alt="Discord Verified" style="width:20px;height:20px;display:inline;" />
                            {:else if server.partnered}
                            <img src="/lib/img/partner-logo.png" alt="Discord Partner" style="width:20px;height:20px;display:inline;" />
                            {/if}
                            {server.name}
                        </div>
                        <div class="server-id">
                            ID: {server.id}
                        </div>
                        {#if server.owner}
                        <div data-ownerid={server.owner.id} class="owner-id">
                            Owner: <img src={server.owner.avatar} alt="Discord Server Owner" style="width:20px;height:20px;display:inline;" />
                            {server.owner.username}
                        </div>
                        {/if}
                        <div class="usercount">Users: {server.members}</div>
                        <div class="incidents">Total Scams: {server.count}</div>
                        <div class="incidents">Warnings: {server.warnings}</div>
                        <div class="incidents">Kicks: {server.kicks} success, {server.fails} failed</div>
                    </div>
                </div>
            </div>
            {/each}
        </div>
    </div>
    {/if}
</div>

<style>
    #activity {
        margin-bottom: 40px;
    }
    #activity-line-chart {
        background-color: white;
        border-radius: 6px;
    }

    #server-list {
        margin-top: 14px;
    }

    .server-icon {
        cursor: pointer;
    }

    .server-icon.safe {
        color: #777;
    }
    
    .server-icon.bad-setup > div {
        background: lightcoral;
        color: white;
    }

    .server-icon.selected > div {
        background: white;
        color: black;
        /* border-radius: 25px; */
    }

    .server-icon > div {
        margin: 6px 8px;
        /* padding: 6px 10px; */
    }

    .server-icon img {
        width: 50px;
        border-radius: 25px;
    }

    #serverfilter-label {
        margin-bottom: 1em;
    }

    #serverfilter {
        border-radius: 4px;
    }

    .servername {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
    }

    .server-id, .owner-id {
        font-size: small;
        padding-left: 1em;
    }

    .usercount {
        color: #999;
    }

    .incidents {
        color: #999;
    }

    .bad-setup .usercount, .bad-setup .incidents {
        color: white;
    }

    .selected .usercount, .selected .incidents {
        color: black;
    }

    .safe .incidents {
        opacity: 0;
    }

    .full {
        width: 100%;
    }

    #server-list :global(.mdc-segmented-button__segment--selected) {
        color: white;
    }

    :global(.frappe-chart .x.axis .line-vertical,
.frappe-chart .x.axis text) {
        display: none;
    }
</style>