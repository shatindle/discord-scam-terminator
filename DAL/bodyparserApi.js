const { remove } = require('confusables'); 

const urlRegex = /(https?:\/\/[^\s\\]*)/;

function extractUrlsFromContent(content) {
    try {
        let urls = [];

        if (!content)
            return urls;

        let url;
        const test = content.match(urlRegex);
        if (test && test.forEach) {
            test.forEach((match) => {
                urls.push(match);
            });
        } else {
            return [];
        }

        return urls.filter(onlyUnique);
    } catch (err) {
        console.log("unable to parse URLs: " + err);
        return [];
    }
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function cleanMessage(message) {
    message = message.toLowerCase();
    message = remove(message);
    message = message.replace(/\n/g, " ");
    message = message.replace(/\s\s+/g, " ");

    return message;
}

function containsKeyIndicators(message, removeUrl = true) {
    message = cleanMessage(message);

    if (removeUrl) {
        try {
            const urls = extractUrlsFromContent(message);
    
            // no URLs means this isn't a scam link
            if (urls.length === 0)
                return 0;
    
            urls.forEach(url => message = message.replace(url, " "));

            message = message.replace(/\s\s+/g, " ");
        } catch { /* we don't really care if this fails */}
    }

    let indicators = 0;

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

    if (message.indexOf("gifted a subscription") > -1)
        indicators += 1;

    if (message.indexOf("trade offer with") > -1)
        indicators += 1;

    if (message.indexOf("discord has gifted you") > -1)
        indicators += 2;

    if (message.indexOf("who is first? :)") > -1)
        indicators += 2;

    if (message.indexOf("take it guys :)") > -1)
        indicators += 2;

    return indicators;
}

module.exports = {
    extractUrlsFromContent,
    containsKeyIndicators,
    cleanMessage,
    MINIMUM_INDICATORS: 1
};