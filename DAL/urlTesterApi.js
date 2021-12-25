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

function cleanUrl(url) {
    url = url.toLowerCase();
    if (url.indexOf("https://") === 0)
        url = url.substring(8);
    else if (url.indexOf("http://") === 0)
        url = url.substring(7);

    return url;
}

function compareUrls(url, compare) {
    return url.indexOf(compare + "/") === 0 || url === compare;
}

function discordUrl(url) {
    url = cleanUrl(url);
    
    if (compareUrls(url, "discord.com"))
        return true;

    if (compareUrls(url, "discord.gg"))
        return true;

    if (compareUrls(url, "discord.gift"))
        return true;

    if (compareUrls(url, "discord.media"))
        return true;

    if (compareUrls(url, "discordapp.com"))
        return true;

    if (compareUrls(url, "discordapp.net"))
        return true;
    
    if (compareUrls(url, "discordstatus.com"))
        return true;

    return false;
}

function steamUrl(url) {
    url = cleanUrl(url);
    
    if (compareUrls(url, "s.team"))
        return true;

    if (compareUrls(url, "steam-chat.com"))
        return true;

    if (compareUrls(url, "steamchina.com"))
        return true;

    if (compareUrls(url, "steamcommunity.com"))
        return true;

    if (compareUrls(url, "steamcontent.com"))
        return true;
    
    if (compareUrls(url, "steamgames.com")) 
        return true;

    if (compareUrls(url, "steampowered.com")) 
        return true;

    if (compareUrls(url, "steampowered.com.8686c.com")) 
        return true;

    if (compareUrls(url, "steamstatic.com")) 
        return true;

    if (compareUrls(url, "steamstatic.com.8686c.com")) 
        return true;

    if (compareUrls(url, "steamusercontent.com")) 
        return true;

    if (compareUrls(url, "valvesoftware.com")) 
        return true;

    return false;
}

module.exports = {
    validUrl,
    discordUrl,
    steamUrl
};