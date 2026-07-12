import { Firestore, Timestamp } from '@google-cloud/firestore';
import { database } from '$lib/server/db';

/** @type {Firestore | undefined} */
let cachedDb;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const actionCollections = [
	// Mapping requested by user:
	// real_ban -> ban, timeout -> timeout, kick -> kick, warning -> warn
	{ collection: 'warning', key: 'warn' },
	{ collection: 'kick', key: 'kick' },
	{ collection: 'timeout', key: 'timeout' },
	{ collection: 'real_ban', key: 'ban' },
	// Existing project convention: collection "ban" holds failed removal actions.
	{ collection: 'ban', key: 'fail' }
];

/** @typedef {'warn' | 'kick' | 'timeout' | 'ban' | 'fail'} ActionKey */
/** @typedef {'24h' | '1w' | '2w' | '1m' | '2m' | '6m'} GraphRange */

const graphRangeConfigs = /** @type {Record<GraphRange, { bucketCount: number; bucketMs: number; align: 'hour' | 'day' | 'week' }>} */ ({
	'24h': { bucketCount: 24, bucketMs: HOUR_MS, align: 'hour' },
	'1w': { bucketCount: 7, bucketMs: DAY_MS, align: 'day' },
	'2w': { bucketCount: 14, bucketMs: DAY_MS, align: 'day' },
	'1m': { bucketCount: 5, bucketMs: WEEK_MS, align: 'week' },
	'2m': { bucketCount: 8, bucketMs: WEEK_MS, align: 'week' },
	'6m': { bucketCount: 6, bucketMs: WEEK_MS * 4, align: 'week' }
});

/** @param {GraphRange} graphRange */
function rangeStartDate(graphRange) {
	const now = new Date();

	if (graphRange === '24h') {
		return new Date(now.valueOf() - DAY_MS);
	}

	if (graphRange === '1w') {
		return new Date(now.valueOf() - WEEK_MS);
	}

	if (graphRange === '2w') {
		return new Date(now.valueOf() - 2 * WEEK_MS);
	}

	if (graphRange === '1m') {
		return new Date(now.valueOf() - 30 * DAY_MS);
	}

	if (graphRange === '2m') {
		return new Date(now.valueOf() - 8 * WEEK_MS);
	}

	return new Date(now.getFullYear(), now.getMonth() - 5, 1);
}

/** @param {GraphRange} graphRange */
function rangeLabel(graphRange) {
	if (graphRange === '24h') {
		return 'last 24h';
	}

	if (graphRange === '1w') {
		return 'last week';
	}

	if (graphRange === '2w') {
		return 'last 2 weeks';
	}

	if (graphRange === '1m') {
		return 'last month';
	}

	if (graphRange === '2m') {
		return 'last 2 months';
	}

	return 'last 6 months';
}

/** @param {GraphRange} graphRange */
function cadenceUnit(graphRange) {
	if (graphRange === '24h') {
		return 'hour';
	}

	if (graphRange === '1w') {
		return 'day';
	}

	if (graphRange === '2w') {
		return 'day';
	}

	if (graphRange === '1m') {
		return 'week';
	}

	if (graphRange === '2m') {
		return 'week';
	}

	return 'month';
}

/** @param {string} type */
function actionTitle(type) {
	switch (type) {
		case 'warning':
			return 'Warning event captured';
		case 'kick':
			return 'Compromised account removed (kick)';
		case 'timeout':
			return 'Account containment timeout applied';
		case 'ban':
			return 'Removal escalation failed and logged';
		case 'real_ban':
			return 'Ban action completed successfully';
		default:
			return 'Scam defense event captured';
	}
}

/**
 * @param {string} collectionName
 * @param {Date} sinceDate
 * @param {Array<string>} guildIds
 */
function getRecentCollectionEvents(collectionName, sinceDate, guildIds) {
	const snap = database
		._getTable(collectionName)
		.filter((/** @type {{ timestamp: { toDate: () => Date; }, guildId: string }} */ t) => 
			guildIds.includes(t.guildId) &&
			t.timestamp.toDate() >= sinceDate)
		.sort((/** @type {{ timestamp: { toDate: () => number; }; }} */ a, /** @type {{ timestamp: { toDate: () => number; }; }} */ b) => 
			a.timestamp.toDate() < b.timestamp.toDate());

	return snap.map((/** @type {{ timestamp: { toDate: () => any; }; guildId: any; userId: any; username: any; reason: any; }} */ row) => {
		const when = row.timestamp?.toDate ? row.timestamp.toDate() : new Date();

		return {
			type: collectionName,
			guildId: row.guildId,
			userId: row.userId,
			username: row.username,
			reason: row.reason,
			date: when,
			dateIso: when.toISOString(),
			title: actionTitle(collectionName),
			copy: `Guild ${row.guildId || 'unknown'} | User ${row.userId || 'unknown'} | ${when.toISOString()}`
		};
	});
}

/**
 * @param {string} collectionName
 * @param {Date} sinceDate
 * @param {Array<string>} guildIds
 */
function getFilteredCountSince(collectionName, sinceDate, guildIds) {
	const snap = database
		._getTable(collectionName)
		.filter((/** @type {{ timestamp: { toDate: () => Date; }, guildId: string }} */ t) => 
			guildIds.includes(t.guildId) && 
			t.timestamp.toDate() >= sinceDate);

	return snap.length;
}

/** @param {Date} date */
function hourLabel(date) {
	return `${String(date.getHours()).padStart(2, '0')}:00`;
}

/** @param {Date} date */
function dayLabel(date) {
	return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** @param {Date} date */
function dayOfMonthLabel(date) {
	return `${date.getDate()}`;
}

/** @param {Date} date */
function monthLabel(date) {
	return MONTH_NAMES[date.getMonth()];
}

/**
 * @param {Date} input
 * @param {'hour' | 'day' | 'week'} align
 */
function alignDate(input, align) {
	const date = new Date(input);

	if (align === 'hour') {
		date.setMinutes(0, 0, 0);
		return date;
	}

	date.setHours(0, 0, 0, 0);

	if (align === 'week') {
		const day = date.getDay();
		const offset = (day + 6) % 7;
		date.setDate(date.getDate() - offset);
	}

	return date;
}

/**
 * @param {Date} date
 * @param {GraphRange} graphRange
 */
function bucketLabel(date, graphRange) {
	if (graphRange === '24h') {
		return hourLabel(date);
	}

	if (graphRange === '6m') {
		return monthLabel(date);
	}

	if (graphRange === '2w') {
		return dayOfMonthLabel(date);
	}

	return dayLabel(date);
}

function buildMonthlyBucketStarts() {
	return buildMonthlyBucketStartsForWindow(0);
}

/** @param {number} graphWindowOffset */
function buildMonthlyBucketStartsForWindow(graphWindowOffset) {
	const starts = [];
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthShift = graphWindowOffset * 6;

	for (let i = 5; i >= 0; i -= 1) {
		starts.push(new Date(monthStart.getFullYear(), monthStart.getMonth() - i - monthShift, 1));
	}

	return starts;
}

/**
 * @param {Date} when
 * @param {Date} firstBucket
 */
function monthOffsetFromFirstBucket(when, firstBucket) {
	return (when.getFullYear() - firstBucket.getFullYear()) * 12 + (when.getMonth() - firstBucket.getMonth());
}

/**
 * @param {GraphRange} graphRange
 * @param {Array<string>} guildIds
 * @param {number} graphWindowOffset
 */
async function getRecentActionTimeline(graphRange, guildIds, graphWindowOffset = 0) {
	const config = graphRangeConfigs[graphRange] ?? graphRangeConfigs['24h'];
	const bucketStarts = graphRange === '6m' ? buildMonthlyBucketStartsForWindow(graphWindowOffset) : [];
	const labels =
		graphRange === '6m'
			? bucketStarts.map((start) => bucketLabel(start, graphRange))
			: [];

	if (graphRange !== '6m') {
		const now = alignDate(new Date(), config.align);
		const windowShift = graphWindowOffset * config.bucketCount * config.bucketMs;
		const currentWindowStart = new Date(now.valueOf() - (config.bucketCount - 1) * config.bucketMs);
		const windowStart = new Date(currentWindowStart.valueOf() - windowShift);

		for (let i = config.bucketCount - 1; i >= 0; i -= 1) {
			const start = new Date(windowStart.valueOf() + (config.bucketCount - 1 - i) * config.bucketMs);
			bucketStarts.push(start);
			labels.push(bucketLabel(start, graphRange));
		}
	}

	const timeline = {
		labels,
		bucketStarts: bucketStarts.map((start) => start.toISOString()),
		series: {
			warn: Array(bucketStarts.length).fill(0),
			kick: Array(bucketStarts.length).fill(0),
			timeout: Array(bucketStarts.length).fill(0),
			ban: Array(bucketStarts.length).fill(0),
			fail: Array(bucketStarts.length).fill(0)
		}
	};

	/** @type {Record<ActionKey, number[]>} */
	const series = timeline.series;

	const fromDate = bucketStarts[0];
	const toDateExclusive =
		graphRange === '6m'
			? new Date(
					bucketStarts[bucketStarts.length - 1].getFullYear(),
					bucketStarts[bucketStarts.length - 1].getMonth() + 1,
					1
				)
			: new Date(fromDate.valueOf() + config.bucketCount * config.bucketMs);

	const queries = actionCollections.map(({ collection, key }) => {
			const snap = database
				._getTable(collection)
				.filter((/** @type {{ timestamp: { toDate: () => Date; }, guildId: string }} */ t) => 
					guildIds.includes(t.guildId) &&
					t.timestamp.toDate() >= fromDate &&
					t.timestamp.toDate() < toDateExclusive)
				.sort((/** @type {{ timestamp: { toDate: () => Date; }; }} */ a, /** @type {{ timestamp: { toDate: () => Date; }; }} */ b) => a.timestamp.toDate() < b.timestamp.toDate());

			return { key: /** @type {ActionKey} */ (key), snap };
		});

	for (const { key, snap } of queries) {
		for (const row of snap) {
			const when = row.timestamp?.toDate ? row.timestamp.toDate() : null;

			if (!when) {
				continue;
			}

			const offset =
				graphRange === '6m'
					? monthOffsetFromFirstBucket(when, fromDate)
					: Math.floor((when.valueOf() - fromDate.valueOf()) / config.bucketMs);

			if (offset >= 0 && offset < bucketStarts.length) {
				series[key][offset] += 1;
			}
		}
	}

	return timeline;
}

/**
 * @param {GraphRange} graphRange
 * @param {number} graphWindowOffset
 */
function rangeWindow(graphRange, graphWindowOffset = 0) {
	const config = graphRangeConfigs[graphRange] ?? graphRangeConfigs['24h'];

	if (graphRange === '6m') {
		const bucketStarts = buildMonthlyBucketStartsForWindow(graphWindowOffset);
		const start = bucketStarts[0];
		const endExclusive = new Date(
			bucketStarts[bucketStarts.length - 1].getFullYear(),
			bucketStarts[bucketStarts.length - 1].getMonth() + 1,
			1
		);

		return { start, endExclusive };
	}

	const alignedNow = alignDate(new Date(), config.align);
	const currentWindowStart = new Date(alignedNow.valueOf() - (config.bucketCount - 1) * config.bucketMs);
	const windowShift = graphWindowOffset * config.bucketCount * config.bucketMs;
	const start = new Date(currentWindowStart.valueOf() - windowShift);
	const endExclusive = new Date(start.valueOf() + config.bucketCount * config.bucketMs);

	return { start, endExclusive };
}

/**
 * @param {string} collectionName
 * @param {Date} startDate
 * @param {Date} endDateExclusive
 * @param {Array<string>} guildIds
 */
function getFilteredCountInRange(collectionName, startDate, endDateExclusive, guildIds) {
	const snap = database
		._getTable(collectionName)
		.filter((/** @type {{ timestamp: { toDate: () => Date; }, guildId: string }} */ t) =>
			guildIds.includes(t.guildId) &&
			t.timestamp.toDate() >= startDate &&
			t.timestamp.toDate() < endDateExclusive
		);

	return snap.length;
}

/** @param {{ guildIds?: Array<string>; graphRange?: GraphRange; graphWindowOffset?: number }} [options] */
export async function getLiveDashboardData(options = {}) {
	const guildIds = options.guildIds ?? [];
	const graphRange = options.graphRange ?? '24h';
	const graphWindowOffset = Math.max(0, options.graphWindowOffset ?? 0);
	const config = graphRangeConfigs[graphRange] ?? graphRangeConfigs['24h'];
	const selectedWindow = rangeWindow(graphRange, graphWindowOffset);
	const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS);

	const [warnings, kicks, timeouts, fails, bans] = [
		getFilteredCountInRange('warning', selectedWindow.start, selectedWindow.endExclusive, guildIds),
		getFilteredCountInRange('kick', selectedWindow.start, selectedWindow.endExclusive, guildIds),
		getFilteredCountInRange('timeout', selectedWindow.start, selectedWindow.endExclusive, guildIds),
		getFilteredCountInRange('ban', selectedWindow.start, selectedWindow.endExclusive, guildIds),
		getFilteredCountInRange('real_ban', selectedWindow.start, selectedWindow.endExclusive, guildIds)
	];

	const totalInRange = warnings + kicks + timeouts + fails + bans;
	const averagePerBucket = Math.max(1, Math.round(totalInRange / config.bucketCount));
	const currentRangeLabel = rangeLabel(graphRange);
	const currentCadenceUnit = cadenceUnit(graphRange);

	const [recentWarnings, recentKicks, recentTimeouts, recentFails, recentBans] = [
		getRecentCollectionEvents('warning', sevenDaysAgo, guildIds),
		getRecentCollectionEvents('kick', sevenDaysAgo, guildIds),
		getRecentCollectionEvents('timeout', sevenDaysAgo, guildIds),
		getRecentCollectionEvents('ban', sevenDaysAgo, guildIds),
		getRecentCollectionEvents('real_ban', sevenDaysAgo, guildIds)
	];

	const events = [...recentWarnings, ...recentKicks, ...recentTimeouts, ...recentFails, ...recentBans]
		.sort((a, b) => b.date.valueOf() - a.date.valueOf())
		.map((event) => ({
			title: event.title,
			guildId: event.guildId ? String(event.guildId) : null,
			userId: event.userId ? String(event.userId) : null,
			username: event.username ? String(event.username) : null,
			reason: event.reason ? String(event.reason) : null,
			dateIso: event.dateIso,
			copy: null
		}));

	const timeline = await getRecentActionTimeline(graphRange, guildIds, graphWindowOffset);

	return {
		isLive: true,
		selectedGraphWindowOffset: graphWindowOffset,
		metrics: [
			{ value: String(totalInRange), label: `blocked or flagged in ${currentRangeLabel}` },
			{ value: String(averagePerBucket), label: `avg defense actions per ${currentCadenceUnit}` },
			{ value: String(warnings), label: `warning events in ${currentRangeLabel}` }
		],
		events,
		timeline,
		playbooks: [
			'Review log channel events for suspicious link clusters.',
			'Adjust removal action between kick, timeout, and ban based on server policy.',
			'Restore defaults or disable specific rulesets from Discord slash commands.'
		]
	};
}
