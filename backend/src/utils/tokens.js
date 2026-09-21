const { createHash, randomBytes, timingSafeEqual } = require("node:crypto");

// 32 random bytes, url safe, for refresh cookies and email links.
const randomToken = () => randomBytes(32).toString("base64url");

// Only the hash is ever stored.
const hashToken = (raw) => createHash("sha256").update(raw).digest("hex");

const sameToken = (a, b) => {
   if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length)
      return false;
   return timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

module.exports = { randomToken, hashToken, sameToken };
