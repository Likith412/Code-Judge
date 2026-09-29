const mongoose = require("mongoose");

// Every write lands or none does. Pass the session to each query inside, and
// keep out anything the database cannot undo: the work may run twice.
async function runTransaction(work) {
   const session = await mongoose.startSession();

   try {
      return await session.withTransaction(work);
   } finally {
      await session.endSession();
   }
}

module.exports = { runTransaction };
