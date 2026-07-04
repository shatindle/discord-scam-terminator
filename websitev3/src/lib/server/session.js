import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

export const SESSION_COOKIE_NAME = 'dsh_session';
export const OAUTH_STATE_COOKIE_NAME = 'dsh_oauth_state';

// because we're storing the user's guild permissions, only let the session stay alive for a day
// this will allow them to see actions already taken
// changes to the server will still have to go through a permission check
const SESSION_TTL_SECONDS = 60 * 60 * 24;

/** @typedef {{ sessionId: string }} SessionReference */

function getSessionSecret() {
	const secret = env.DISCORD_SESSION_SECRET;

	if (!secret) {
		throw new Error('Missing DISCORD_SESSION_SECRET environment variable.');
	}

	return secret;
}

/** @param {string} payload */
function sign(payload) {
	return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

/** @param {string} sessionId */
export function encodeSession(sessionId) {
	const payload = JSON.stringify({
		sessionId,
		iat: Date.now()
	});
	const payloadEncoded = Buffer.from(payload).toString('base64url');
	const signature = sign(payloadEncoded);

	return `${payloadEncoded}.${signature}`;
}

/** @param {string | undefined} cookieValue */
export function decodeSession(cookieValue) {
	if (!cookieValue || !cookieValue.includes('.')) {
		return null;
	}

	const [payloadEncoded, signature] = cookieValue.split('.');
	const expected = sign(payloadEncoded);

	if (signature.length !== expected.length) {
		return null;
	}

	const sigBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expected);

	if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
		return null;
	}

	try {
		const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));

		if (!payload.sessionId) {
			return null;
		}

		return {
			sessionId: String(payload.sessionId)
		};
	} catch {
		return null;
	}
}

/** @param {boolean} isSecureRequest */
export function sessionCookieOptions(isSecureRequest) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: /** @type {'lax'} */ ('lax'),
		secure: isSecureRequest,
		maxAge: SESSION_TTL_SECONDS
	};
}

/** @param {boolean} isSecureRequest */
export function oauthStateCookieOptions(isSecureRequest) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: /** @type {'lax'} */ ('lax'),
		secure: isSecureRequest,
		maxAge: 60 * 10
	};
}
