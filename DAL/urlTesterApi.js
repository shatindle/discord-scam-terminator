const { URL } = require('url');

function stringIsAValidUrl(s, protocols) {
    try {
        url = new URL(s);
        return protocols
            ? url.protocol
                ? protocols.map(x => `${x.toLowerCase()}:`).includes(url.protocol)
                : false
            : true;
    } catch (err) {
        return false;
    }
};

function validUrl(url) {
    return stringIsAValidUrl(url, ['http', 'https']);
}


function extractHostname(url) {
    url = url.toLowerCase();
    
    try {
        const urlObject = new URL(url);

        return urlObject.hostname;
    } catch {
        if (url.indexOf("https://") === 0)
            url = url.substring(8);
        else if (url.indexOf("http://") === 0)
            url = url.substring(7);

        return url;
    }
}

function domainsMatch(url, compare) {
    return url.endsWith("." + compare) || url === compare;
}

function discordUrl(url) {
    const hostname = extractHostname(url);
    
    if (domainsMatch(hostname, "discord.com"))
        return true;

    if (domainsMatch(hostname, "discord.gg"))
        return true;

    if (domainsMatch(hostname, "discord.gift"))
        return true;

    if (domainsMatch(hostname, "discord.media"))
        return true;

    if (domainsMatch(hostname, "discordapp.com"))
        return true;

    if (domainsMatch(hostname, "discordapp.net"))
        return true;
    
    if (domainsMatch(hostname, "discordstatus.com"))
        return true;

    return false;
}

function steamUrl(url) {
    const hostname = extractHostname(url);
    
    if (domainsMatch(hostname, "s.team"))
        return true;

    if (domainsMatch(hostname, "steam-chat.com"))
        return true;

    if (domainsMatch(hostname, "steamchina.com"))
        return true;

    if (domainsMatch(hostname, "steamcommunity.com"))
        return true;

    if (domainsMatch(hostname, "steamcontent.com"))
        return true;
    
    if (domainsMatch(hostname, "steamgames.com")) 
        return true;

    if (domainsMatch(hostname, "steampowered.com")) 
        return true;

    if (domainsMatch(hostname, "steampowered.com.8686c.com")) 
        return true;

    if (domainsMatch(hostname, "steamstatic.com")) 
        return true;

    if (domainsMatch(hostname, "steamstatic.com.8686c.com")) 
        return true;

    if (domainsMatch(hostname, "steamusercontent.com")) 
        return true;

    if (domainsMatch(hostname, "valvesoftware.com")) 
        return true;

    return false;
}

function whitelistedUrl(url) {
    const hostname = extractHostname(url);

    if (domainsMatch(hostname, "rsplatoon.com"))
        return true;
        
    if (domainsMatch(hostname, "tenor.com"))
        return true;
    
    if (domainsMatch(hostname, "youtube.com"))
        return true;
        
    if (domainsMatch(hostname, "youtu.be"))
        return true;
    
    if (domainsMatch(hostname, "twitch.tv"))
        return true;
        
    if (domainsMatch(hostname, "twitter.com"))
        return true;
    
    if (domainsMatch(hostname, "reddit.com"))
        return true;

    return false;
}

function isUrlInWhitelist(url) {
    return discordUrl(url) || steamUrl(url) || whitelistedUrl(url);
}

module.exports = {
    validUrl,
    discordUrl,
    steamUrl,
    whitelistedUrl,
    isUrlInWhitelist
};