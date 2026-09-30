const mongoose = require("mongoose");

// Every write lands or none does. Pass the session on, and expect a retry.
async function runTransaction(work) {
   const session = await mongoose.startSession();

   try {
      return await session.withTransaction(work);
   } finally {
      await session.endSession();
   }
}

module.exports = { runTransaction };
