"use client"

import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"

function Avatar({ className, ...props }: AvatarPrimitive.AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.AvatarImageProps) {
  return (
    <AvatarPrimitive.Image
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      className={cn("flex size-full items-center justify-center rounded-full bg-muted text-xs font-medium", className)}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
