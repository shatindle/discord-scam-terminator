<script>
	import { onMount, afterUpdate } from 'svelte';
    import { getWarnings, getKicks } from '../store/scamTerminatorApi';

    let xAxis, warningYAxis, kickYAxis, data, element, chart;

    onMount(async () => {
        const warnings = await getWarnings();
        const kicks = await getKicks();

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

    function groupData(data) {
        let formattedData = {};

        data.forEach(item => {
            let time = formatTime(new Date(Date.parse(item.date)));
            if (!formattedData[time])
                formattedData[time] = 0;

            formattedData[time]++;
        });

        return formattedData;
    }
</script>

<div>
    <h3>Potentially Malicious Removals</h3>
    <div id="chart-container">
        <div id="chart" bind:this={element} class="mdc-elevation--z4"></div>
    </div>
</div>

<style>
    #chart {
        background-color: white;
        border-radius: 6px;
    }
</style>