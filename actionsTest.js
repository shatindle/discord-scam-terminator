const { totalActions } = require("./DAL/databaseApi");

setTimeout(async () => {
    console.log(await totalActions());

    var x = 1;
})