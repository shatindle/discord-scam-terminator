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
 * @param {String} error
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

/**
 * 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} username 
 * @param {String} reason 
 */
async function recordWarning(guildId, userId, username, reason) {
    await writeLog("warning", guildId, userId, username, reason);
}

/**
 * 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} username 
 * @param {String} reason 
 */
async function recordBan(guildId, userId, username, reason) {
    await writeLog("ban", guildId, userId, username, reason);
}

/**
 * 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} username 
 * @param {String} reason 
 */
async function recordKick(guildId, userId, username, reason) {
    await writeLog("kick", guildId, userId, username, reason);
}

/**
 * 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} username 
 * @param {String} reason 
 */
async function recordFail(guildId, userId, username, reason) {
    await writeLog("ban", guildId, userId, username, reason);
}

/**
 * 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} username 
 * @param {String} reason 
 */
async function recordError(guildId, userId, error, reason) {
    await writeLog("error", guildId, userId, null, reason, error);
}

/**
 * 
 * @param {String} guildId 
 * @param {String} userId 
 * @param {String} username 
 * @param {String} action 
 * @param {String} message 
 */
async function recordContentReview(guildId, userId, username, action, message) {
    const moment = Date.now().valueOf().toString();

    let ref = await db.collection("contentreview").doc(moment);
    await ref.set({
        guildId,
        userId,
        username,
        action,
        message,
        timestamp: Firestore.Timestamp.now()
    });
}

/**
 * 
 * @param {String} data 
 * @returns {String}
 */
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

/**
 * 
 * @param {String} userId 
 * @param {String} guildId 
 * @param {String} message 
 * @returns {String}
 */
function hashMessage(userId, guildId, message) {
    const data = JSON.stringify({i: userId, m: message, g: guildId});

    return getId(data);
}

/**
 * 
 * @param {String} url 
 */
async function addUrlToBlacklist(url) {
    var moment = Date.now().valueOf().toString();

    var ref = await db.collection("blacklist").doc(moment);
    await ref.set({
        url,
        timestamp: Firestore.Timestamp.now()
    });
}

/**
 * 
 * @param {String} url 
 * @param {String} example 
 */
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

/**
 * 
 * @param {String} url 
 */
async function flagUrl(url) {
    const id = getId(url);
    
    var ref = await db.collection("maliciousinvites").doc(id);
    await ref.set({
        url,
        timestamp: Firestore.Timestamp.now()
    });
}

/**
 * 
 * @param {String} url 
 * @param {String} fromList 
 * @param {String} toList 
 */
async function moveUrl(url, fromList, toList) {
    if (fromList !== "blacklist" && fromList !== "graylist" && fromList !== "whitelist" && fromList !== "verifieddomains")
        throw "Invalid fromList";
        
    if (toList && toList !== "blacklist" && toList !== "graylist" && toList !== "whitelist" && toList !== "verifieddomains")
        throw "Invalid toList";
        
    if (fromList === toList)
        throw "Lists must be different";

    var ref = await db.collection(fromList).where("url", "==", url);
    var docs = await ref.get();

    var found = false, ids = [];

    if (docs)
        docs.forEach(element => {
            found = true;
            ids.push(element.id);
        });

    if (found) {
        if (toList) {
            switch (toList) {
                case "blacklist": 
                    await addUrlToBlacklist(url);
                    break;
                case "graylist": 
                    await addUrlToGraylist(url);
                    break;
                case "whitelist":
                    await addUrlToWhitelist(url);
                    break;
                case "verifieddomains":
                    await addUrlToVerifiedDomains(url);
                    break;
            }
        }
        
        for (var i = 0; i < ids.length; i++)
            await (await db.collection(fromList).doc(ids[i])).delete();
    }
}

/**
 * 
 * @param {String} collection 
 * @param {String} id 
 */
async function deleteById(collection, id) {
    var ref = await db.collection(collection).doc(id);

    if (ref)
        await ref.delete();
}

/**
 * 
 * @param {String} url 
 * @param {String} example 
 * @param {Boolean} removed 
 */
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

/**
 * 
 * @param {String} url 
 */
async function addUrlToVerifiedDomains(url) {
    var moment = Date.now().valueOf().toString();

    var ref = await db.collection("verifieddomains").doc(moment);
    await ref.set({
        url,
        timestamp: Firestore.Timestamp.now()
    });
}

/**
 * 
 * @param {String} url 
 * @param {String} message 
 * @param {String} user 
 * @param {String} guild 
 */
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

/**
 * 
 * @returns {Array<any>}
 */
async function loadUrlBlacklist() {
    var ref = await db.collection("blacklist");
    var docs = await ref.get();

    const list = {};

    if (docs)
        docs.forEach(element => list[element.data().url] = true);

    return list;
}

/**
 * 
 * @returns {Array<any>}
 */
async function loadUrlWhitelist() {
    var ref = await db.collection("whitelist");
    var docs = await ref.get();

    const list = {};

    if (docs)
        docs.forEach(element => list[element.data().url] = true);

    return list;
}

/**
 * 
 * @param {Boolean} everything 
 * @returns {Array<any>}
 */
async function loadUrlGraylist(everything) {
    var ref = await db.collection("graylist");
    var docs = await ref.get();

    const list = {};

    if (docs) {
        if (everything) {
            docs.forEach(element => list[element.data().url] = element.data());
        } else {
            docs.forEach(element => list[element.data().url] = true);
        }
    }

    return list;
}

/**
 * 
 * @returns {Array<any>}
 */
async function loadVerifiedDomains() {
    var ref = await db.collection("verifieddomains");
    var docs = await ref.get();

    const list = {};

    if (docs)
        docs.forEach(element => list[element.data().url] = true);

    return list;
}

const logs = {};
const LOGS_COLLECTION = "logchannels";

/**
 * @description Clone a cloneable channel
 * @param {String} id The channel ID
 * @param {String} guildId The server ID
 * @param {String} owner The current owner user ID
 */
 async function registerLogs(guildId, channelId) {
    var ref = await db.collection(LOGS_COLLECTION).doc(guildId);
    var docs = await ref.get();

    if (channelId) {
        await ref.set({
            id: guildId,
            channelId,
            createdOn: Firestore.Timestamp.now()
        });
    } else {
        if (docs.exists) {
            await ref.delete();
        }
    }

    logs[guildId] = {
        id: guildId,
        channelId
    };
}

/**
 * 
 */
async function loadAllLogChannels() {
    var ref = await db.collection(LOGS_COLLECTION);
    var docs = await ref.get();

    if (docs.size > 0) {
        docs.forEach(e => {
            var data = e.data();

            logs[data.id] = data;
        });
    }
}

/**
 * 
 * @param {String} guildId 
 * @returns {String}
 */
function getLogChannel(guildId) {
    if (logs[guildId])
        return logs[guildId].channelId;

    return null;
}

const callbacks = {
    warning: [],
    kick: [],
    ban: [],
    graylist: [],
    blacklist: [],
    verifieddomains: [],
    whitelist: [],
    contentreview: [],
    maliciousinvites: []
}

/**
 * 
 * @param {String} type 
 * @param {Function} callback 
 */
async function monitor(type, callback) {
    switch (type) {
        case "warning":
            callbacks.warning.push(callback);
            break;
        case "kick":
            callbacks.kick.push(callback);
            break;
        case "ban":
            callbacks.ban.push(callback);
            break;
        case "graylist":
            callbacks.graylist.push(callback);
            break;
        case "blacklist":
            callbacks.blacklist.push(callback);
            break;
        case "whitelist":
            callbacks.whitelist.push(callback);
            break;
        case "verifieddomains":
            callbacks.verifieddomains.push(callback);
            break;
        case "contentreview": 
            callbacks.contentreview.push(callback);
            break;
        case "maliciousinvites": 
            callbacks.maliciousinvites.push(callback);
            break;
        default:
            throw "Unknown observer";
    }

    setupObservers();
}

const observers = {};

/**
 * 
 */
function setupObservers() {
    if (!observers.warning && callbacks.warning.length > 0)
        observers.warning = configureObserver("warning", callbacks.warning);

    if (!observers.kick && callbacks.kick.length > 0) 
        observers.kick = configureObserver("kick", callbacks.kick);

    if (!observers.ban && callbacks.ban.length > 0) 
        observers.ban = configureObserver("ban", callbacks.ban);
        
    if (!observers.whitelist && callbacks.whitelist.length > 0)
        observers.whitelist = configureObserver("whitelist", callbacks.whitelist);

    if (!observers.graylist && callbacks.graylist.length > 0)
        observers.graylist = configureObserver("graylist", callbacks.graylist);

    if (!observers.blacklist && callbacks.blacklist.length > 0)
        observers.blacklist = configureObserver("blacklist", callbacks.blacklist);
        
    if (!observers.verifieddomains && callbacks.verifieddomains.length > 0)
        observers.verifieddomains = configureObserver("verifieddomains", callbacks.verifieddomains);

    if (!observers.contentreview && callbacks.contentreview.length > 0)
        observers.contentreview = configureObserver("contentreview", callbacks.contentreview);

    if (!observers.maliciousinvites && callbacks.maliciousinvites.length > 0)
        observers.maliciousinvites = configureObserver("maliciousinvites", callbacks.maliciousinvites);
}

/**
 * 
 * @param {String} type 
 * @param {Array<Function>} callbackGroup 
 * @returns 
 */
function configureObserver(type, callbackGroup) {
    return db.collection(type).onSnapshot(async querySnapshot => {
        let changes = {
            added: [],
            modified: [],
            removed: []
        };
    
        querySnapshot.docChanges().forEach(change => {
            changes[change.type].push({...change.doc.data(), _id:change.doc.id});
        });
    
        for (let i = 0; i < callbackGroup.length; i++) {
            try {
                await callbackGroup[i].call(null, changes);
            } catch (err) {
                console.log(`Error in callback ${i} of ${type}: ${err.toString()}`);
            }
        }
    });
}

const userTables = [
    "ban",
    "kick",
    "warning"
];

/**
 * 
 */
async function purgeUsers() {
    try {
        const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

        for (let table of userTables) {
            let ref = await db.collection(table)
                .where("timestamp", "<", Firestore.Timestamp.fromDate(sevenDaysAgo));
            let docs = await ref.get();

            docs.forEach(doc => {
                doc.ref.update({
                    userId: Firestore.FieldValue.delete(),
                    username: Firestore.FieldValue.delete()
                });
            });
        }
    } catch (err) {
        console.log(`Error purging historic users: ${err.toString()}`);
    }
}

/**
 * 
 */
async function purgeRecords() {
    try {
        const sixMonthsAgo = new Date(Date.now() - 6 * 31 * 24 * 60 * 60 * 1000);
    
        for (let table of userTables) {
            let ref = await db.collection(table)
                .where("timestamp", "<", Firestore.Timestamp.fromDate(sixMonthsAgo));
            let docs = await ref.get();
    
            // save the count of records you're about to delete
            let saveRef = await db.collection("history").doc(table);
            await saveRef.update({
                count: Firestore.FieldValue.increment(docs.size)
            });
    
            docs.forEach(doc => {
                doc.ref.delete();
            });
        }
    } catch (err) {
        console.log(`Error deleting old records: ${err.toString()}`);
    }
}

/**
 * 
 * @returns {Number}
 */
async function totalActions() {
    let total = 0;
    for (let table of userTables) {
        let ref = await db.collection(table);
        let docs = await ref.get();

        total += docs.size;
    }

    let historyRef = await db.collection("history");
    let historyDocs = await historyRef.get();
    historyDocs.forEach(item => total += item.data().count);

    return total;
}

setInterval(purgeUsers, 1000 * 60 * 60 * 24);
setInterval(purgeRecords, 1000 * 60 * 60 * 24);

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
    moveUrl,
    flagUrl,
    addMessageToScamList,
    addUrlToVerifiedDomains,
    loadVerifiedDomains,

    recordContentReview,

    registerLogs,
    loadAllLogChannels,
    getLogChannel,

    monitor,

    deleteById, 

    hashMessage,

    purgeUsers,
    purgeRecords,
    totalActions
};