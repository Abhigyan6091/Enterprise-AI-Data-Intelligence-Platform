"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

function TooltipProvider({ ...props }: TooltipPrimitive.TooltipProviderProps) {
  return <TooltipPrimitive.Provider {...props} />
}

function Tooltip({ ...props }: TooltipPrimitive.TooltipProps) {
  return <TooltipPrimitive.Root {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger {...props} />
}

function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: TooltipPrimitive.TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
