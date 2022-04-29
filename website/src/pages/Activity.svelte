<script>
	import { onMount, afterUpdate } from 'svelte';
    import { getWarnings, getKicks, getServers } from '../store/scamTerminatorApi';

    let xAxis, warningYAxis, kickYAxis, data, element, chart, servers, warnings, kicks;

    let selectedServer = "";

    onMount(async () => {
        warnings = await getWarnings();
        kicks = await getKicks();
        servers = await getServers();

        servers.forEach(server => {
            server.count = 0;

            server.count += warnings.filter(item => item.guildId === server.id).length;
            server.count += kicks.filter(item => item.guildId === server.id).length;
        });

        servers = servers.sort((a, b) => (a.count > b.count ? -1 : 1));

        // massage the data down to month groups
        xAxis = getMonths();

        let warningTemp = groupData(warnings);
        let kickTemp = groupData(kicks);

        warningYAxis = [];
        kickYAxis = [];

        for (let xDate of xAxis) {
            warningYAxis.push(warningTemp[xDate] ?? 0);
            kickYAxis.push(kickTemp[xDate] ?? 0);
        }

        data = {
            labels: xAxis,
            datasets: [
                {
                    name: "Warnings",
                    values: warningYAxis,
                    chartType: 'bar'
                },
                {
                    name: "Kicks",
                    values: kickYAxis,
                    chartType: 'line'
                }
            ]
        };

        rendered = true;
        chart = new frappe.Chart(element, {
            // title: "Potentially Malicious Removals",
            data,
            type: "axis-mixed",
            height: 400,
            colors: ['#ffc107', '#dc3545']
        });
    });

    let rendered = false;



    const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });

    function formatTime(date) {
        return monthFormatter.format(date) + "-" + date.getFullYear();
    }

    function getMonths() {
        // TODO: get rid of magic number...
        let then = new Date(2021, 11, 1);
        const now = new Date();
        const currentMonYear = formatTime(now);

        let instance;

        let allTime = [];

        do {
            instance = formatTime(then);
            allTime.push(instance);
            then = new Date(then.setMonth(then.getMonth() + 1));
        } while (instance !== currentMonYear);

        return allTime;
    }

    function groupData(data, server) {
        let formattedData = {};

        data.forEach(item => {
            let time = formatTime(new Date(Date.parse(item.date)));
            if (!formattedData[time])
                formattedData[time] = 0;

            if (!server || server === item.guildId) formattedData[time]++;
        });

        return formattedData;
    }

    const setSelectedServer = (server) => {
        if (selectedServer === server) {
            selectedServer = "";
        } else {
            selectedServer = server;
        }

        let warningTemp = groupData(warnings, selectedServer);
        let kickTemp = groupData(kicks, selectedServer);

        warningYAxis = [];
        kickYAxis = [];

        for (let xDate of xAxis) {
            warningYAxis.push(warningTemp[xDate] ?? 0);
            kickYAxis.push(kickTemp[xDate] ?? 0);
        }

        data = {
            labels: xAxis,
            datasets: [
                {
                    name: "Warnings",
                    values: warningYAxis,
                    chartType: 'bar'
                },
                {
                    name: "Kicks",
                    values: kickYAxis,
                    chartType: 'line'
                }
            ]
        };

        chart.update(data);
    }
</script>

<div id="activity">
    <h3>Potentially Malicious Removals</h3>
    <div id="chart-container">
        <div id="chart" bind:this={element} class="mdc-elevation--z4"></div>
    </div>
    {#if servers}
    <div id="server-list">
        <h3>Servers</h3>
        <div class="row">
            {#each servers as server}
            <div class="col-12 col-sm-6 col-md-3 server-icon {selectedServer === server.id ? "selected" : ""} {server.count === 0 ? "safe" : ""}" on:click={() => setSelectedServer(server.id)}>
                <div>
                    <img src={server.avatar} alt={server.name + "Server Icon"} class="mdc-elevation--z2"/>
                    <span>{server.name}</span>
                    <span class="incidents">{server.count}</span>
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
    #chart {
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

    .server-icon.selected {
        background: white;
        color: black;
        border-radius: 25px;
    }

    .server-icon > div {
        padding: 6px 8px;
    }

    .server-icon img {
        width: 50px;
        border-radius: 25px;
    }
</style>