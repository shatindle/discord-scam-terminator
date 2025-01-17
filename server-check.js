const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./settings.json');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds
    ] 
});

client.once('ready', async () => {
    console.log(client.guilds.cache.size);
    let total = 0;
    const partneredverified = [];
    const partnered = [];
    const verified = [];
    const everythingelse = [];

    client.guilds.cache.sort((a, b) => a.memberCount > b.memberCount ? -1 : 1).forEach(guild => {
        total += guild.memberCount;

        if (guild.verified && guild.partnered) {
            partneredverified.push(`${guild.id}: ${guild.name}: ${guild.memberCount}`);
        } else if (guild.partnered) {
            partnered.push(`${guild.id}: ${guild.name}: ${guild.memberCount}`);
        } else if (guild.verified) {
            verified.push(`${guild.id}: ${guild.name}: ${guild.memberCount}`);
        } else {
            everythingelse.push(`${guild.id}: ${guild.name}: ${guild.memberCount}`);
        }
    });

    if (partneredverified.length > 0) {
        console.log("Partnered and verified");
        partneredverified.forEach(t => console.log(t));
        console.log("");
    }

    if (partnered.length > 0) {
        console.log("Partnered");
        partnered.forEach(t => console.log(t));
        console.log("");
    }

    if (verified.length > 0) {
        console.log("Verified");
        verified.forEach(t => console.log(t));
        console.log("");
    }

    if (everythingelse.length > 0) {
        console.log("Not partnered or verified");
        everythingelse.forEach(t => console.log(t));
        console.log("");
    }

    console.log("");
    console.log(`${total} users`);
    process.exit(0);
});

client.login(token);