const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const { ALLOWED_ORIGINS } = require("./config/env");
const logger = require("./config/logger");
const requestId = require("./middlewares/requestId");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const routes = require("./routes");

const app = express();

// Behind nginx in docker compose, so req.ip is the client, not nginx.
app.set("trust proxy", 1);

app.use(helmet());

app.use(requestId);

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// Max-size test cases run to megabytes, so only their routes take big bodies.
app.use("/api/problems/:id/test-cases", express.json({ limit: "8mb" }));

app.use(express.json({ limit: "100kb" }));

app.use(cookieParser());

app.use("/api", routes);

app.use(notFound);

app.use(errorHandler(logger));

module.exports = app;
