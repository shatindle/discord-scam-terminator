const { URL } = require('url');
const ogs = require('open-graph-scraper-bypasshtmlcheck');
const fetch = require("node-fetch");
const AbortController = globalThis.AbortController;
const UserAgents = require('user-agents');
const { containsKeyIndicators, cleanMessage, MINIMUM_INDICATORS, discordInvitePattern } = require('./bodyparserApi');
const {
    addUrlToWhitelist, 
    addUrlToGraylist,
    monitor
} = require('./databaseApi');

const antiphishingBizLinkExtractor = /Test of link '(.*)' for cyber security threats/ig;

/**
 * 
 * @param {String} s 
 * @param {Boolean} protocols 
 * @returns {Boolean}
 */
function stringIsAValidUrl(s, protocols) {
    try {
        let url = new URL(s);
        return protocols
            ? url.protocol
                ? protocols.map(x => `${x.toLowerCase()}:`).includes(url.protocol)
                : false
            : true;
    } catch (err) {
        return false;
    }
};

/**
 * 
 * @param {String} url 
 * @returns {Boolean}
 */
function validUrl(url) {
    return stringIsAValidUrl(url, ['http', 'https']);
}

/**
 * 
 * @param {String} url 
 * @returns {String}
 */
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

/**
 * 
 * @param {String} url 
 * @returns {String}
 */
function extractUrlWithoutProtocol(url) {
    url = url.toLowerCase();
    
    try {
        const urlObject = new URL(url);

        url = urlObject.toString();

        if (url.indexOf("https://") === 0)
            url = url.substring(8);
        else if (url.indexOf("http://") === 0)
            url = url.substring(7);

        return url;
    } catch {
        if (url.indexOf("https://") === 0)
            url = url.substring(8);
        else if (url.indexOf("http://") === 0)
            url = url.substring(7);

        return url;
    }
}

/**
 * 
 * @param {String} url 
 * @param {String} compare 
 * @returns {Boolean}
 */
function domainsMatch(url, compare) {
    return url.endsWith("." + compare) || url === compare;
}

const discordUrlList = [
    "discord.com",
    "discord.gg",
    "discord.gift",
    "discord.media",
    "discordapp.com",
    "discordapp.net",
    "discordstatus.com"
];

/**
 * 
 * @param {String} url 
 * @param {Boolean} stripDomain 
 * @returns {Boolean}
 */
function discordUrl(url, stripDomain = false) {
    const hostname = extractHostname(url);

    for (var domain of discordUrlList) {
        if (domainsMatch(hostname, domain)) {
            if (stripDomain) {
                url = url.substring(url.indexOf(domain) + domain.length);
                if (url.indexOf("/") === 0) url = url.substring(1);
                if (url.indexOf("?") > -1) url = url.substring(0, url.indexOf("?"));

                return url;
            } else {
                return true;
            }
        }
    }

    return false;
}

/**
 * 
 * @param {String} url 
 * @returns {Boolean}
 */
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

/**
 * 
 * @param {String} url 
 * @returns {Boolean}
 */
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

/**
 * 
 * @param {String} url 
 * @returns {Boolean}
 */
function isUrlInWhitelist(url) {
    return discordUrl(url) || steamUrl(url) || whitelistedUrl(url) || isVerifiedDomain(url);
}

// all encountered scams since boot
let blacklist = {};
let whitelist = {};
let graylist = {};
let verifieddomains = {};
let maliciousinvites = {};

/**
 * 
 * @param {Object} changes 
 * @param {Object} list 
 */
function addressChanges(changes, list) {
    try {
        changes.added.forEach(item => list[item.url] = true);
        changes.removed.forEach(item => delete list[item.url]);
        // don't care about changed yet
    } catch (err) {
        console.log(`Failed to address changes: ${err.toString()}`);
    }
}

monitor("blacklist", async (changes) => addressChanges(changes, blacklist));
monitor("whitelist", async (changes) => addressChanges(changes, whitelist));
monitor("graylist", async (changes) => addressChanges(changes, graylist));
monitor("verifieddomains", async (changes) => addressChanges(changes, verifieddomains));
monitor("maliciousinvites", async (changes) => addressChanges(changes, maliciousinvites));

/**
 * @description Checks if a page is protected things that may interfere with validation
 * @param {String} url The URL to check
 * @returns {Boolean} Whether or not this page is protected
 */
async function isPageProtected(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, 10000);

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
 * @description Checks to see if the domain is in human verified the safe list
 * @param {string} hostname The hostname to check if it's been pre-verified
 * @returns {bool} Whether or not this domain can be always trusted
 */
function isVerifiedDomain(hostname) {
    // this is the new whitelist
    if (hostname in verifieddomains)
        return true;

    return false;
}

/**
 * 
 * @param {String} hostname 
 * @returns {Boolean}
 */
function isYouTube(hostname) {
    if ((hostname.length === "youtube.com".length && hostname.endsWith("youtube.com")) || hostname.endsWith(".youtube.com")) {
        return true;
         // TODO: add other youtube URLs
    } else if ((hostname.length === "youtu.be".length && hostname.endsWith("youtu.be")) || hostname.endsWith(".youtu.be")) {
        return true;
    }
    
    return false;
}

/**
 * @description Checks if a URL's domain is in the blacklist
 * @param {string} url The URL to investigate
 * @returns {Boolean} Whether or not the domain is blacklisted
 */
function isBlacklisted(url) {
    const hostname = extractHostname(url);
    const urlWithoutProtocol = extractUrlWithoutProtocol(url);

    return hostname in blacklist || urlWithoutProtocol in maliciousinvites;
}

/**
 * @description Checks to see if the URL is likely a scam by inspecting the head part of the HTML
 * @param {string} url The URL we need to perform a head check on
 * @param {bool} final This should be the last attempt, don't recursively go deeper
 * @returns {Promise<Boolean|Null>} Whether or not the URL is safe
 */
async function isSafeDeepCheck(url, final = false) {
    const hostname = extractHostname(url);

    // if we've encountered this scam before, then we know it's bad
    // don't re-perform the deep check for known scam URLs
    // we don't want to get blacklisted
    if (hostname in blacklist)
        return false;

    if (isVerifiedDomain(hostname))
        return true;

    // seems that we should no longer trust the graylist.
    // there are new scam types that are using media 
    // to tell users how to "get free nitro" or "steam"
    // if (hostname in graylist)
    //     return null;

    try {
        if (isYouTube(hostname)) {
            try {
                // this is youtube, perform extra checks
                var youtubeData = await fetch(url);
                var text = await youtubeData.text();
                if (text.indexOf('<meta itemprop="unlisted" content="False">') > -1) {
                    // this is a public video.  Log it, but trust it because it's public and more likely to be reported
                    // manual review will still be performed
                    whitelist[hostname] = true;
                    await addUrlToWhitelist(hostname, url);
                    return true;
                }

                // if we are here, we need to perform the full check since this is likely an unlisted video
            } catch (youtube_check_error) {
                console.log(`YouTube check failed: ${youtube_check_error.toString()}`);
            }
        }

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
            if (await isPageProtected(url)) {
                if ((hostname in whitelist) === false && (hostname in blacklist) === false) {
                    graylist[hostname] = true;
                    await addUrlToGraylist(hostname, url, false);
                }

                // this needs manual review
                return null;
            }

            if (!final) {
                // some URL shorteners are using a "antiphishing" intermediary site that includes the target URL in the meta description.  See if that's what we're dealing with.
                /** @type {string} */
                const ogDesc = graph.ogDescription ?? "";

                if (ogDesc) {
                    const antiphishingBizMatch = ogDesc.match(antiphishingBizLinkExtractor);
                    
                    if (antiphishingBizMatch && antiphishingBizMatch.length > 0) {
                        // looks like this might be a sus site, check it
                        return await isSafeDeepCheck(antiphishingBizMatch[0], true);
                    }
                }
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

/**
 * 
 * @param {String} url 
 * @returns {String|Null}
 */
async function getServerIdFromInvite(url) {
    try {
        if (!discordInvitePattern.test(url)) return null;

        let code = discordUrl(url, true);
        if (!code) return null;
        if (code.indexOf("friend-invite/") === 0) code = code.substring("friend-invite/".length);
        if (code.indexOf("invite/") === 0) code = code.substring("invite/".length);
        if (code.indexOf("/") > -1) code = code.substring(0, code.indexOf("/"));
        if (code === "") return null;

        const response = await fetch(`https://discord.com/api/v10/invites/${code}`);
        const json = await response.json();

        if (json && json.guild && json.guild.id) {
            return json.guild.id;
        }
    } catch (err) {
        console.log(`Unable to get server ID from invite ${url}: ${err.toString()}`);
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
    getServerIdFromInvite,
    extractHostname,
    isBlacklisted
};