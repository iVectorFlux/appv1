/** Client-side text cleanup for spoken replies (mirrors api/_lib/groq-voice). */

export function textForSpeech(raw: string): string {
  let t = raw.trim();
  const jsonIdx = t.search(/\nSUGGESTION_JSON:\s*\{/i);
  if (jsonIdx >= 0) t = t.slice(0, jsonIdx).trim();
  t = t.replace(/\*\*(.+?)\*\*/g, '$1');
  t = t.replace(/\*(.+?)\*/g, '$1');
  t = t.replace(/^•\s+/gm, '');
  t = t.replace(/\n{2,}/g, '. ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export function chunkTextForDeviceSpeech(text: string, maxLen = 320): string[] {
  const cleaned = textForSpeech(text);
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const chunks: string[] = [];
  let rest = cleaned;
  while (rest.length > 0) {
    if (rest.length <= maxLen) {
      chunks.push(rest);
      break;
    }
    let slice = rest.slice(0, maxLen);
    const breakAt = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('! ')
    );
    if (breakAt > maxLen * 0.35) {
      slice = rest.slice(0, breakAt + 1).trim();
      rest = rest.slice(breakAt + 1).trim();
    } else {
      const space = slice.lastIndexOf(' ');
      slice = space > 40 ? rest.slice(0, space).trim() : rest.slice(0, maxLen);
      rest = space > 40 ? rest.slice(space + 1).trim() : rest.slice(maxLen).trim();
    }
    if (slice) chunks.push(slice);
  }
  return chunks;
}
