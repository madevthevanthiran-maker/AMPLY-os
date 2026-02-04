// lib/actions/registry.ts
// Executor registry for AMPlyAI actions.
// Goal: keep integrations as adapters (stateless) and core logic clean.

import type {
  Action,
  ActionExecutionContext,
  ActionResult,
  ActionType,
} from "./types";

export type ActionExecutor<T extends ActionType = ActionType> = {
  type: T;
  /**
   * Execute the action. Must NEVER throw.
   * Return ActionResult with ok=false on failure.
   */
  execute: (action: Action<T>, ctx: ActionExecutionContext) => Promise<ActionResult>;
  /**
   * Optional validation. Return a string describing the problem, or null if valid.
   * Keep it cheap.
   */
  validate?: (action: Action<T>) => string | null;
};

const executors = new Map<ActionType, ActionExecutor<any>>();

/**
 * Register (or overwrite) an executor for an action type.
 */
export function registerActionExecutor<T extends ActionType>(
  executor: ActionExecutor<T>
) {
  executors.set(executor.type, executor);
}

/**
 * Get an executor for an action type.
 */
export function getActionExecutor<T extends ActionType>(
  type: T
): ActionExecutor<T> | null {
  return (executors.get(type) as ActionExecutor<T> | undefined) ?? null;
}

/**
 * For debugging / health checks.
 */
export function listActionExecutors(): ActionType[] {
  return Array.from(executors.keys());
}

/**
 * Convenience: register many at once.
 */
export function registerActionExecutors(list: Array<ActionExecutor<any>>) {
  for (const ex of list) registerActionExecutor(ex);
}
