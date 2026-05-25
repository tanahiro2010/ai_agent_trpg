export type TranscriptRole = "gm" | "pl";

export type TranscriptEntry = {
  turn: number;
  role: TranscriptRole;
  content: string;
};

export class SessionTranscript {
  private readonly entries: TranscriptEntry[] = [];

  append(entry: TranscriptEntry): void {
    this.entries.push(entry);
  }

  getRecent(maxEntries = 8): readonly TranscriptEntry[] {
    return this.entries.slice(-maxEntries);
  }

  formatForPrompt(maxEntries = 6): string {
    const recent = this.getRecent(maxEntries);
    if (recent.length === 0) {
      return "（まだ会話履歴なし）";
    }
    return recent
      .map((e) => `[T${e.turn} ${e.role === "gm" ? "GM" : "PL"}] ${e.content}`)
      .join("\n\n");
  }
}
