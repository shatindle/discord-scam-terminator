<script>
	import { onMount, afterUpdate, beforeUpdate, onDestroy } from 'svelte';
    import { getWarnings, getKicks, getServers } from '../store/scamTerminatorApi';
    import SegmentedButton, { Segment } from '@smui/segmented-button';
    import { Label } from '@smui/common';

    let xAxis, warningYAxis, kickYAxis, data, element, chart, servers, warnings, kicks;

    let selectedServer = "";
    let serverFilter = "";

    let groupChoices = ["Month", "Week", "Day"];
    let groupSelected = "Month";
    let previousGroupSelected = "Month";

    let sortChoices = ["Scams Caught", "Name", "User Count"];
    let sortSelected = "Scams Caught";
    let previousSortSelected = "Scams Caught";

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
        xAxis = getX(groupSelected);

        let warningTemp = getY(warnings, null, groupSelected, xAxis);
        let kickTemp = getY(kicks, null, groupSelected, xAxis);

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
            ],
            yMarkers: [
                {
                    label: '',
                    value: 0,
                    type: 'solid'
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

    onDestroy(() => chart.unbindWindowEvents() && chart.destroy());

    let rendered = false;

    const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });

    function formatTime(date, format) {
        if (!format) return `${monthFormatter.format(date)}-${date.getFullYear()}`;
        
        switch (format.toLowerCase()) {
            case "day":
                return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            case "week":
                const oneJan = new Date(date.getFullYear(),0,1);
                const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
                const result = Math.ceil(( date.getDay() + 1 + numberOfDays) / 7);
                return `${date.getFullYear()}-${result}`;
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
            then = new Date(then.setDate(then.getDate() + 1));
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

    const recalculateData = () => {
        xAxis = getX(groupSelected);
        let warningTemp = getY(warnings, selectedServer, groupSelected, xAxis);
        let kickTemp = getY(kicks, selectedServer, groupSelected, xAxis);

        warningYAxis = [];
        kickYAxis = [];

        for (let xDate of xAxis) {
            warningYAxis.push(warningTemp[xDate] ?? 0);
            kickYAxis.push(kickTemp[xDate] ?? 0);
        }

        data = {
            labels: groupSelected.toLowerCase() === "day" ? xAxis.map(day => day.substring(5)) : xAxis,
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
            ],
            yMarkers: [
                {
                    label: '',
                    value: 0,
                    type: 'solid'
                }
            ]
        };

        chart.update(data);
    }

    const setSelectedServer = (server) => {
        if (selectedServer === server) {
            selectedServer = "";
        } else {
            selectedServer = server;
        }

        recalculateData();
    }

    beforeUpdate(() => {
        if (previousSortSelected !== sortSelected) {
            servers.sort((a, b) => {
                if (sortSelected === "User Count") return a.members > b.members ? -1 : 1;
                if (sortSelected === "Scams Caught") return a.count > b.count ? -1 : 1;
                return a.name > b.name ? 1 : -1;
            });

            servers = [...servers];

            previousSortSelected = sortSelected;
        }
    })

    afterUpdate(() => {
        if (previousGroupSelected !== groupSelected) {
            previousGroupSelected = groupSelected;

            recalculateData();
        }
    });
</script>

<div id="activity">
    <h3>Potentially Malicious Removals</h3>
    <div id="chart-container">
        <div id="chart" bind:this={element} class="mdc-elevation--z4"></div>
    </div>
    {#if servers}
    <div id="server-list" style="position:relative;">
        <h3>Servers</h3>
        <div class="row">
            <div class="col-12 col-sm-6">
                <label for="grouplist">Group by</label>
                <SegmentedButton segments={groupChoices} let:segment singleSelect bind:selected={groupSelected} style="width:100%;" name="grouplist">
                    <!-- Note: the `segment` property is required! -->
                    <Segment {segment}>
                        <Label>{segment}</Label>
                    </Segment>
                </SegmentedButton>
            </div>
            <div class="col-12 col-sm-6">
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
            <div class="col">
                <div class="input-group mb-3">
                    <input id="serverfilter" type="text" bind:value={serverFilter} class="full form-control" placeholder="Search servers by name or ID" aria-label="Search">
                </div>
            </div>
        </div>
        <div class="row">
            {#each servers.filter(server => server.id.toLowerCase().indexOf(serverFilter.toLowerCase()) > -1 || server.name.toLowerCase().indexOf(serverFilter.toLowerCase()) > -1) as server}
            <div class="col-12 col-sm-6 col-md-4 server-icon {selectedServer === server.id ? "selected" : ""} {server.count === 0 ? "safe" : ""}" on:click={() => setSelectedServer(server.id)}>
                <div class="row mdc-elevation--z6">
                    <div class="col-3">
                        <img src={server.avatar} alt={server.name + "Server Icon"} class="mdc-elevation--z2"/>
                    </div>
                    <div class="col-9">
                        <div>{server.name}</div>
                        <div class="usercount">Users: {server.members}</div>
                        <div class="incidents">Scams: {server.count}</div>
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

    .usercount {
        color: #999;
    }

    .incidents {
        color: #999;
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
</style>