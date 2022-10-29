const fetch = require("node-fetch");
const { realisticWebScraperKey, realisticWebScraperEndpoint } = require("../settings.json");

/**
 * 
 * @returns {Boolean}
 */
async function isScraperOnline() {
    const response = await fetch(`${realisticWebScraperEndpoint}/up`, {
        method: "POST",
        headers: {
            "x-api-key": realisticWebScraperKey
        }
    });

    return response.ok;
}

/**
 * 
 * @param {String} url 
 * @returns {Buffer|Null}
 */
async function getScreenshot(url) {
    const response = await fetch(`${realisticWebScraperEndpoint}/screenshot`, {
        method: "POST",
        headers: {
            "x-api-key": realisticWebScraperKey,
            "Content-Type": "application/json",
            "Accept": "image/jpeg"
        },
        body: JSON.stringify({url})
    });

    if (response.ok) {
        const image = await response.arrayBuffer();
        return Buffer.from(image);
    }

    return null;
}

module.exports = {
    getScreenshot,
    isScraperOnline
};