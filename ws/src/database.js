const mongoose = require('mongoose');

require("dotenv").config()

async function main(){
    await mongoose.connect(`mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@clusterdev.iaihfu4.mongodb.net/petuxos-app?retryWrites=true&w=majority&appName=ClusterDev`);
    console.log("Db online")
}

main().catch((err) => console.log(err));

module.exports = main;
