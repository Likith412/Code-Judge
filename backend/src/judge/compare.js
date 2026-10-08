// Line endings never count, so a Windows \r\n matches a \n.
const unifyLineEnds = (text) => text.replace(/\r\n?/g, "\n");

// TRIM drops spaces at the end of each line and blank lines at the end.
const trimEnds = (text) =>
   unifyLineEnds(text)
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .replace(/\n+$/, "");

// EXACT still forgives one final newline, or every println would fail.
const exact = (text) => unifyLineEnds(text).replace(/\n$/, "");

function outputMatches(actual, expected, mode) {
   if (mode === "EXACT") return exact(actual) === exact(expected);

   return trimEnds(actual) === trimEnds(expected);
}

module.exports = { outputMatches };
