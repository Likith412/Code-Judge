const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const { ALLOWED_ORIGINS } = require("./config/env");
const logger = require("./config/logger");
const requestId = require("./middleware/requestId");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const routes = require("./routes");

const app = express();

app.use(helmet());
app.use(requestId);
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler(logger));

module.exports = app;
