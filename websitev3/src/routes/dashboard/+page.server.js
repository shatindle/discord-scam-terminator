import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import { getLiveDashboardData } from '$lib/server/liveDashboardData';
import { getServerDirectory } from '$lib/server/discordServerDirectory';
import { serverConfig } from '$lib/server/serverConfiguration';

const BOT_ADMIN_IDS = env.ADMIN_USER_IDS ? env.ADMIN_USER_IDS.split(",").map(t => t.trim()) : [];
const ADMINISTRATOR = 8n;
const MANAGE_MESSAGES = 8192n;
const SERVER_SORTS = ['name', 'members', 'actions'];
const GRAPH_RANGES = ['24h', '1w', '2w', '1m', '2m', '6m'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** @param {'24h' | '1w' | '2w' | '1m' | '2m' | '6m'} graphRange */
function metricLabelSet(graphRange) {
	if (graphRange === '24h') {
		return {
			rangeText: 'last 24h',
			cadenceText: 'hour'
		};
	}

	if (graphRange === '1w') {
		return {
			rangeText: 'last week',
			cadenceText: 'day'
		};
	}

	if (graphRange === '2w') {
		return {
			rangeText: 'last 2 weeks',
			cadenceText: 'day'
		};
	}

	if (graphRange === '1m') {
		return {
			rangeText: 'last month',
			cadenceText: 'week'
		};
	}

	if (graphRange === '2m') {
		return {
			rangeText: 'last 2 months',
			cadenceText: 'week'
		};
	}

	return {
		rangeText: 'last 6 months',
		cadenceText: 'month'
	};
}


/** @param {'24h' | '1w' | '2w' | '1m' | '2m' | '6m'} graphRange */
function fallbackTimeline(graphRange) {
	const labels = [];
	let count = 24;
	let stepHours = 1;

	if (graphRange === '1w') {
		count = 7;
		stepHours = 24;
	}

	if (graphRange === '2w') {
		count = 14;
		stepHours = 24;
	}

	if (graphRange === '1m') {
		count = 5;
		stepHours = 24 * 7;
	}

	if (graphRange === '2m') {
		count = 8;
		stepHours = 24 * 7;
	}

	if (graphRange === '6m') {
		count = 6;
	}

	if (graphRange === '6m') {
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		for (let i = count - 1; i >= 0; i -= 1) {
			const date = new Date(monthStart.getFullYear(), monthStart.getMonth() - i, 1);
			labels.push(MONTH_NAMES[date.getMonth()]);
		}
	} else {
		for (let i = count - 1; i >= 0; i -= 1) {
			const date = new Date();
			date.setMinutes(0, 0, 0);
			date.setHours(date.getHours() - i * stepHours);

			if (graphRange === '24h') {
				labels.push(`${String(date.getHours()).padStart(2, '0')}:00`);
			} else if (graphRange === '2w') {
				labels.push(`${date.getDate()}`);
			} else {
				labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
			}
		}
	}

	return {
		labels,
		series: {
			warn: Array(count).fill(0),
			kick: Array(count).fill(0),
			timeout: Array(count).fill(0),
			ban: Array(count).fill(0),
			fail: Array(count).fill(0)
		}
	};
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, url }) {
	if (!locals.user) {
		throw redirect(302, '/auth/discord');
	}

	const selectedServerId = url.searchParams.get('server') ?? undefined;
	const selectedSort = parseServerSort(url.searchParams.get('sort'));
	const selectedGraphRange = parseGraphRange(url.searchParams.get('range'));
	const servers = await getSafeServerDirectory();
	const filteredServers = sortServers(filterServersForUser(servers, locals.user), selectedSort);

	const serverFilter =
		selectedServerId && filteredServers.some((server) => server.id === selectedServerId)
			? [selectedServerId]
			: filteredServers.map(t => t.id);

	return await getData(locals.user, filteredServers, serverFilter, selectedSort, selectedGraphRange);
}

/**
 * @param {App.Locals['user']} user
 * @param {Array<{ id: string; name: string; avatarUrl: string; memberCount: number; totalActions: number; owner: { id: string; username: string; avatarUrl: string } }>} servers
 * @param {Array<string>} serverFilter
 * @param {'name' | 'members' | 'actions'} selectedSort
 * @param {'24h' | '1w' | '2w' | '1m' | '2m' | '6m'} selectedGraphRange
 */
async function getData(user, servers, serverFilter, selectedSort, selectedGraphRange) {
	try {
		const liveData = await getLiveDashboardData({
			guildIds: serverFilter,
			graphRange: selectedGraphRange
		});

		return {
			user,
			servers,
			selectedServerId: serverFilter.length === 1 ? serverFilter[0] : null,
			selectedSort,
			selectedGraphRange,
			selectedServerConfig: serverFilter.length === 1 ? serverConfig(serverFilter[0]) : null,
			...liveData
		};
	} catch {
		const labels = metricLabelSet(selectedGraphRange);

		return {
			user,
			servers,
			selectedServerId: serverFilter ?? null,
			selectedSort,
			selectedGraphRange,
			isLive: false,
			metrics: [
				{ value: '0', label: `blocked or flagged in ${labels.rangeText}` },
				{ value: '0', label: `avg defense actions per ${labels.cadenceText}` },
				{ value: '0', label: `warning events in ${labels.rangeText}` }
			],
			events: [
				{
					title: 'Live backend data unavailable',
					copy: 'Verify Firebase credentials and settings to display live dashboard metrics.',
					guildId: null,
					userId: null,
					username: null,
					reason: null,
					dateIso: null
				}
			],
			timeline: fallbackTimeline(selectedGraphRange),
			playbooks: [
				'Review log channel events for suspicious link clusters.',
				'Adjust removal action between kick, timeout, and ban based on server policy.',
				'Restore defaults or disable specific rulesets from Discord slash commands.'
			]
		};
	}
}

/** @param {string | null} value */
function parseGraphRange(value) {
	if (value === '4m') {
		return '6m';
	}

	if (value && GRAPH_RANGES.includes(value)) {
		return /** @type {'24h' | '1w' | '2w' | '1m' | '2m' | '6m'} */ (value);
	}

	return '24h';
}

/** @param {string | null} value */
function parseServerSort(value) {
	if (value && SERVER_SORTS.includes(value)) {
		return /** @type {'name' | 'members' | 'actions'} */ (value);
	}

	return 'members';
}

/**
 * @param {Array<{ id: string; name: string; avatarUrl: string; memberCount: number; totalActions: number; owner: { id: string; username: string; avatarUrl: string } }>} servers
 * @param {'name' | 'members' | 'actions'} sortBy
 */
function sortServers(servers, sortBy) {
	const sorted = [...servers];

	if (sortBy === 'members') {
		return sorted.sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));
	}

	if (sortBy === 'actions') {
		return sorted.sort((a, b) => b.totalActions - a.totalActions || a.name.localeCompare(b.name));
	}

	return sorted.sort((a, b) => a.name.localeCompare(b.name));
}

async function getSafeServerDirectory() {
	try {
		return await getServerDirectory();
	} catch {
		return [];
	}
}

/** @param {string} permissions */
function hasServerModerationPerms(permissions) {
	try {
		const bits = BigInt(permissions);
		return (bits & ADMINISTRATOR) === ADMINISTRATOR || (bits & MANAGE_MESSAGES) === MANAGE_MESSAGES;
	} catch {
		return false;
	}
}

/**
 * @param {Array<{ id: string; name: string; avatarUrl: string; memberCount: number; totalActions: number; owner: { id: string; username: string; avatarUrl: string } }>} servers
 * @param {App.Locals['user']} user
 */
function filterServersForUser(servers, user) {
	if (!user) {
		return [];
	}

	if (BOT_ADMIN_IDS && BOT_ADMIN_IDS.indexOf(user.id) > -1) {
		return servers;
	}

	if (!user.guildPermissions || user.guildPermissions.length === 0) {
		return [];
	}

	const permissionMap = new Map(user.guildPermissions.map((entry) => [entry.guildId, entry.permissions]));

	return servers.filter((server) => {
		const permissions = permissionMap.get(server.id);
		return permissions ? hasServerModerationPerms(permissions) : false;
	});
}
