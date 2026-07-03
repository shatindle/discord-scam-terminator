import { env } from '$env/dynamic/private';
import { Firestore, Timestamp } from '@google-cloud/firestore';

/** @type {Firestore | undefined} */
let firestoreClient;

function hasFirestoreConfig() {
    return Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_KEY_FILE);
}

function warnMissingFirestoreConfig() {
    const missing = [];

    if (!env.FIREBASE_PROJECT_ID) {
        missing.push('FIREBASE_PROJECT_ID');
    }

    if (!env.FIREBASE_KEY_FILE) {
        missing.push('FIREBASE_KEY_FILE');
    }

    if (missing.length > 0) {
        console.warn(
            `[db] Firestore observers disabled; missing env vars: ${missing.join(', ')}`
        );
    }
}

export function getFirestoreClient() {
    if (firestoreClient) {
        return firestoreClient;
    }

    const projectId = env.FIREBASE_PROJECT_ID;

    if (!projectId) {
        throw new Error('Missing Firebase project id for server totals.');
    }

    const keyFilename = env.FIREBASE_KEY_FILE;

    if (!keyFilename) {
        throw new Error('Missing Firebase key file name.');
    }

    firestoreClient = new Firestore({
        projectId,
        keyFilename
    });

    return firestoreClient;
}

/**
 * 
 * @param {{added:FirebaseFirestore.DocumentData,modified:FirebaseFirestore.DocumentData,removed:FirebaseFirestore.DocumentData}} changes 
 * @param {Object} list 
 */
function changeMonitor(changes, list) {
    try {
        // @ts-ignore
        changes.added.forEach(item => list[item._id] = item);
        // @ts-ignore
        changes.modified.forEach(item => list[item._id] = item);
        // @ts-ignore
        changes.removed.forEach(item => delete list[item._id]);
    } catch (err) {
        // @ts-ignore
        console.log(`Failed to address behavior changes: ${err.toString()}`);
    }
}

export const database = {
    ban: {},
    behavior: {},
    kick: {},
    logchannels: {},
    loginsessions: {},
    real_ban: {},
    timeout: {},
    warning: {},
    // TODO: re-introduce these as those functions are built out
    // whitelist: {},
    // unusual_behavior: {},
    // verifieddomains: {},
    // maliciousinvites: {},
    // history: {},
    // error: {},
    // graylist: {},
    // blacklist: {},
    // contentreview: {},
    // @ts-ignore
    _getTable: (table) => Object.values(database[table]),
    // @ts-ignore
    _getItem: (table, id) => database[table] ? database[table][id] : null
};

/**
 * 
 * @param {String} type 
 * @param {any} list
 * @returns 
 */
function configureObserver(type, list) {
    const db = getFirestoreClient();

    db.collection(type).onSnapshot(async querySnapshot => {
        const changes = {
            added: [],
            modified: [],
            removed: []
        };
    
        querySnapshot.docChanges().forEach(change =>
            // @ts-ignore
            changes[change.type].push({...change.doc.data(), _id:change.doc.id}));

        changeMonitor(changes, list)
    });
}

if (hasFirestoreConfig()) {
    for (const table of Object.keys(database).filter((t) => !t.startsWith('_'))) {
        // @ts-ignore
        configureObserver(table, database[table]);
    }
} else {
    warnMissingFirestoreConfig();
}

const BEHAVIOR_COLLECTION = "behavior";

/**
 * 
 * @param {string} userId 
 * @param {string} guildId 
 * @param {boolean} restore_defaults 
 * @param {boolean} nitro_steam_spam 
 * @param {boolean} malicious_redirects 
 * @param {boolean} image_spam 
 * @param {boolean} link_spam 
 * @param {boolean} text_spam 
 * @param {boolean} profile_spam 
 * @param {string} removal_action 
 * @returns {Promise<string>}
 */
export async function registerBehaviorMonitor(
        userId,
        guildId,
        restore_defaults,
        nitro_steam_spam,
        malicious_redirects,
        image_spam,
        link_spam,
        text_spam,
        profile_spam,
        removal_action
    ) {
    const db = getFirestoreClient();

    const ref = db.collection(BEHAVIOR_COLLECTION).doc(guildId);
    const docs = await ref.get();

    const enableAll = 
        restore_defaults ||
        (
            nitro_steam_spam && 
            malicious_redirects && 
            image_spam && 
            link_spam && 
            text_spam &&
            profile_spam && 
            removal_action === "kick"
        );

    if (docs.exists) {
        if (enableAll) {
            await ref.delete();
            return `Restored default bot settings:
- nitro_steam_spam: true
- malicious_redirects: true
- image_spam: true
- link_spam: true
- text_spam: true
- profile_spam: true
- removal_action: kick`;
        } else {
            await ref.update({
                userId,
                updatedOn: Timestamp.now(),
                nitro_steam_spam,
                malicious_redirects,
                image_spam,
                link_spam,
                text_spam,
                profile_spam,
                removal_action
            });
            return `The bot will abide by these rules now for this server:
- nitro_steam_spam: ${nitro_steam_spam}
- malicious_redirects: ${malicious_redirects}
- image_spam: ${image_spam}
- link_spam: ${link_spam}
- text_spam: ${text_spam}
- profile_spam: ${profile_spam}
- removal_action: ${removal_action}`;
        }
    } else {
        if (enableAll) {
            // do nothing
            return `Restored default bot settings:
- nitro_steam_spam: true
- malicious_redirects: true
- image_spam: true
- link_spam: true
- text_spam: true
- profile_spam: true
- removal_action: kick`;
        } else {
            await ref.set({
                userId,
                updatedOn: Timestamp.now(),
                guildId: guildId,
                nitro_steam_spam,
                malicious_redirects,
                image_spam,
                link_spam,
                text_spam,
                profile_spam,
                removal_action,
                createdOn: Timestamp.now()
            });
            return `The bot will abide by these rules now for this server:
- nitro_steam_spam: ${nitro_steam_spam}
- malicious_redirects: ${malicious_redirects}
- image_spam: ${image_spam}
- link_spam: ${link_spam}
- text_spam: ${text_spam}
- profile_spam: ${profile_spam}
- removal_action: ${removal_action}`;
        }
    }
}