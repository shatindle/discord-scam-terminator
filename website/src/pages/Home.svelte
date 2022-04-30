<script>
    
</script>

<div>
    <h2>The Scam Hunter Dashboard</h2>
    <p>
        Click the menu in the upper left to get started.  
        You can see a dashboard summarizing scams caught in Discord servers you moderate.
        If you don't currently use the bot, you can add it by <a href="https://discord.com/api/oauth2/authorize?client_id=924388372854767646&permissions=1099511704578&scope=bot%20applications.commands" target="_blank">clicking here</a>.
    </p>
    <p>
        Want to run your own instance?  You can review <a href="https://github.com/shatindle/discord-scam-terminator" target="_blank">the source code</a>.
    </p>
    <p>
        Have ideas or feedback?  <a href="https://discord.gg/8ykjyQ8wJw" target="_blank">Join the support server</a>!
    </p>

    <h3>What the bot does</h3>
    <p>
        The bot is specifically designed to look for key attributes common in scams. It uses a combination of tools to de-obfuscate scam message attempts that contain text and a link. If the message is identified as a scam and the user is not a Moderator, it creates a UUID for the message and the user, stores it in memory, makes a record of the event in Firestore, then deletes the message. If the same message is encountered recently and identically from the same user, the user is also kicked from the server.
    </p>
</div>