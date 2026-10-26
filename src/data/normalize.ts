/** 検索用の正規化:NFKC、カタカナ→ひらがな、空白除去、小文字。NFKC で「㎜」は「mm」になる。 */
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '')
    .toLowerCase();
}
