const urlRegex = /(https?:\/\/[^ ]*)/;

function extractUrlsFromContent(content) {
    try {
        let urls = [];

        if (!content)
            return urls;

        let url;
        content.match(urlRegex).forEach((match) => {
            urls.push(match);
        });

        return urls.filter(onlyUnique);
    } catch (err) {
        console.log("unable to parse URLs: " + err);
        return [];
    }
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function containsKeyIndicators(message) {
    message = message.toLowerCase();

    try {
        const urls = extractUrlsFromContent(message);

        urls.forEach(url => message = message.replace(url, " "));
    } catch { /* we don't really care if this fails */}

    var indicators = 0;

    if (message.indexOf("@everyone") > -1)
        indicators += 3;

    if (message.indexOf("discord") > -1)
        indicators += 1;

    if (message.indexOf("nitro") > -1)
        indicators += 1;

    if (message.indexOf("giveaway") > -1)
        indicators += 1;
    
    if (message.indexOf("steam") > -1)
        indicators += 1;

    if (message.indexOf("month") > -1)
        indicators += 1;

    if (message.indexOf("airdrop") > -1)
        indicators += 1;

    return indicators > 1;
}

module.exports = {
    extractUrlsFromContent,
    containsKeyIndicators
};