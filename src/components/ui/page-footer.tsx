"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A bar pinned to the bottom of the viewport across the whole content panel (wizard Back / Next).
 * It renders into the #page-footer slot in the shell, outside the page's max-width column, so it spans the panel
 * edge to edge on any screen and its contents line up with the page's own column.
 */
export function PageFooter({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlot(document.getElementById("page-footer"));
  }, []);
  if (!slot) return null;
  return createPortal(<div className="border-t border-line bg-card/95 backdrop-blur"><div className="column py-4">{children}</div></div>, slot);
}
