import type { KeyboardEvent } from "react";

/**
 * Props that make a non-button element (a whole card / row whose content is block-level or contains
 * other controls, so it can't become a <button>) keyboard-operable like a button.
 * Enter/Space only activate when the element itself is focused, not a nested control.
 */
export function clickableProps(onActivate: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
