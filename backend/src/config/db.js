const mongoose = require("mongoose");

const { MONGO_URI } = require("./env");

async function connectDatabase() {
   await mongoose.connect(MONGO_URI);
}

async function disconnectDatabase() {
   await mongoose.disconnect();
}

function databaseState() {
   return mongoose.STATES[mongoose.connection.readyState];
}

module.exports = {
   connectDatabase,
   disconnectDatabase,
   databaseState,
};
