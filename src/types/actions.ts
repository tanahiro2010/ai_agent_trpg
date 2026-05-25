export type ActionType = "skill_check" | "speak" | "move" | "wait";

export type BranchSelection = {
  branchId?: string;
};

export type SkillCheckAction = {
  type: "skill_check";
  skill: string;
  target: string;
  reason: string;
} & BranchSelection;

export type SpeakAction = {
  type: "speak";
  target: string;
  message: string;
  reason: string;
} & BranchSelection;

export type MoveAction = {
  type: "move";
  location: string;
  reason: string;
} & BranchSelection;

export type WaitAction = {
  type: "wait";
  reason: string;
} & BranchSelection;

export type PlayerAction =
  | SkillCheckAction
  | SpeakAction
  | MoveAction
  | WaitAction;
