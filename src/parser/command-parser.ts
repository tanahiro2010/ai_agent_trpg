import { playerActionSchema } from "../protocols/action.ts";
import type { PlayerAction } from "../types/actions.ts";
import { log } from "../utils/logger.ts";
import { validateWithSchema } from "../utils/validation.ts";

const ACTION_BLOCK_REGEX = /\[action\]([\s\S]*?)\[\/action\]/i;

export function extractActionBlock(text: string): string | null {
  const match = text.match(ACTION_BLOCK_REGEX);
  return match?.[1]?.trim() ?? null;
}

export function parseKeyValueBlock(block: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function repairActionRecord(
  record: Record<string, string>,
): Record<string, string> {
  const repaired = { ...record };
  if (!repaired.type && repaired.action) {
    repaired.type = repaired.action;
  }
  if (repaired.type === "investigate") {
    repaired.type = "skill_check";
    if (!repaired.skill) repaired.skill = "spot_hidden";
  }
  return repaired;
}

function recordToActionPayload(
  record: Record<string, string>,
): Record<string, string> | null {
  const type = record.type;
  if (!type) return null;

  switch (type) {
    case "skill_check":
      return {
        type,
        skill: record.skill ?? "spot_hidden",
        target: record.target ?? "unknown",
        reason: record.reason ?? "調査する",
      };
    case "speak":
      return {
        type,
        target: record.target ?? "npc",
        message: record.message ?? record.reason ?? "...",
        reason: record.reason ?? "会話する",
      };
    case "move":
      return {
        type,
        location: record.location ?? record.target ?? "unknown",
        reason: record.reason ?? "移動する",
      };
    case "wait":
      return {
        type,
        reason: record.reason ?? "様子を見る",
      };
    default:
      return null;
  }
}

export function parseActionFromText(text: string): PlayerAction | null {
  const block = extractActionBlock(text);
  if (!block) {
    log("parser", "no action block found", { textPreview: text.slice(0, 200) }, "warn");
    return null;
  }

  const record = repairActionRecord(parseKeyValueBlock(block));
  const payload = recordToActionPayload(record);
  if (!payload) {
    log("parser", "unknown action type", { record }, "warn");
    return null;
  }

  const validated = validateWithSchema(playerActionSchema, payload, "parser");
  if (!validated.ok) return null;
  return validated.data;
}

export function parseAndValidateAction(
  text: string,
  options?: { repair?: boolean },
): PlayerAction | null {
  let action = parseActionFromText(text);
  if (action) return action;

  if (options?.repair !== false) {
    const wrapped = `[action]\n${text.trim()}\n[/action]`;
    action = parseActionFromText(wrapped);
    if (action) {
      log("parser", "action repaired via wrap", { action });
      return action;
    }
  }

  return null;
}
