// Slugs are lowercase letters, digits and single dashes. No regex on purpose.
const isWordChar = (character) =>
   (character >= "a" && character <= "z") ||
   (character >= "0" && character <= "9");

// "Two Sum II — Input Array" becomes "two-sum-ii-input-array".
function slugify(text) {
   let slug = "";

   for (const character of String(text).toLowerCase().trim()) {
      if (isWordChar(character)) slug += character;
      // Anything else becomes one dash, and never a leading one.
      else if (slug.length > 0 && !slug.endsWith("-")) slug += "-";
   }

   // A title ending in punctuation leaves a dash behind.
   return slug.endsWith("-") ? slug.slice(0, -1) : slug;
}

// True when the text is already a clean slug.
const isSlug = (text) => text.length > 0 && slugify(text) === text;

module.exports = { slugify, isSlug };
