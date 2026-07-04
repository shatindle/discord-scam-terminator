import { randomUUID } from 'node:crypto';
import { getFirestoreClient } from '$lib/server/db';

const COLLECTION = 'loginsessions';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * @param {{
 *   user: { id: string; username: string; avatarUrl: string | null; guildPermissions: Array<{ guildId: string; permissions: string }> }
 * }} sessionData
 */
export async function createLoginSession(sessionData) {
	const sessionId = randomUUID();
	const now = Date.now();
	const expiresAt = now + SESSION_TTL_MS;
	const firestore = await getFirestoreClient();

	await firestore
		.collection(COLLECTION)
		.doc(sessionId)
		.set({
			user: sessionData.user,
			createdAt: now,
			expiresAt
		});

	return { sessionId, expiresAt };
}

/** @param {string} sessionId */
export async function getLoginSession(sessionId) {
	const firestore = getFirestoreClient();
	const doc = await firestore.collection(COLLECTION).doc(sessionId).get();

	if (!doc.exists) {
		return null;
	}

	const row = doc.data();

	if (!row || typeof row !== 'object') {
		return null;
	}

	const expiresAt = Number(row.expiresAt ?? 0);

	if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
		await firestore.collection(COLLECTION).doc(sessionId).delete();
		return null;
	}

	const user = row.user;

	if (!user || !user.id || !user.username) {
		return null;
	}

	const guildPermissions = Array.isArray(user.guildPermissions)
		? user.guildPermissions
				.filter((/** @type {{ guildId?: unknown; permissions?: unknown }} */ entry) =>
					entry && entry.guildId && entry.permissions
				)
				.map((/** @type {{ guildId: unknown; permissions: unknown }} */ entry) => ({
					guildId: String(entry.guildId),
					permissions: String(entry.permissions)
				}))
		: [];

	return {
		sessionId,
		expiresAt,
		user: {
			id: String(user.id),
			username: String(user.username),
			avatarUrl: user.avatarUrl ? String(user.avatarUrl) : null,
			guildPermissions
		}
	};
}

/** @param {string} sessionId */
export async function deleteLoginSession(sessionId) {
	const firestore = await getFirestoreClient();
	await firestore.collection(COLLECTION).doc(sessionId).delete();
}
