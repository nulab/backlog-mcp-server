export function countTokens(text: string): number {
  const normalized = text
    .replace(/\s+/g, ' ')
    .replace(/[\n\t]/g, ' ')
    .trim();

  const tokens = normalized.match(/\w+|[^\s\w]/g);

  return tokens ? tokens.length : 0;
}
