// Tokens are base64url; anything after them was copied along by mistake, so drop it.
function readLinkToken(params) {
   return params.get("token")?.match(/^[A-Za-z0-9_-]+/)?.[0] || null;
}

export { readLinkToken };
