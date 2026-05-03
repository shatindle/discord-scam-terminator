const { Message, PermissionsBitField, Client } = require("discord.js");
const { cleanMessage, extractUrlsFromContent } = require("../DAL/bodyparserApi");
const { recordError } = require("../DAL/databaseApi");
const { getServerIdFromInvite } = require("../DAL/urlTesterApi");
const { textTooSimilar } = require("../DAL/textComparisonTools");
const { forwardMessage } = require("../DAL/logApi");

let allRules = undefined;

try {
    allRules = require("../supplementaryRules.json");
} catch { /* do nothing if we cannot load the supplementary rules file */}

const reason = "Advanced rules";

// TODO: these rules are highly experimental in nature as they do not do warnings like the other rules
// they are intended to deal with users who are sending one-time malicious content.  
// It is very hard to detect, so the bot only forwards the messages and does not take further action.

/**
 * @description Advanced experimental rules
 * @param {Message} message The message object
 * @returns {Promise<Boolean>} Whether or not the message was acted on in some way
 */
async function monitor(message) {
    // if we have no supplementary rules, keep going
    if (!allRules) return false;

    // ignore posts from bots
    if (message.author.bot) return false;

    try {
        // ignore posts from mods
        if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return false;
    } catch (err) {
        await recordError("", "", "permissions property null: " + err.toString(), reason);
        // for now, exit since we couldn't keep going
        return false;
    }

    const client = message.client;
    const guildId = message.guild.id;
    const userId = message.member.id;

    try {
        const username = message.member.user.username + "#" + message.member.user.discriminator;

        if (message.content) {
            const content = cleanMessage(message.content);

            const urlsFound = extractUrlsFromContent(content, true);
            // collect attributes
            const hasUrls = urlsFound.length > 0;
            let hasNonDiscordUrls = false;
            let hasDiscordUrls = false;

            if (hasUrls) {
                // check if the link is an invite code.  If it is, get the server ID
                let isThisServer = true;
                for (let url of urlsFound) {
                    let linkServer = await getServerIdFromInvite(url);

                    if (linkServer) {
                        if (linkServer !== guildId) {
                            hasDiscordUrls = true;
                        }
                    } else {
                        hasNonDiscordUrls = true;
                    }

                    isThisServer = false;
                }
            }

            for (let rules of allRules) {
                let weight = 0.0;

                for (let rule of rules.contains) {
                    if (rule.options && rule.batch) {
                        // Levenshtein distance
                        const wordStarts = [...content.matchAll(/\b\w+\b/g)].map(match => match.index);

                        for (let sentence of rule.options) {
                            let wordCount = sentence.match(/\b(\w+)\b/g).length;

                            let index = 0;
                            for (let index = 0; index + wordCount - 1 < wordStarts.length; index++) {
                                let startOfWords = wordStarts[index];
                                let endOfWords = index + wordCount < wordStarts.length ? wordStarts[index + wordCount] : undefined;

                                let subStr = content.substring(startOfWords, endOfWords);

                                let tooSimilar = textTooSimilar(sentence, subStr, rule.confidence);

                                if (tooSimilar) {
                                    weight += rule.weight;
                                    console.log(JSON.stringify(rule));
                                    continue;
                                }
                            }
                        }
                    } else if (rule.options) {
                        // word compare
                        let flagCount = 0;
                        let words = content.match(/\b(\w+)\b/g);
                        words = [...new Set(words)];

                        if (words && words.length)
                        for (let word of words) {
                            for (let ruleWord of rule.options) {
                                if (ruleWord === word) flagCount++;
                            }
                        }

                        if (flagCount >= rule.min) {
                            weight += rule.weight;
                            console.log(JSON.stringify(rule));
                        }
                    } else if (rule.containsPing) {
                        // has ping
                        if (containsPing) {
                            weight += rule.weight;
                            console.log(JSON.stringify(rule));
                        }
                    } else if (rule.hasDiscordLink) {
                        // has discord link
                        if (hasDiscordUrls) {
                            weight += rule.weight;
                            console.log(JSON.stringify(rule));
                        }
                    } else if (rule.hasLink) {
                        // has link
                        if (hasNonDiscordUrls) {
                            weight += rule.weight;
                            console.log(JSON.stringify(rule));
                        }
                    }
                }

                // do something with weight
                if (weight > 0.5) {
                    console.log(`Weight: ${weight}`);
                }

                if (rules.note && weight >= rules.note) {
                    await forwardMessage(
                        client, 
                        guildId, 
                        message, 
                        rules.channel, 
                        rules.supplement ? 
                            rules.supplement
                                .replace("{user}", `<@${userId}>`)
                                .replace("{score}", weight) : 
                            reason);
                }
            }
        }

        return false;
    } catch (err) {
        console.log(`ERROR: ${err}`);
        // something went wrong when assessing the message content
        try {
            await recordError(guildId, userId, err.toString(), reason);
        } catch (err2) {
            await recordError("", "", err2.toString(), reason);
        }

        return false;
    }
 }

module.exports = monitor;