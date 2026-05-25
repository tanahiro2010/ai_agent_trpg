import { resolve } from "node:path";

/** プロジェクトルートの .env を読み込む（Bun の自動読込の補完） */
export async function loadProjectEnv(): Promise<void> {
  const envPath = resolve(import.meta.dir, "../..", ".env");
  const file = Bun.file(envPath);
  if (!(await file.exists())) {
    return;
  }

  const text = await file.text();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}
