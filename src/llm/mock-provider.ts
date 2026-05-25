import type { LLMProvider, LLMRequest, LLMResponse } from "./types.ts";

type MockScript = {
  gm: string[];
  pl: string[];
};

const DEFAULT_SCRIPT: MockScript = {
  gm: [
    `雨音が窓を叩く。古書店「夜鶴堂」の扉を開くと、煤と古い紙の香りが鼻をつく。
薄暗い店内。奥のカウンターに白髪の店主が座り、静かにこちらを見ている。
「いらっしゃい。……雨の夜に来る者は、何かを探しているのだろう？」`,
    `あなたは本棚の隙間に、埃をかぶった背表紙を見つける。
手を伸ばすと、紙の束がわずかに動く——何かが挟まっているようだ。`,
    `封筒の角をめくると、走り書きの文字が浮かび上がる。
「もしこの手紙を読む者がいるなら——」
店主が息を呑む。雨の音だけが店内に響く。`,
    `調査は一区切りついた。店主は黙って頷き、灯りを少し上げた。
「……続きは、また雨の夜にでも。」`,
  ],
  pl: [
    `[action]
type: skill_check
skill: spot_hidden
target: bookshelf
reason: 奥の書棚に隠されたものがないか調べる
[/action]`,
    `[action]
type: skill_check
skill: library_use
target: envelope
reason: カウンター上の封筒の内容を調べる
[/action]`,
    `[action]
type: speak
target: 店主・佐藤
message: この手紙について、何か知っていますか？
reason: 店主の反応を探る
[/action]`,
    `[action]
type: wait
reason: 一旦状況を整理する
[/action]`,
  ],
};

export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";
  private gmIndex = 0;
  private plIndex = 0;

  constructor(private readonly script: MockScript = DEFAULT_SCRIPT) {}

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (request.agent === "gm") {
      const lines = this.script.gm;
      const index = Math.min(this.gmIndex, lines.length - 1);
      this.gmIndex += 1;
      const text = lines[index] ?? "";
      return { text, raw: text };
    }

    const lines = this.script.pl;
    const index = Math.min(this.plIndex, lines.length - 1);
    this.plIndex += 1;
    const text = lines[index] ?? "";
    return { text, raw: text };
  }

  reset(): void {
    this.gmIndex = 0;
    this.plIndex = 0;
  }
}
