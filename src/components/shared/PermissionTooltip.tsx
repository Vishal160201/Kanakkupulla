"use client";

import type { ReactElement } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { NO_PERMISSION } from "@/hooks/useAccess";

/**
 * Explains a control the user isn't allowed to use. When `allowed` is false the child
 * (which the caller renders `disabled`) is wrapped in a focusable span, since disabled
 * buttons don't fire the pointer events the tooltip needs.
 */
export default function PermissionTooltip({
  allowed,
  children,
  className = "inline-flex",
}: {
  allowed: boolean;
  children: ReactElement;
  className?: string;
}) {
  if (allowed) return children;
  return (
    <Tooltip content={NO_PERMISSION}>
      <span tabIndex={0} className={`${className} cursor-not-allowed`}>
        {children}
      </span>
    </Tooltip>
  );
}
