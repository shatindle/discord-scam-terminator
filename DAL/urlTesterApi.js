const { URL } = require('url');
const ogs = require('open-graph-scraper-bypasshtmlcheck');
const fetch = require("node-fetch");
const AbortController = globalThis.AbortController;
const UserAgents = require('user-agents');
const { containsKeyIndicators, cleanMessage, MINIMUM_INDICATORS } = require('./bodyparserApi');
const { loadUrlBlacklist, loadUrlWhitelist, loadUrlGraylist, addUrlToWhitelist, addUrlToGraylist } = require('./databaseApi');

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

    if (domainsMatch(hostname, "reddit.com"))
        return true;

    if (domainsMatch(hostname, "twitter.com"))
        return true;

    return false;
}

function isUrlInWhitelist(url) {
    return discordUrl(url) || steamUrl(url) || whitelistedUrl(url);
}

// all encountered scams since boot
let blacklist = {};
let whitelist = {};
let graylist = {};

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

    const databaseGraylist = await loadUrlGraylist();

    graylist = {
        ...graylist,
        ...databaseGraylist
    };
}

/**
 * @description Checks if a page is protected things that may interfere with validation
 * @param {String} url The URL to check
 * @returns {Boolean} Whether or not this page is protected
 */
async function isPageProtected(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, 3000);

    try {
        const userAgent = new UserAgents(/Windows/);
        var result = await fetch(url, {
            method: "GET",
            headers: {
                'User-Agent': userAgent.toString()
            },
            size: 1000000,
            signal: controller.signal
        });
    
        var text = await result.text();
    
        if (text.indexOf("<title>Please Wait... | Cloudflare</title>") > -1) {
            // this is likely a scam
            return true;
        }
    } catch (err) {
        // something went wrong, keep going
        console.log(`Error when retrieving page: ${err}`);
    } finally {
        clearTimeout(timeout);
    }

    return false;
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

    // seems that we should no longer trust the whitelist.
    // there are new scam types that are using media 
    // to tell users how to "get free nitro" or "steam"
    // if (hostname in whitelist)
    //     return true;

    // same applies to the graylist.  Rescan unless it's known to be bad
    // if (hostname in graylist)
    //     return null;

    try {
        const agent = new UserAgents();
        const metadata = await ogs({ url, headers: agent.data });

        if (metadata) {
            if (metadata.error)
                // something went wrong, server might be down
                return true;
            

            if (!metadata.result) 
                // no metadata so we're probably ok
                return true;
            
            const graph = metadata.result;

            if (containsKeyIndicators(graph.ogTitle ?? "", false) > MINIMUM_INDICATORS || containsKeyIndicators(graph.ogDescription ?? "", false) > MINIMUM_INDICATORS) {
                
                graylist[hostname] = true;
                await addUrlToGraylist(hostname, url, true);

                // good chance this is a scam
                return false;
            }

            if (
                cleanMessage(graph.twitterSite ?? "") === '@discord' || 
                cleanMessage(graph.twitterCreator ?? "") === '@discord' ||
                cleanMessage(graph.twitterSite ?? "") === '@steam' ||
                cleanMessage(graph.twitterCreator ?? "") === '@steam') {

                graylist[hostname] = true;
                await addUrlToGraylist(hostname, url, true);

                // good chance this is a scam
                return false;
            }

            // if this page is protected, add it to the gray list
            if (isPageProtected(url)) {
                if ((hostname in whitelist) === false && (hostname in blacklist) === false) {
                    graylist[hostname] = true;
                    await addUrlToGraylist(hostname, url, false);
                }

                // this needs manual review
                return null;
            }

            // if we're here, then we can add it to the whitelist
            // note that a whitelist entry does not guarantee it is ok
            if ((hostname in whitelist) === false && (hostname in graylist) === false) {
                whitelist[hostname] = true;
                await addUrlToWhitelist(hostname, url);
            }

            return true;
        }
    } catch (err) {
        // unable to return if it's safe, return true
        console.log(err);

        // if this page is protected, add it to the gray list
        if (isPageProtected(url)) {
            if ((hostname in whitelist) === false && (hostname in blacklist) === false) {
                graylist[hostname] = true;
                await addUrlToGraylist(hostname, url, false);
            }

            // this needs manual review
            return null;
        }
    }
        
    return null;
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