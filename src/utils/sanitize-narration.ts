/** GM出力からメタ表記・PL代弁の典型パターンを軽く除去 */
export function sanitizeGmNarration(text: string): string {
  let result = text.trim();
  result = result.replace(/\[T\d+\s*GM\]\s*/gi, "");
  result = result.replace(/^探索者たち/g, "あなた");
  result = result.replace(/探索者たち/g, "あなた");
  result = result.replace(/探索者の一人/g, "あなた");
  return result.trim();
}
