const dotenv = require("dotenv");

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI =
   process.env.MONGO_URI || "mongodb://localhost:27017/code-judge";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

module.exports = {
   PORT,
   MONGO_URI,
   FRONTEND_URL,
};
