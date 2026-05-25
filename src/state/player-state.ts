export type PlayerState = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  san: number;
  maxSan: number;
  skills: Record<string, number>;
};

export function createDefaultPlayer(
  id: string,
  name: string,
  skills: Record<string, number> = {},
): PlayerState {
  return {
    id,
    name,
    hp: 12,
    maxHp: 12,
    san: 60,
    maxSan: 99,
    skills: {
      spot_hidden: 50,
      library_use: 40,
      listen: 45,
      persuade: 55,
      ...skills,
    },
  };
}
