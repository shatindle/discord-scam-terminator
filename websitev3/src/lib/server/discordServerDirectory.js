import { getDiscordClient, fetchAllGuildRefs } from './discordBot';
import { database } from './db';

/** @type {{ expiresAt: number; data: Array<{id:string,name:string,avatarUrl:string,memberCount:number,totalActions:number,owner:{id:string,username:string,avatarUrl:string}}> } | undefined} */
let cachedDirectory;
/** @type {Promise<void> | undefined} */
let refreshPromise;
let refreshTimerStarted = false;

const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 6;
const ACTION_COLLECTIONS = ['warning', 'kick', 'timeout', 'real_ban', 'ban'];

/**
 * @param {string} collectionName
 * @param {string} guildId
 */
function countGuildActions(collectionName, guildId) {
	const query = database._getTable(collectionName).filter((/** @type {{ guildId: string; }} */ t) => t.guildId === guildId);
	
	const aggregate = query.length;
	return Number(aggregate ?? 0);
}

/** @param {string[]} guildIds */
function getGuildActionTotals(guildIds) {
	if (guildIds.length === 0) {
		return new Map();
	}

	const totals = guildIds.map((guildId) => {
		const counts = ACTION_COLLECTIONS.map((collectionName) => countGuildActions(collectionName, guildId));

		return /** @type {[string, number]} */ ([guildId, counts.reduce((sum, count) => sum + count, 0)]);
	});

	return new Map(totals);
}

async function refreshServerDirectory() {
	if (refreshPromise) {
		await refreshPromise;
		return;
	}

	refreshPromise = (async () => {
		const now = Date.now();
		
		const client = await getDiscordClient();
		const guildMap = await fetchAllGuildRefs(client);
		const guildIds = Array.from(guildMap.keys());
		const actionTotals = getGuildActionTotals(guildIds);

		const directory = await Promise.all(
			guildIds.map(async (guildId) => {
				const guildRef = guildMap.get(guildId);
				const fallbackName = guildRef?.name ?? `Unknown Server (${guildId})`;
				const fallbackAvatar = guildRef?.icon
					? `https://cdn.discordapp.com/icons/${guildId}/${guildRef.icon}.png?size=128`
					: 'https://cdn.discordapp.com/embed/avatars/0.png';

				let guildName = fallbackName;
				let guildAvatarUrl = fallbackAvatar;
				let memberCount = 0;
				let ownerId = 'unknown';
				let ownerUsername = 'Unknown Owner';
				let ownerAvatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';

				try {
					const guild = await client.guilds.fetch({ guild: guildId, force: true, withCounts: true });
					guildName = guild.name;
					guildAvatarUrl = guild.iconURL({ size: 128 }) ?? fallbackAvatar;
					memberCount = guild.memberCount ?? guild.approximateMemberCount ?? 0;

					try {
						const ownerMember = await guild.fetchOwner();
						const ownerUser = ownerMember.user;
						ownerId = ownerUser.id;
						ownerUsername = ownerUser.globalName ?? ownerUser.username ?? 'Unknown Owner';
						ownerAvatarUrl =
							ownerUser.displayAvatarURL({ size: 128 }) ??
							'https://cdn.discordapp.com/embed/avatars/0.png';
					} catch {
						ownerId = guild.ownerId ?? ownerId;
					}
				} catch {
					// Keep fallback guild metadata if fetch fails for a single guild.
				}

				return {
					id: guildId,
					name: guildName,
					avatarUrl: guildAvatarUrl,
					memberCount,
					totalActions: actionTotals.get(guildId) ?? 0,
					owner: {
						id: ownerId,
						username: ownerUsername,
						avatarUrl: ownerAvatarUrl
					}
				};
			})
		);

		cachedDirectory = {
			expiresAt: now + REFRESH_INTERVAL_MS,
			data: directory
		};
	})();

	try {
		await refreshPromise;
	} finally {
		refreshPromise = undefined;
	}
}

function ensureRefreshTimer() {
	if (refreshTimerStarted) {
		return;
	}

	refreshTimerStarted = true;

	setInterval(() => {
		void refreshServerDirectory();
	}, REFRESH_INTERVAL_MS);
}

export async function getServerDirectory() {
	ensureRefreshTimer();

	const now = Date.now();

	if (!cachedDirectory || cachedDirectory.expiresAt <= now) {
		try {
			await refreshServerDirectory();
		} catch { /* allow fall through */ }
	}

	return cachedDirectory?.data ?? [];
}

// invoke this once on site startup
setTimeout(getServerDirectory, 10000);