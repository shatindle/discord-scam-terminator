import { env } from '$env/dynamic/private';
import { Client, GatewayIntentBits, Guild } from 'discord.js';
import { Firestore } from '@google-cloud/firestore';

/** @type {{ expiresAt: number; data: Array<{id:string,name:string,avatarUrl:string,memberCount:number,totalActions:number,owner:{id:string,username:string,avatarUrl:string}}> } | undefined} */
let cachedDirectory;
/** @type {Promise<void> | undefined} */
let refreshPromise;
let refreshTimerStarted = false;
/** @type {Client | undefined} */
let discordClient;
/** @type {Promise<Client> | undefined} */
let discordClientPromise;
/** @type {Firestore | undefined} */
let firestoreClient;
/** @type {Promise<Record<string, any>> | undefined} */
let settingsPromise;

const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 6;
const ACTION_COLLECTIONS = ['warning', 'kick', 'timeout', 'real_ban', 'ban'];

/** @param {Client} client */
async function fetchAllGuildRefs(client) {
	/** @type {Map<string, import('discord.js').Guild>} */
	const guildMap = new Map();

    await Promise.all(
        client.guilds.cache.map(
            /** @param {import('discord.js').Guild} guild  */
            async guild => {
                guildMap.set(guild.id, guild);
            }));

	return guildMap;
}

const getBotToken = () => env.DISCORD_BOT_TOKEN;

async function getDiscordClient() {
	if (discordClient) {
		return discordClient;
	}

	if (discordClientPromise) {
		return await discordClientPromise;
	}

	discordClientPromise = (async () => {
		const token = getBotToken();

		if (!token) {
			throw new Error('Missing Discord bot token for server directory.');
		}

		const client = new Client({
			intents: [GatewayIntentBits.Guilds]
		});

		await client.login(token);
		discordClient = client;

		return client;
	})();

	try {
		return await discordClientPromise;
	} finally {
		discordClientPromise = undefined;
	}
}

async function getFirestoreClient() {
	if (firestoreClient) {
		return firestoreClient;
	}

	const projectId = env.FIREBASE_PROJECT_ID;

	if (!projectId) {
		throw new Error('Missing Firebase project id for server totals.');
	}

	const keyFilename = env.FIREBASE_KEY_FILE;

	if (!keyFilename) {
		throw new Error('Missing Firebase key file name.');
	}

	firestoreClient = new Firestore({
		projectId,
		keyFilename
	});

	return firestoreClient;
}

/**
 * @param {import('@google-cloud/firestore').Firestore} db
 * @param {string} collectionName
 * @param {string} guildId
 */
async function countGuildActions(db, collectionName, guildId) {
	const query = db.collection(collectionName).where('guildId', '==', guildId);

	try {
		const aggregate = await query.count().get();
		return Number(aggregate.data().count ?? 0);
	} catch {
		const snapshot = await query.get();
		return snapshot.size;
	}
}

/** @param {string[]} guildIds */
async function getGuildActionTotals(guildIds) {
	if (guildIds.length === 0) {
		return new Map();
	}

	let db;

	try {
		db = await getFirestoreClient();
	} catch {
		return new Map(guildIds.map((guildId) => [guildId, 0]));
	}

	const totals = await Promise.all(
		guildIds.map(async (guildId) => {
			const counts = await Promise.all(
				ACTION_COLLECTIONS.map((collectionName) => countGuildActions(db, collectionName, guildId))
			);

			return /** @type {[string, number]} */ ([guildId, counts.reduce((sum, count) => sum + count, 0)]);
		})
	);

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
		const actionTotals = await getGuildActionTotals(guildIds);

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
