import { redirect } from '@sveltejs/kit';
import { decodeSession, sessionCookieOptions, SESSION_COOKIE_NAME } from '$lib/server/session';
import { deleteLoginSession } from '$lib/server/loginSessionStore';

/** @type {import('./$types').RequestHandler} */
export async function GET({ cookies, url }) {
	const secure = url.protocol === 'https:';
	const token = cookies.get(SESSION_COOKIE_NAME);
	const sessionRef = decodeSession(token);

	if (sessionRef?.sessionId) {
		await deleteLoginSession(sessionRef.sessionId).catch(() => {});
	}

	cookies.delete(SESSION_COOKIE_NAME, sessionCookieOptions(secure));

	throw redirect(302, '/');
}
