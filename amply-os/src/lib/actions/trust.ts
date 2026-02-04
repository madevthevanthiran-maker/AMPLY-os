// src/lib/actions/trust.ts
import type { Action } from "@/lib/actions/types";

export type TrustDecision = {
  shouldAutoRun: boolean;
  reason: string;
};

/**
 * Trust policy v1 (opinionated):
 * - "auto" actions execute immediately (once)
 * - certain types are always safe
 * - anything external (calendar/email) stays confirm by default
 */
const SAFE_AUTO_TYPES = new Set<Action["type"]>([
  "open_view",
  "create_checklist",
  "start_focus_block", // internal only for now
]);

export function decideTrust(action: Action): TrustDecision {
  // Explicit "auto" wins
  if (action.trust === "auto") {
    return { shouldAutoRun: true, reason: "Action marked auto" };
  }

  // Explicit "confirm" blocks
  if (action.trust === "confirm") {
    return { shouldAutoRun: false, reason: "Action requires confirmation" };
  }

  // Default: auto-run only safe internal types
  if (SAFE_AUTO_TYPES.has(action.type)) {
    return { shouldAutoRun: true, reason: "Safe internal action type" };
  }

  return { shouldAutoRun: false, reason: "Not in safe allowlist" };
}
