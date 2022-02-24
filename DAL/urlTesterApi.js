const { URL } = require('url');
const ogs = require('open-graph-scraper-bypasshtmlcheck');
const { containsKeyIndicators, cleanMessage, MINIMUM_INDICATORS } = require('./bodyparserApi');
const { loadUrlBlacklist, loadUrlWhitelist, addUrlToBlacklist, addUrlToWhitelist } = require('./databaseApi');

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

// all encountered scams since boot
let blacklist = {};
let whitelist = {};

// load the blacklist and whitelists
async function init() {
    const databaseBlacklist = await loadUrlBlacklist();

    blacklist = {
        ...blacklist,
        ...databaseBlacklist
    };

    const databaseWhitelist = await loadUrlWhitelist();

    whitelist = {
        ...whitelist,
        ...databaseWhitelist
    };
}

/**
 * @description Checks to see if the URL is likely a scam by inspecting the head part of the HTML
 * @param {string} url The URL we need to perform a head check on
 * @returns Whether or not the URL is safe
 */
async function isSafeDeepCheck(url) {
    const hostname = extractHostname(url);

    // if we've encountered this scam before, then we know it's bad
    // don't re-perform the deep check for known scam URLs
    // we don't want to get blacklisted
    if (hostname in blacklist)
        return false;

    if (hostname in whitelist)
        return true;

    try {
        const metadata = await ogs({ url });

        if (metadata) {
            if (metadata.error)
                // something went wrong, server might be down
                return true;
            

            if (!metadata.result) 
                // no metadata so we're probably ok
                return true;
            
            const graph = metadata.result;

            if (containsKeyIndicators(graph.ogTitle ?? "", false) > MINIMUM_INDICATORS || containsKeyIndicators(graph.ogDescription ?? "", false) > MINIMUM_INDICATORS) {
                blacklist[hostname] = true;
                await addUrlToBlacklist(hostname);

                // good chance this is a scam
                return false;
            }

            if (
                cleanMessage(graph.twitterSite ?? "") === '@discord' || 
                cleanMessage(graph.twitterCreator ?? "") === '@discord' ||
                cleanMessage(graph.twitterSite ?? "") === '@steam' ||
                cleanMessage(graph.twitterCreator ?? "") === '@steam') {
                blacklist[hostname] = true;
                await addUrlToBlacklist(hostname);

                // good chance this is a scam
                return false;
            }

            // if we're here, then we can add it to the whitelist
            // note that a whitelist entry does not guarantee it is ok
            whitelist[hostname] = true;
            await addUrlToWhitelist(hostname, url);
        }
    } catch (err) {
        // unable to return if it's safe, return true
        console.log(err);
    }
        
    return true;
}

module.exports = {
    validUrl,
    discordUrl,
    steamUrl,
    whitelistedUrl,
    isUrlInWhitelist,
    isSafeDeepCheck,

    init
};