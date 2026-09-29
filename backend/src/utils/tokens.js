const { createHash, randomBytes } = require("node:crypto");

// 32 random bytes, url safe, for refresh cookies and email links.
const randomToken = () => randomBytes(32).toString("base64url");

// Only the hash is ever stored.
const hashToken = (raw) => createHash("sha256").update(raw).digest("hex");

module.exports = { randomToken, hashToken };
