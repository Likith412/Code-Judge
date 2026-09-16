const http = require("http");
const { PORT } = require("./config/env");
const { connectDB } = require("./config/db");

const app = require("./app");

connectDB();

http.createServer(app).listen(PORT, () => {
   console.log("Server is running on port", PORT);
});
