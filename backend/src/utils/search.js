// A MongoDB $regex filter for text anywhere in a field, ignoring case, with the input escaped.
const containsText = (text) => ({
   $regex: text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
   $options: "i",
});

module.exports = { containsText };
