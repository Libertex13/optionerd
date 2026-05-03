import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  mobileFlat = false,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm"; mobileFlat?: boolean }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-mobile-flat={mobileFlat ? "true" : undefined}
      className={cn(
        "group/card flex flex-col gap-3 rounded-md border border-border bg-card py-3 text-sm text-card-foreground has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-2 data-[size=sm]:py-2 data-[size=sm]:has-data-[slot=card-footer]:pb-0 max-md:data-[mobile-flat=true]:rounded-none max-md:data-[mobile-flat=true]:border-0 max-md:data-[mobile-flat=true]:bg-transparent max-md:data-[mobile-flat=true]:py-0",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-0.5 px-3 group-data-[size=sm]/card:px-2.5 max-md:group-data-[mobile-flat=true]/card:px-0 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-3 group-data-[size=sm]/card:[.border-b]:pb-2",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-sm leading-snug font-semibold group-data-[size=sm]/card:text-xs",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-3 group-data-[size=sm]/card:px-2.5 max-md:group-data-[mobile-flat=true]/card:px-0",
        className,
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
