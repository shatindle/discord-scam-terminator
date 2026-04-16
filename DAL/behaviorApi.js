
const { monitor } = require("./databaseApi");

let behavior = {};

/**
 * 
 * @param {Object} changes 
 * @param {Object} list 
 */
function behaviorChanges(changes, list) {
    try {
        changes.added.forEach(item => list[item.guildId] = item);
        changes.modified.forEach(item => list[item.guildId] = item);
        changes.removed.forEach(item => delete list[item.guildId]);
    } catch (err) {
        console.log(`Failed to address behavior changes: ${err.toString()}`);
    }
}

monitor("behavior", async (changes) => behaviorChanges(changes, behavior));

function lookupGuildBehavior(guildId) {
    const behaviors = behavior[guildId] ?? {
        defaults: true,
        removal_action: "kick"
    };

    return behaviors;
}

module.exports = {
    lookupGuildBehavior
};