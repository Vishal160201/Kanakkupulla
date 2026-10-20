"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

type TooltipSide = NonNullable<TooltipPrimitive.Positioner.Props["side"]>
type TooltipAlign = NonNullable<TooltipPrimitive.Positioner.Props["align"]>

interface TooltipProps {
  /** Tooltip text. When empty/undefined the child is rendered unchanged. */
  content?: React.ReactNode
  /** A single element that receives hover/focus handlers and a ref. */
  children: React.ReactElement
  side?: TooltipSide
  align?: TooltipAlign
  sideOffset?: number
  /** Open delay in ms. */
  delay?: number
  disabled?: boolean
  className?: string
}

/**
 * Accessible tooltip (hover + keyboard focus) rendered in a portal so it is
 * never clipped by overflow containers. Flips/shifts automatically when it
 * would collide with the viewport edge.
 *
 * The tooltip is supplementary: icon-only triggers must still carry an
 * `aria-label`. Disabled buttons don't emit pointer events in every browser,
 * so wrap them in a `<span>` when the tooltip explains why they're disabled.
 */
function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
  delay = 150,
  disabled,
  className,
}: TooltipProps) {
  if (content === undefined || content === null || content === false || content === "") {
    return children
  }

  return (
    <TooltipPrimitive.Root disabled={disabled}>
      <TooltipPrimitive.Trigger
        data-slot="tooltip-trigger"
        delay={delay}
        closeDelay={0}
        render={children}
      />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={8}
          className="isolate z-[300]"
        >
          <TooltipPrimitive.Popup
            data-slot="tooltip-content"
            className={cn(
              "relative max-w-[260px] origin-[var(--transform-origin)] rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11.5px] font-semibold leading-snug text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10",
              "transition-[opacity,transform] duration-150 ease-out",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[instant]:transition-none",
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow
              className={cn(
                "size-2 rotate-45 rounded-[2px] bg-slate-900",
                "data-[side=top]:-bottom-1 data-[side=bottom]:-top-1 data-[side=left]:-right-1 data-[side=right]:-left-1"
              )}
            />
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export { Tooltip }
export type { TooltipProps }
