export type UserMode = "student" | "freelancer" | "creator";

export function getStoredMode(): UserMode {
  if (typeof window === "undefined") return "student";
  return (localStorage.getItem("mode") as UserMode) ?? "student";
}

export function setStoredMode(mode: UserMode) {
  localStorage.setItem("mode", mode);
}
