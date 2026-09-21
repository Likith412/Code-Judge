const UNITS = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

const isDigits = (text) =>
   text.length > 0 &&
   [...text].every((character) => character >= "0" && character <= "9");

// Converts values like "10m" to milliseconds for matching cookie and session expiry.
function toMs(value) {
   const text = String(value).trim();
   const unit = UNITS[text.slice(-1)];
   const amount = text.slice(0, -1);

   if (!unit || !isDigits(amount) || Number(amount) === 0) {
      throw new Error(
         `Bad duration: ${value}. Use something like 10m, 24h or 14d.`,
      );
   }

   return Number(amount) * unit;
}

module.exports = { toMs };
