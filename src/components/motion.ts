// Whether to hold back animation. By default the game follows the device's "Reduce Motion"
// setting; a player can choose "Always animate" on Me (stored on this device only).

export const MOTION_KEY = "cns_motion";

export function motionChoice(): "auto" | "on" {
  try {
    return localStorage.getItem(MOTION_KEY) === "on" ? "on" : "auto";
  } catch {
    return "auto";
  }
}

/** True when animations should stay still. */
export function motionReduced(): boolean {
  if (typeof window === "undefined") return false;
  if (motionChoice() === "on") return false;
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Applies the choice to the page (CSS reads the class on <html>). */
export function applyMotion(choice = motionChoice()) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("motion-on", choice === "on");
}

export function setMotion(choice: "auto" | "on") {
  try {
    if (choice === "on") localStorage.setItem(MOTION_KEY, "on");
    else localStorage.removeItem(MOTION_KEY);
  } catch {
    /* storage blocked */
  }
  applyMotion(choice);
  // Effects that already decided to stay still pick it up on the next page load.
}
