# Discord Scam Terminator

[![Bot Deployment Status](https://github.com/shatindle/discord-scam-terminator/actions/workflows/main.yml/badge.svg)](https://github.com/shatindle/discord-scam-terminator/actions/workflows/main.yml)

## tl;dr

If you're just interested in the invite link, you can invite the bot [here](https://discord.com/api/oauth2/authorize?client_id=924388372854767646&permissions=1099511704578&scope=bot%20applications.commands).

If you want to join the support server, you can do so [here](https://discord.gg/8ykjyQ8wJw).

## What the bot does

The bot is specifically designed to look for key attributes common in scams.  It uses a combination of tools to de-obfuscate scam message attempts that contain text and a link.  If the message is identified as a scam and the user is not a Moderator, it creates a UUID for the message and the user, stores it in memory, makes a record of the event in Firestore, then deletes the message.  If the same message is encountered recently and identically from the same user, the user is also kicked from the server.

If the message doesn't contain any scam attributes but has a link, the bot will visit the link, impersonating a user to investigate data about the site.  If the site seems to be pretending to be a service such as Discord, Steam, or a few others, the bot will flag the message as a scam and follow the protocol for deleting/kicking outlined above.

The bot is not perfect as it is not operating against a known set of bad domains.  Instead, it is using a less certain tactic for assessing if something is a scam in disguise.  It is highly advised to pair this bot with another bot that has a list of recent, known scam domains.  Between the two, very little will get through these filters.

Scam hunter's hit rate is near 100%, but it's not perfect.  Mods still need to be ready to remove links it and other bots may miss.  No bot is perfect, but hopefully this bot reduces the Moderator workload dramatically.

## Required permissions

The bot needs the following permissions to function:
- Kick Members
- Read Messages/View Channels
- Send Messages
- Manage Messages
- Read Message History
- Ban Members (optional, used only for the clonex scams)

Additionally, in order to kick users, the bot must have a role above all users you wish to kick.  **NOTE: the bot will only kick users that do not have the Manage Messages permission in the server.**  Moderators should not be kicked by the bot.

The bot was originally deployed without slash commands.  Some slash commands have been added such as the log command.  To enable it, you may need to re-invite the bot to update the scopes.  You should not need to kick the bot.

To log all malicious detections, do 
```
/log to:CHANNEL
```

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
- **An ExpressVPN tunnel instance** depends on .env
- **A Cloudflare tunnel to route website traffic to your Cloudflare hosted domain** depends on .env

After getting the source code, you'll need to [install docker](https://docs.docker.com/engine/install/), setup a [Cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/), and get your [ExpressVPN activation code](https://www.expressvpn.com).  Once everything is configured, run the following command from the same directory as the source code:

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

Visit the [support server on Discord](https://discord.gg/8ykjyQ8wJw) and talk to me in #general.  Good luck!