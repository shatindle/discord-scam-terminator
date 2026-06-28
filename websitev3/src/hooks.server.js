import { decodeSession, SESSION_COOKIE_NAME } from '$lib/server/session';
import { getLoginSession } from '$lib/server/loginSessionStore';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const token = event.cookies.get(SESSION_COOKIE_NAME);
	const sessionRef = decodeSession(token);
	const session = sessionRef ? await getLoginSession(sessionRef.sessionId).catch(() => null) : null;
	const user = session?.user ?? null;

	event.locals.user = user;

	if (!user && token) {
		event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	}

	return resolve(event);
}
