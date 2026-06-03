"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

function Collapsible({ ...props }: CollapsiblePrimitive.CollapsibleProps) {
  return <CollapsiblePrimitive.Root {...props} />
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.CollapsibleTriggerProps) {
  return <CollapsiblePrimitive.Trigger {...props} />
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.CollapsibleContentProps) {
  return <CollapsiblePrimitive.Content {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
