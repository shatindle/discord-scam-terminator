const fetch = require("node-fetch");
const { realisticWebScraperKey, realisticWebScraperEndpoint } = require("../settings.json");

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
        const image = await response.blob();
        return image;
    }

    return null;
}

module.exports = {
    getScreenshot
};