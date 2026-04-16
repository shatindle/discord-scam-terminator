# Discord Scam Terminator

[![Bot Deployment Status](https://github.com/shatindle/discord-scam-terminator/actions/workflows/main.yml/badge.svg)](https://github.com/shatindle/discord-scam-terminator/actions/workflows/main.yml)

## tl;dr

If you're just interested in the invite link, you can invite the bot [here](https://discord.com/api/oauth2/authorize?client_id=924388372854767646&permissions=1099511704578&scope=bot%20applications.commands).

If you want to join the support server, you can do so [here](https://discord.gg/8ykjyQ8wJw).

## What the bot does

The bot is specifically designed to look for key attributes common in scams.  It uses a combination of tools to de-obfuscate scam message attempts that contain text and a link.  If the message is identified as a scam and the user is not a Moderator, it creates a UUID for the message and the user, stores it in memory, makes a record of the event in Firestore, then deletes the message.  If the same message is encountered recently and identically from the same user, the user may also be actioned (kicked, banned, or timed out, depending on your server setup).

If the message doesn't contain any scam attributes but has a link, the bot will visit the link, impersonating a user to investigate data about the site.  If the site seems to be pretending to be a service such as Discord, Steam, or a few others, the bot will flag the message as a scam and follow the protocol for deleting/actioning outlined above.

The bot is not perfect, but since it's creation on December 25, 2021, the logic and sophistication of the bot has grown to the point that it no longer really needs supplementation from other anti-scam/anti-spam bots. Feel free to add backups, by all means, just know that the logic has grown quite a lot over the years.

Scam hunter's hit rate is near 100%, but it's not perfect. Mods still need to be ready to remove links it and other bots may miss. No bot is perfect, but hopefully this bot reduces the Moderator workload dramatically.

Some server configurations that can cause the bot to be less effective:
- Message cooldowns may interfere with malicious intending users spamming enough for spam to be detected
- Image cooldowns may interfere with the bot's ability to identify a new spam scam involving posting "unique" images in multiple channels

## Required permissions

The bot needs the following permissions to function:
- Kick Members
- Moderate Members
- Ban Members
- Read Messages/View Channels
- Send Messages
- Send Embeds
- Manage Messages
- Read Message History

Additionally, in order to action users (kick, ban, or time out, your choice on what you choose to grant), the bot must have a role above all users you wish to action.  **NOTE: the bot will only action users that do not have the Manage Messages permission in the server.**  Moderators should not be actioned by the bot.

The bot includes two slash commands to make diagnosing and controlling the bot's behavior easier.  

## Bot activity logging to a channel
The bot has the ability to log actions it takes to a channel of your choosing. To enable the log command, you'll want to ensure the bot has the following permissions on the channel you wish to log to:
- Read Messages/View Channels
- Send Messages
- Send Embeds

To log all malicious detections, spam, errors, and messages that may be suspicious, do 
```
/log to:CHANNEL
```

Where "CHANNEL" is the channel you wish the bot to log actions to.

## Bot behavior controls
You have the control to enable and disable rulesets for your server as well as decide if the bot should kick, timeout, or ban a user found to be spammy (usually after a warning unless they're spamming 4 images across channels) or malicious.

By default, the bot will have the following rules enabled:
- **nitro_steam_spam**: Common Nitro/Steam phishing attempts involving both a link and suspicious text.
- **malicious_redirects**: Contains URLs that upon inspection include terms commonly used to impersonate a handful of sites such as Discord or Steam logins.
- **image_spam**: The user is spamming the same image(s) across channels (often containing requests that the user take some compromising action).
- **link_spam**: The user is spamming links across channels. These often include Discord links that are intended to compromise the user's account by asking the user to "verify" their account in an external website.
- **text_spam**: The user is spamming *approximately* the same text across channels. This is often to done to request the user engage in a compromising financial transaction via DM or a 3rd party service.
- **removal_action** = kick: The default action the bot will take to remove a user from the community once they've been determined to be compromised or malicious.

You can override any of these by running
```
/behavior [ruleset:False] [...]
```

To restore default functionality to the bot, simply run
```
/behavior restore_defaults:True
```

The supported removal_actions are:
- Kick (default)
- Timeout (3 days)
- Ban

I personally do not recommend ban as I have seen users recover their accounts in the past. It isn't super common, but it's common enough that ban instead of kick creates a burden on the mod team in the future to unban the user.

Timeout is usually an acceptable option. The upside is it gives the moderation team time to evaluate the bot's behavior further before full removal from the server. The downside (and reason the bot defaults to kick) is if the user really is compromised, compromised accounts could move to DMs to users instead of messages in the server until the moderation team chooses what further action to take.

## System requirements

The bot needs the following to function:
- Node.js (at least version 16 as of this writing)
- a [Cloud Firestore database (quickstart here)](https://firebase.google.com/docs/firestore/quickstart)
- a [Discord bot token](https://discord.com/developers/docs/topics/oauth2)
- a solid internet connection (ideally, you deploy it on a server)

## Configuration

In Cloud Firebase, create a new project, then create a Firestore database in the project.  See the quickstart above for instructions on setting up Firestore.  Once you have a database, create a Service account via Project Settings > Service Accounts.  Set the type as Node.js and click "Generate new private key".  Name this file firebase.json, and place it in the root of the project.

If you've never used Firestore before, the daily free tier is extremely generous.  Further, the bot does some caching to reduce the read operations required of Firestore, so unless you're deploying this in a server with half a million users, you likely will not need more than what the free tier offers.

Copy/paste the settings.sample.json file and name it settings.json. In that file, fill in your Discord bot token, replacing the sample's DISCORD_BOT_TOKEN.  UUID_NAMESPACE should be any valid guid such as 4988c338-97e3-48ae-b2fa-2fb22108f1fd.  Whatever you pick, you should not change it.  It is used to create unique, repeatable identifiers given the same inputs to eliminate the need to store user messages in Firestore.  Replace FIREBASE_PROJECT_ID with your Firebase/Firestore project ID.

Install the node modules and run the bot:
```
npm install;
node ./index.js;
```

## Production mode

For testing purposes, it's ok to run the bot via node in the terminal.  It is recommended to run the bot via a process manager like [pm2](https://www.npmjs.com/package/pm2) in a production environment.  A sample setup is listed below in the root directory of the application:
```
pm2 start index.js --name "scam-terminator";
pm2 save;
```

## Docker

The bot and website now support running in a Docker container!  The docker-compose.yaml file assumes a few things that may be different from your setup: 
- The front-end of the website is routed through Cloudflare via a Cloudflare tunnel
- You have an ExpressVPN subscription and can use one device license so owners of malicious websites can't locate your bot instance via IP

In addition to the firebase.json and settings.json files, you will need a .env file.  See .env.sample for an example.

The Docker version runs four containers:
- **The bot** depends on settings.json and firebase.json
- **The website** depends on settings.json and firebase.json
- **An ExpressVPN tunnel instance** depends on .env - [repo to build your ExpressVPN docker image](https://github.com/shatindle/expressvpn-docker/tree/master).  Be sure line 13 of the Dockerfile in this repo is updated to the latest ExpressVPN version
- **A Cloudflare tunnel to route website traffic to your Cloudflare hosted domain** depends on .env

After getting the source code for both this bot and the ExpressVPN tunnel and placing them in /var/repos (adjust the [docker-compose.yaml](/docker-compose.yaml) file if you wish to place the source code in another directory), you'll need to [install docker](https://docs.docker.com/engine/install/), setup a [Cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/), and get your [ExpressVPN activation code](https://www.expressvpn.com).  Once everything is configured, run the following command from the same directory as the source code:

```
docker compose up -d --build --remove-orphans
```

> **_NOTE:_**  The instructions below this line are approximate as I use docker compose in my environment and have no need for running containers without a compose file.  They should work, but there's a chance you'd need to do some Googling depending on your system and setup.

Alternatively, you could build and run the bot and website without the compose file.  To do that, you'll need to run the following command for just the bot:

```
docker run -it $(docker build -f Dockerfile.bot -q .)
```

And/or the following command for just the site:

```
docker run -it $(docker build -f Dockerfile.site -q .)
```

## Questions

Visit the [support server on Discord](https://discord.gg/8ykjyQ8wJw) and talk to me in #general.

The bot is provided free of charge. I am not monetizing it, and I have no intent to monetize any aspect of it in the future. The servers I designed it for originally are the [r/Splatoon](https://discord.gg/rsplatoon) and [r/PokemonUnite](https://discord.gg/pokemonunite) Discord servers. Special shout out to the [Trackmania](https://discord.gg/trackmania) community for all your feedback in what is working and what isn't with the bot that has made it as sophisticated as it is today!
