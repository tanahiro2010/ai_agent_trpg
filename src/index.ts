import { runStoryReplay } from "./cli/story-replay.ts";
import { loadProjectEnv } from "./config/env.ts";
import { GameEngine } from "./engine/game-engine.ts";
import { createCohereProviderFromEnvStrict } from "./llm/cohere-provider.ts";
import { MockLLMProvider, TEST_SCENARIO_SCRIPT } from "./llm/mock-provider.ts";
import type { LLMProvider } from "./llm/types.ts";
import { loadScenarioTxt } from "./scenario/loader.ts";
import {
  getLogFilePath,
  initLogger,
  log,
  logSessionEnd,
  logSessionStart,
} from "./utils/logger.ts";

function parseArgs(argv: string[]): {
  scenarioPath: string;
  useMock: boolean;
  maxTurns: number;
  includeRaw: boolean;
  storyLogPath: string | null;
} {
  let scenarioPath = "scenarios/sample.txt";
  let useMock = true;
  let maxTurns = 4;
  let includeRaw = false;
  let storyLogPath: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--scenario" && argv[i + 1]) {
      scenarioPath = argv[++i] ?? scenarioPath;
    } else if (arg === "--mock") {
      useMock = true;
    } else if (arg === "--cohere") {
      useMock = false;
    } else if (arg === "--include-raw") {
      includeRaw = true;
    } else if (arg === "--story" && argv[i + 1]) {
      storyLogPath = argv[++i] ?? null;
    } else if (arg === "--turns" && argv[i + 1]) {
      maxTurns = Number.parseInt(argv[++i] ?? "4", 10);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: bun run src/index.ts [options]

Play mode:
  --scenario <path>    Scenario txt path (default: scenarios/sample.txt)
  --mock               Use mock LLM (default)
  --cohere             Use Cohere API (requires COHERE_API_KEY in .env)
  --turns <n>          Max turns (default: 4)
  --include-raw        Also print raw AI / parser / API logs to console

Story replay (no API, read log only):
  --story <log.jsonl>  Render session as player-friendly narrative

  -h, --help           Show help

Logging:
  All events (including raw AI responses) are always saved under logs/.
  Without --include-raw, console shows only: GM, PL, dice, scenario progress.

Environment (.env):
  COHERE_API_KEY       Required when using --cohere
  COHERE_MODEL         Optional (default: command-r-plus-08-2024)
  COHERE_MAX_TOKENS    Optional (default: 2048)
`);
      process.exit(0);
    }
  }

  return { scenarioPath, useMock, maxTurns, includeRaw, storyLogPath };
}

function createLLMProvider(useMock: boolean, scenarioPath: string): LLMProvider {
  if (useMock) {
    const isTestScenario = scenarioPath.includes("test.txt");
    return new MockLLMProvider(
      isTestScenario ? TEST_SCENARIO_SCRIPT : undefined,
    );
  }
  return createCohereProviderFromEnvStrict();
}

async function main(): Promise<void> {
  const { scenarioPath, useMock, maxTurns, includeRaw, storyLogPath } = parseArgs(
    process.argv.slice(2),
  );

  if (storyLogPath) {
    await runStoryReplay(storyLogPath);
    return;
  }

  await loadProjectEnv();

  const logPath = await initLogger({ includeRawConsole: includeRaw });

  log("cli", "session initializing", { scenarioPath, useMock, maxTurns, includeRaw, logPath });

  const scenario = await loadScenarioTxt(scenarioPath);
  const llm = createLLMProvider(useMock, scenarioPath);

  logSessionStart(scenario.title, llm.name);

  const engine = new GameEngine({
    scenario,
    llm,
    maxTurns,
  });

  await engine.runSession();

  logSessionEnd(getLogFilePath() ?? logPath);
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
