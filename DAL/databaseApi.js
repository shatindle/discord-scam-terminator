const uuidv5 = require('uuid').v5;
const uuidNamespace = require('../settings.json').uuidNamespace;

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

module.exports = {
    shouldBanUser
};