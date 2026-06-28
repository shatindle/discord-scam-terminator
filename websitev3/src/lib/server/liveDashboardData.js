import { Firestore, Timestamp } from '@google-cloud/firestore';
import { env } from '$env/dynamic/private';

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
/** @typedef {'24h' | '1w' | '1m' | '6m'} GraphRange */

const graphRangeConfigs = /** @type {Record<GraphRange, { bucketCount: number; bucketMs: number; align: 'hour' | 'day' | 'week' }>} */ ({
	'24h': { bucketCount: 24, bucketMs: HOUR_MS, align: 'hour' },
	'1w': { bucketCount: 7, bucketMs: DAY_MS, align: 'day' },
	'1m': { bucketCount: 5, bucketMs: WEEK_MS, align: 'week' },
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

	if (graphRange === '1m') {
		return new Date(now.valueOf() - 30 * DAY_MS);
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

	if (graphRange === '1m') {
		return 'last month';
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

	if (graphRange === '1m') {
		return 'week';
	}

	return 'month';
}

async function getDb() {
	if (cachedDb) {
		return cachedDb;
	}

	const keyFilename = env.FIREBASE_KEY_FILE;
	const projectId = env.FIREBASE_PROJECT_ID;

	if (!projectId) {
		throw new Error('Missing Firebase project id for dashboard data.');
	}

	if (!keyFilename) {
		throw new Error('Missing Firebase key file name for dashboard data.');
	}

	cachedDb = new Firestore({
		projectId,
		keyFilename
	});

	return cachedDb;
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
 * @param {Firestore} db
 * @param {string} collectionName
 * @param {Date} sinceDate
 */
async function getRecentCollectionEvents(db, collectionName, sinceDate) {
	const snap = await db
		.collection(collectionName)
		.where('timestamp', '>=', Timestamp.fromDate(sinceDate))
		.orderBy('timestamp', 'desc')
		.get();

	return snap.docs.map((/** @type {import('@google-cloud/firestore').QueryDocumentSnapshot} */ doc) => {
		const row = doc.data();
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
 * @param {Firestore} db
 * @param {string} collectionName
 * @param {Date} sinceDate
 */
async function getCollectionCountSince(db, collectionName, sinceDate) {
	const snap = await db
		.collection(collectionName)
		.where('timestamp', '>=', Timestamp.fromDate(sinceDate))
		.get();

	return snap.size;
}

/**
 * @param {Firestore} db
 * @param {string} collectionName
 * @param {Date} sinceDate
 * @param {string | undefined} guildId
 */
async function getFilteredCountSince(db, collectionName, sinceDate, guildId) {
	if (!guildId) {
		return await getCollectionCountSince(db, collectionName, sinceDate);
	}

	const snap = await db
		.collection(collectionName)
		.where('timestamp', '>=', Timestamp.fromDate(sinceDate))
		.get();

	let count = 0;

	for (const doc of snap.docs) {
		const row = doc.data();
		if (row.guildId === guildId) {
			count += 1;
		}
	}

	return count;
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

	return dayLabel(date);
}

function buildMonthlyBucketStarts() {
	const starts = [];
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	for (let i = 5; i >= 0; i -= 1) {
		starts.push(new Date(monthStart.getFullYear(), monthStart.getMonth() - i, 1));
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
 * @param {Firestore} db
 * @param {GraphRange} graphRange
 * @param {string | undefined} guildId
 */
async function getRecentActionTimeline(db, graphRange, guildId) {
	const config = graphRangeConfigs[graphRange] ?? graphRangeConfigs['24h'];
	const bucketStarts = graphRange === '6m' ? buildMonthlyBucketStarts() : [];
	const labels =
		graphRange === '6m'
			? bucketStarts.map((start) => bucketLabel(start, graphRange))
			: [];

	if (graphRange !== '6m') {
		const now = alignDate(new Date(), config.align);

		for (let i = config.bucketCount - 1; i >= 0; i -= 1) {
			const start = new Date(now.valueOf() - i * config.bucketMs);
			bucketStarts.push(start);
			labels.push(bucketLabel(start, graphRange));
		}
	}

	const timeline = {
		labels,
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

	const queries = await Promise.all(
		actionCollections.map(async ({ collection, key }) => {
			const snap = await db
				.collection(collection)
				.where('timestamp', '>=', Timestamp.fromDate(fromDate))
				.orderBy('timestamp', 'asc')
				.get();

			return { key: /** @type {ActionKey} */ (key), snap };
		})
	);

	for (const { key, snap } of queries) {
		for (const doc of snap.docs) {
			const row = doc.data();

			if (guildId && row.guildId !== guildId) {
				continue;
			}

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

/** @param {{ guildId?: string; graphRange?: GraphRange }} [options] */
export async function getLiveDashboardData(options = {}) {
	const guildId = options.guildId;
	const graphRange = options.graphRange ?? '24h';
	const config = graphRangeConfigs[graphRange] ?? graphRangeConfigs['24h'];
	const db = await getDb();
	const selectedRangeStart = rangeStartDate(graphRange);
	const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS);

	const [warnings, kicks, timeouts, fails, bans] = await Promise.all([
		getFilteredCountSince(db, 'warning', selectedRangeStart, guildId),
		getFilteredCountSince(db, 'kick', selectedRangeStart, guildId),
		getFilteredCountSince(db, 'timeout', selectedRangeStart, guildId),
		getFilteredCountSince(db, 'ban', selectedRangeStart, guildId),
		getFilteredCountSince(db, 'real_ban', selectedRangeStart, guildId)
	]);

	const totalInRange = warnings + kicks + timeouts + fails + bans;
	const averagePerBucket = Math.max(1, Math.round(totalInRange / config.bucketCount));
	const currentRangeLabel = rangeLabel(graphRange);
	const currentCadenceUnit = cadenceUnit(graphRange);

	const [recentWarnings, recentKicks, recentTimeouts, recentFails, recentBans] = await Promise.all([
		getRecentCollectionEvents(db, 'warning', sevenDaysAgo),
		getRecentCollectionEvents(db, 'kick', sevenDaysAgo),
		getRecentCollectionEvents(db, 'timeout', sevenDaysAgo),
		getRecentCollectionEvents(db, 'ban', sevenDaysAgo),
		getRecentCollectionEvents(db, 'real_ban', sevenDaysAgo)
	]);

	const events = [...recentWarnings, ...recentKicks, ...recentTimeouts, ...recentFails, ...recentBans]
		.filter((event) => !guildId || event.guildId === guildId)
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

	const timeline = await getRecentActionTimeline(db, graphRange, guildId);

	return {
		isLive: true,
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
