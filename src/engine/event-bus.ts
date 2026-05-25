import type { GameEvent, GameEventType } from "../types/events.ts";

type EventHandler = (event: GameEvent) => void;

export class EventBus {
  private readonly handlers = new Map<GameEventType, EventHandler[]>();

  on<T extends GameEventType>(type: T, handler: (event: GameEvent<T>) => void): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as EventHandler);
    this.handlers.set(type, list);
  }

  emit(event: GameEvent): void {
    const handlers = this.handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      handler(event);
    }
  }
}
