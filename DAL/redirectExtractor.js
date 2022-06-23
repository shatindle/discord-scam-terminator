const { startFollowing } = require('follow-redirect-url');

/**
 * @description Gets all redirect URLs involved with this request
 * @param {string} url The original URL
 * @returns {Promise<string[]>}
 */
async function getAllRedirects(url) {
    const options = {
        max_redirect_length: 10,
        request_timeout: 2000
    };

    try {
        const urls = await startFollowing(url, options);

        return urls.map((v) => v.url);
    } catch (err) {
        console.log(`Error when extracting redirect URLs: ${err.toString()}`);

        return [url];
    }
}

module.exports = {
    getAllRedirects
}