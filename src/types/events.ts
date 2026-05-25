export type GameEventType =
  | "PLAYER_ACTION"
  | "DICE_ROLLED"
  | "SAN_CHANGED"
  | "EVENT_TRIGGERED"
  | "LOCATION_CHANGED"
  | "TURN_STARTED"
  | "TURN_ENDED"
  | "GM_NARRATION"
  | "STATE_UPDATED";

export type GameEventPayload = {
  PLAYER_ACTION: { playerId: string; actionType: string };
  DICE_ROLLED: { roll: number; target: number; success: boolean; critical: boolean; fumble: boolean };
  SAN_CHANGED: { playerId: string; delta: number; newSan: number };
  EVENT_TRIGGERED: { eventId: string };
  LOCATION_CHANGED: { playerId: string; location: string };
  TURN_STARTED: { turn: number };
  TURN_ENDED: { turn: number };
  GM_NARRATION: { text: string };
  STATE_UPDATED: { summary: string };
};

export type GameEvent<T extends GameEventType = GameEventType> = {
  type: T;
  turn: number;
  timestamp: number;
  payload: T extends keyof GameEventPayload ? GameEventPayload[T] : Record<string, never>;
};
