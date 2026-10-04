// scripts/lib/placeholders.js
// Find template and example text that must not reach an exported CV or letter.

const PATTERNS = [
  { re: /<[A-Z][A-Z0-9_]*>/g, why: "unfilled placeholder" },
  { re: /\[EXAMPLE\b[^\]]*\]/g, why: "example text" },
  { re: /\breplace (?:this|with your|or remove)\b/gi, why: "template instruction" },
  { re: /\bYour (?:Name|Location)\b|you@example\.com/g, why: "template profile data" },
  { re: /^# Generated CV$|Draft or generated cover letter goes here\./gm, why: "new-app stub" },
];

// Every match as { line, text, why }, in document order.
export function findPlaceholders(markdown) {
  const found = [];
  markdown.split("\n").forEach((lineText, i) => {
    for (const { re, why } of PATTERNS) {
      for (const match of lineText.matchAll(re)) {
        found.push({ line: i + 1, column: match.index, text: match[0], why });
      }
    }
  });
  // One entry per distinct text on a line (an email shows twice in a mailto link).
  const seen = new Set();
  return found
    .sort((a, b) => a.line - b.line || a.column - b.column)
    .filter(({ line, text }) => {
      const key = `${line}:${text.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ line, text, why }) => ({ line, text, why }));
}
