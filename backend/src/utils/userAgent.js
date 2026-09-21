const { UAParser } = require("ua-parser-js");

function parseUserAgent(ua) {
   if (!ua) return {};

   const { browser, os } = UAParser(ua);

   return {
      browser:
         browser.name &&
         [browser.name, browser.major].filter(Boolean).join(" "),
      os: os.name,
   };
}

module.exports = { parseUserAgent };
