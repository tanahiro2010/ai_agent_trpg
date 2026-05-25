export type ActionType = "skill_check" | "speak" | "move" | "wait";

export type SkillCheckAction = {
  type: "skill_check";
  skill: string;
  target: string;
  reason: string;
};

export type SpeakAction = {
  type: "speak";
  target: string;
  message: string;
  reason: string;
};

export type MoveAction = {
  type: "move";
  location: string;
  reason: string;
};

export type WaitAction = {
  type: "wait";
  reason: string;
};

export type PlayerAction =
  | SkillCheckAction
  | SpeakAction
  | MoveAction
  | WaitAction;
