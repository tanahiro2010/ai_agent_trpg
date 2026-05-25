export type NPCState = {
  id: string;
  name: string;
  location: string;
  disposition: "friendly" | "neutral" | "hostile";
};

export function createNPC(
  id: string,
  name: string,
  location: string,
): NPCState {
  return {
    id,
    name,
    location,
    disposition: "neutral",
  };
}
