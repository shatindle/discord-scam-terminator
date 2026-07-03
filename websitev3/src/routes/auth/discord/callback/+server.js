import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import {
	encodeSession,
	oauthStateCookieOptions,
	OAUTH_STATE_COOKIE_NAME,
	sessionCookieOptions,
	SESSION_COOKIE_NAME
} from '$lib/server/session';
import { createLoginSession } from '$lib/server/loginSessionStore';

/** @param {string} origin */
function getDiscordConfig(origin) {
	const clientId = env.DISCORD_CLIENT_ID;
	const clientSecret = env.DISCORD_CLIENT_SECRET;
	const redirectUri = env.DISCORD_REDIRECT_URI ?? `${origin}/auth/discord/callback`;

	if (!clientId || !clientSecret) {
		throw new Error('Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET environment variable.');
	}

	return { clientId, clientSecret, redirectUri };
}

/** @param {{ id: string; avatar: string | null }} profile */
function avatarUrl(profile) {
	if (!profile.avatar) {
		return null;
	}

	return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`;
}

/**
 * @param {import('@sveltejs/kit').RequestEvent['fetch']} fetchFn
 * @param {string} accessToken
 */
async function fetchGuildPermissions(fetchFn, accessToken) {
	/** @type {Array<{ id: string; permissions_new?: string; permissions?: string }>} */
	const allGuilds = [];
	let before;

	while (true) {
		const params = new URLSearchParams({ limit: '200' });

		if (before) {
			params.set('before', before);
		}

		const response = await fetchFn(`https://discord.com/api/users/@me/guilds?${params.toString()}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!response.ok) {
			break;
		}

		const guilds = await response.json();

		if (!Array.isArray(guilds) || guilds.length === 0) {
			break;
		}

		for (const guild of guilds) {
			if (guild && guild.id) {
				allGuilds.push(guild);
			}
		}

		if (guilds.length < 200) {
			break;
		}

		const lastGuild = guilds[guilds.length - 1];
		before = lastGuild?.id;

		if (!before) {
			break;
		}
	}

	return allGuilds.map((guild) => ({
		guildId: String(guild.id),
		permissions: String(guild.permissions_new ?? guild.permissions ?? '0')
	}));
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ cookies, fetch, url }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const secure = url.protocol === 'https:';

	const storedState = cookies.get(OAUTH_STATE_COOKIE_NAME);
	cookies.delete(OAUTH_STATE_COOKIE_NAME, oauthStateCookieOptions(secure));

	if (!code || !state || !storedState || state !== storedState) {
		throw redirect(302, '/?login=failed');
	}

	const { clientId, clientSecret, redirectUri } = getDiscordConfig(url.origin);

	const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri
		})
	});

	if (!tokenResponse.ok) {
		throw redirect(302, '/?login=failed');
	}

	const tokenData = await tokenResponse.json();

	if (!tokenData.access_token) {
		throw redirect(302, '/?login=failed');
	}

	const profileResponse = await fetch('https://discord.com/api/users/@me', {
		headers: {
			Authorization: `Bearer ${tokenData.access_token}`
		}
	});

	if (!profileResponse.ok) {
		throw redirect(302, '/?login=failed');
	}

	const profile = await profileResponse.json();
	const guildPermissions = await fetchGuildPermissions(fetch, tokenData.access_token);
	const userId = String(profile.id);
	const loginSession = await createLoginSession({
		user: {
			id: userId,
			username: String(profile.global_name ?? profile.username ?? 'Discord User'),
			avatarUrl: avatarUrl(profile),
			guildPermissions
		}
	});
	const token = encodeSession(loginSession.sessionId);

	cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(secure));

	throw redirect(302, '/');
}
