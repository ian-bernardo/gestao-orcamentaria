"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "./utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root> & {
  content?: React.ReactNode;
  side?: React.ComponentProps<typeof TooltipPrimitive.Content>["side"];
  align?: React.ComponentProps<typeof TooltipPrimitive.Content>["align"];
  variant?: "dark" | "light" | "light-accent";
};

function Tooltip({
  content,
  side = "top",
  align = "center",
  variant = "dark",
  children,
  ...props
}: TooltipProps) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props}>
        {content ? (
          <>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side={side} align={align} variant={variant}>
              {content}
            </TooltipContent>
          </>
        ) : (
          children
        )}
      </TooltipPrimitive.Root>
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 8,
  variant = "dark",
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  variant?: "dark" | "light" | "light-accent";
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-w-[240px] whitespace-normal rounded-lg px-3 py-2.5 text-xs",
          variant === "dark" && "bg-gray-900 text-white shadow-md",
          variant === "light" && "bg-white text-slate-700 border border-slate-200 shadow-lg",
          variant === "light-accent" && "bg-white text-slate-700 border border-slate-200 border-l-[3px] border-l-[#0066A1] shadow-lg",
          className,
        )}
        {...props}
      >
        {children}
        {variant !== "light-accent" && (
          <TooltipPrimitive.Arrow
            className={cn(
              "z-50 h-2.5 w-2.5",
              variant === "light" ? "fill-white" : "fill-gray-900",
            )}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
