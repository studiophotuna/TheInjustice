import { useEffect } from "react";

let locks = 0;

/** Stops the page behind a sheet or popup from scrolling while it's open. Nested locks stack. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    const html = document.documentElement;
    html.classList.add("scroll-locked");
    return () => {
      locks -= 1;
      if (locks <= 0) {
        locks = 0;
        html.classList.remove("scroll-locked");
      }
    };
  }, [active]);
}
