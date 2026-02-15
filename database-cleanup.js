const { purgeRecords, purgeUsers } = require("./DAL/databaseApi");

(async () => {
    await purgeUsers();
    await purgeRecords();
})();