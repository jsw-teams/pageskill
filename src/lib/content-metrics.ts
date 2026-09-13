export type ContentMetrics = {
  words: number;
  cjkCharacters: number;
  totalUnits: number;
  readingMinutes: number;
};

export type ContentMetricsOptions = {
  wordsPerMinute?: number;
  cjkCharactersPerMinute?: number;
};

export const DEFAULT_CONTENT_METRICS_OPTIONS: Required<ContentMetricsOptions> = {
  wordsPerMinute: 220,
  cjkCharactersPerMinute: 400
};

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’.-][\p{L}\p{M}\p{N}]+)*/gu;
const URL = /(?:https?:\/\/|www\.)[^\s)\]>]+/giu;

function stripFencedCode(markdown: string): string {
  const lines = String(markdown || '').replaceAll('\r', '').split('\n');
  const kept: string[] = [];
  let fence: string | undefined;
  for (const line of lines) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      continue;
    }
    if (marker) {
      fence = marker[1];
      continue;
    }
    kept.push(line);
  }
  return kept.join('\n');
}

/** Calculate stable reading units from Markdown source, excluding code and
 * link destinations so examples do not dominate the article metadata. */
export function calculateContentMetrics(markdown: string, options: ContentMetricsOptions = {}): ContentMetrics {
  const wordsPerMinute = Number.isFinite(options.wordsPerMinute) && Number(options.wordsPerMinute) > 0 ? Number(options.wordsPerMinute) : DEFAULT_CONTENT_METRICS_OPTIONS.wordsPerMinute;
  const cjkCharactersPerMinute = Number.isFinite(options.cjkCharactersPerMinute) && Number(options.cjkCharactersPerMinute) > 0 ? Number(options.cjkCharactersPerMinute) : DEFAULT_CONTENT_METRICS_OPTIONS.cjkCharactersPerMinute;
  let text = stripFencedCode(markdown)
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!?(\[[^\]]*\])\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(URL, ' ')
    .replace(/(^|\n)\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/g, '$1 ')
    .replace(/[ *~]+/g, ' ');
  let cjkCharacters = 0;
  let remaining = '';
  for (const character of text) {
    if (CJK.test(character)) cjkCharacters += 1;
    else remaining += character;
  }
  const words = remaining.match(WORD)?.length || 0;
  const totalUnits = cjkCharacters + words;
  const readingMinutes = Math.max(1, Math.ceil(words / wordsPerMinute + cjkCharacters / cjkCharactersPerMinute));
  return { words, cjkCharacters, totalUnits, readingMinutes };
}
