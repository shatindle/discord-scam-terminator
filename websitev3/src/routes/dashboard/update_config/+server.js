import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { registerBehaviorMonitor } from '$lib/server/db';
import { getDiscordClient, logActivity, confirmBehaviorManagement } from '$lib/server/discordBot';

const VALID_REMOVAL_ACTIONS = [
    "kick",
    "ban",
    "timeout"
]

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {

    if (!locals.user || !locals.user.id) {
        return json({ error: "Not logged in" }, { status: 500 });
    }

    const client = await getDiscordClient();

    const {
        guildId,
        image_spam,
        link_spam,
        malicious_redirects,
        nitro_steam_spam,
        profile_spam,
        removal_action,
        text_spam
    } = await request.json();

    if (typeof image_spam !== "boolean" ||
        typeof link_spam !== "boolean" ||
        typeof malicious_redirects !== "boolean" ||
        typeof nitro_steam_spam !== "boolean" ||
        typeof profile_spam !== "boolean" ||
        typeof text_spam !== "boolean" ||
        VALID_REMOVAL_ACTIONS.indexOf(removal_action) === -1 ||
        !/^\d+$/.test(guildId)
    ) {
        return json({ error: "Invalid payload" }, { status: 500 });
    }

    const verification = await confirmBehaviorManagement(client, guildId, locals.user.id, removal_action);

    if (!verification.success) return json({ error: verification.error }, { status: 401 });

    const result = await registerBehaviorMonitor(
        locals.user.id,
        guildId,
        false,
        nitro_steam_spam,
        malicious_redirects,
        image_spam,
        link_spam,
        text_spam,
        profile_spam,
        removal_action);

    await logActivity(
        client, 
        guildId, 
        `Bot behavior changed.\n${result}`, 
        `<@${locals.user.id}> used [the website](${env.WEBSITE_URL})`,
        "#007bff"
    ); 

    return json({ success: true }, { status: 200 });
}
