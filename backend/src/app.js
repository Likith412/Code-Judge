const express = require("express");
const cors = require("cors");

const { FRONTEND_URL } = require("./config/env");

const app = express();

app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

app.get("/", (req, res) => {
   res.send({ message: "Hello, World!" });
});

module.exports = app;
