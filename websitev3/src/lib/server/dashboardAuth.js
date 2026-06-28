import { env } from '$env/dynamic/private';

/** @param {string | undefined} value */
function parseIdList(value) {
	if (!value) {
		return new Set();
	}

	return new Set(
		value
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean)
	);
}