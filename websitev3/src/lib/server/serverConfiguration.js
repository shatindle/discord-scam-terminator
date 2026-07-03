import { database, registerBehaviorMonitor } from './db';

export const serverConfig = (/** @type {string} */ guildId) => {
    const config = database._getItem("behavior", guildId);

    if (config) {
        return {
            createdOn: config.createdOn.toDate(),
            guildId: config.guildId,
            image_spam: config.image_spam,
            link_spam: config.link_spam,
            malicious_redirects: config.malicious_redirects,
            nitro_steam_spam: config.nitro_steam_spam,
            profile_spam: config.profile_spam,
            removal_action: config.removal_action,
            text_spam: config.text_spam,
            updatedOn: config.updatedOn.toDate(),
            userId: config.userId
        };
    }

    return {
        createdOn: new Date(),
        guildId: guildId,
        image_spam: true,
        link_spam: true,
        malicious_redirects: true,
        nitro_steam_spam: true,
        profile_spam: true,
        removal_action: "kick",
        text_spam: true,
        updatedOn: new Date(),
        userId: null
    };
}

