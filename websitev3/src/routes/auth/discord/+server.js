import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import {
	oauthStateCookieOptions,
	OAUTH_STATE_COOKIE_NAME
} from '$lib/server/session';

/** @param {string} origin */
function getDiscordConfig(origin) {
	const clientId = env.DISCORD_CLIENT_ID;
	const redirectUri = env.DISCORD_REDIRECT_URI ?? `${origin}/auth/discord/callback`;

	if (!clientId) {
		throw new Error('Missing DISCORD_CLIENT_ID environment variable.');
	}

	return { clientId, redirectUri };
}

/** @type {import('./$types').RequestHandler} */
export function GET({ cookies, url }) {
	const { clientId, redirectUri } = getDiscordConfig(url.origin);
	const state = crypto.randomUUID();
	const secure = url.protocol === 'https:';

	cookies.set(OAUTH_STATE_COOKIE_NAME, state, oauthStateCookieOptions(secure));

	const authorizeUrl = new URL('https://discord.com/api/oauth2/authorize');
	authorizeUrl.searchParams.set('client_id', clientId);
	authorizeUrl.searchParams.set('redirect_uri', redirectUri);
	authorizeUrl.searchParams.set('response_type', 'code');
	authorizeUrl.searchParams.set('scope', 'identify guilds guilds.members.read');
	authorizeUrl.searchParams.set('state', state);

	throw redirect(302, authorizeUrl.toString());
}
