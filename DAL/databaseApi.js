const uuidv5 = require('uuid').v5;
const { uuidNamespace, firebaseProjectId } = require('../settings.json');
const Firestore = require('@google-cloud/firestore');
const path = require("path");

const db = new Firestore({
    projectId: firebaseProjectId,
    keyFilename: path.join(__dirname, '../firebase.json'),
});

/**
 * @description Logs the action and reasons for it
 * @param {String} type Ban, Kick, or Fail
 * @param {String} guildId The server ID
 * @param {String} userId The user ID
 * @param {String} username The username and discriminator
 * @param {String} reason Details about the action taken
 */
async function writeLog(type, guildId, userId, username, reason, error) {
    if (typeof type === "undefined")
        type = "unknown";

    if (typeof guildId === "undefined")
        guildId = null;

    if (typeof userId === "undefined")
        userId = null;

    if (typeof username === "undefined")
        username = null;

    if (typeof reason === "undefined")
        reason = null;

    if (typeof error === "undefined")
        error = null;

    var moment = Date.now().valueOf().toString();

    var ref = await db.collection(type).doc(moment);
    await ref.set({
        guildId,
        userId,
        username,
        reason,
        error,
        timestamp: Firestore.Timestamp.now()
    });
}

async function recordWarning(guildId, userId, username, reason) {
    await writeLog("warning", guildId, userId, username, reason);
}

async function recordBan(guildId, userId, username, reason) {
    await writeLog("ban", guildId, userId, username, reason);
}

async function recordKick(guildId, userId, username, reason) {
    await writeLog("kick", guildId, userId, username, reason);
}

async function recordFail(guildId, userId, username, reason) {
    await writeLog("ban", guildId, userId, username, reason);
}

async function recordError(guildId, userId, error, reason) {
    await writeLog("error", guildId, userId, null, reason, error);
}

function getId(data) {
    return uuidv5(data, uuidNamespace);
}

var cache = [];

/**
  * @description Adds an item to the cache
  * @param {Object} item The item to add
  * @param {Array} cache The cache of these items
  * @param {Number} limit The point at which to pop off old items
  */
function addToCache(item, cache, limit = 1000) {
    cache.unshift(item);

    while (cache.length > limit)
        cache.pop();
}

/**
  * @description Removes an item from the cache based on an ID property
  * @param {Object} itemKey The key value to remove
  * @param {String} property The property to compare
  * @param {Array} cache The cache to remove from
  * @returns {Boolean} Whether or not an item was removed
  */
function removeFromCache(itemKey, property, cache) {
    for (var i = 0; i < cache.length; i++) {
        if (cache[i][property] === itemKey) {
            var first = cache[i];

            cache.sort(function(x,y){ return x == first ? -1 : y == first ? 1 : 0; });

            cache.shift();

            return true;
        }
    }

    return false;
}

/**
  * @description Attempts to retrieve an item from cache.  If nothing, will return undefined
  * @param {Object} itemKey The key value to search for
  * @param {String} property The property to compare
  * @param {Array} cache The cache to search
  * @returns {Object} The object if found, otherwise undefined
  */
function checkCache(itemKey, property, cache) {
    for (var i = 0; i < cache.length; i++) {
        if (cache[i][property] === itemKey) {
            var first = cache[i];

            cache.sort(function(x,y){ return x == first ? -1 : y == first ? 1 : 0; });
            
            return first;
        }
    }
}

/**
 * @description Evaluates repeat occurrences
 * @param {String} userId The user's discord ID
 * @param {String} message The message the user sent
 * @returns Whether the user should be removed from the server (repeat phishing message)
 */
function shouldBanUser(userId, message) {
    const data = JSON.stringify({i: userId, m: message});
    
    const hash = getId(data);

    if (checkCache(hash, "id", cache)) {
        // encountered before, ban
        return true;
    } else {
        addToCache({id: hash}, cache);
    }
}

async function addUrlToBlacklist(url) {
    var moment = Date.now().valueOf().toString();

    var ref = await db.collection("blacklist").doc(moment);
    await ref.set({
        url,
        timestamp: Firestore.Timestamp.now()
    });
}

async function addUrlToWhitelist(url, example) {
    var moment = Date.now().valueOf().toString();

    if (!example)
        example = "";

    var ref = await db.collection("whitelist").doc(moment);
    await ref.set({
        url,
        example,
        timestamp: Firestore.Timestamp.now()
    });
}

async function addUrlToGraylist(url, example, removed) {
    var moment = Date.now().valueOf().toString();

    var ref = await db.collection("graylist").doc(moment);
    await ref.set({
        url,
        example,
        removed,
        timestamp: Firestore.Timestamp.now()
    });
}

async function addMessageToScamList(url, message, user, guild) {
    var moment = Date.now().valueOf().toString();

    var ref = await db.collection("scamlist").doc(moment);
    await ref.set({
        url,
        message,
        user,
        guild,
        timestamp: Firestore.Timestamp.now()
    });
}

async function loadUrlBlacklist() {
    var ref = await db.collection("blacklist");
    var docs = await ref.get();

    const list = {};

    if (docs)
        docs.forEach(element => list[element.data().url] = true);

    return list;
}

async function loadUrlWhitelist() {
    var ref = await db.collection("whitelist");
    var docs = await ref.get();

    const list = {};

    if (docs)
        docs.forEach(element => list[element.data().url] = true);

    return list;
}

async function loadUrlGraylist() {
    var ref = await db.collection("graylist");
    var docs = await ref.get();

    const list = {};

    if (docs)
        docs.forEach(element => list[element.data().url] = true);

    return list;
}

module.exports = {
    shouldBanUser,
    recordWarning,
    recordBan,
    recordKick,
    recordFail,
    recordError,
    addUrlToBlacklist,
    loadUrlBlacklist,
    addUrlToWhitelist,
    loadUrlWhitelist,
    addUrlToGraylist,
    loadUrlGraylist,
    addMessageToScamList
};