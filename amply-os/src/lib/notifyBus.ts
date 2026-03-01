// src/lib/notifyBus.ts
import { EventEmitter } from "events";

type GlobalWithBus = typeof globalThis & { __amplyNotifBus?: EventEmitter };

export function getNotifBus() {
  const g = globalThis as GlobalWithBus;

  if (!g.__amplyNotifBus) {
    g.__amplyNotifBus = new EventEmitter();
    g.__amplyNotifBus.setMaxListeners(100);
  }

  return g.__amplyNotifBus;
}
