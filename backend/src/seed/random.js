// A seeded random source, so every seed run writes the same big test cases.

// mulberry32: small, fast, and good enough for test data.
function createRandom(seed) {
   let state = seed >>> 0;

   const next = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };

   // A whole number from lo to hi, both included.
   const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));

   const pick = (list) => list[int(0, list.length - 1)];

   const word = (length, letters) =>
      Array.from({ length }, () => pick(letters)).join("");

   const ints = (count, lo, hi) =>
      Array.from({ length: count }, () => int(lo, hi));

   return { next, int, pick, word, ints };
}

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const ALNUM = `${LOWER}${LOWER.toUpperCase()}0123456789`;

module.exports = { createRandom, LOWER, ALNUM };
