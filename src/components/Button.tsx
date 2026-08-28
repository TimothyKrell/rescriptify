import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";
import { cn } from "../lib";

const variants = cva("inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60", {
  variants: {
    variant: {
      default: "bg-lime-300 text-neutral-950 hover:bg-lime-200",
      secondary: "border border-white/10 bg-white/[.06] text-white hover:bg-white/10",
      ghost: "text-neutral-400 hover:bg-white/[.06] hover:text-white",
      danger: "bg-red-500/15 text-red-300 hover:bg-red-500/25",
    },
    size: { default: "h-10 px-4", sm: "h-8 px-3 text-xs", icon: "size-9 p-0" },
  }, defaultVariants: { variant: "default", size: "default" },
});

export function Button({ className, variant, size, asChild, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant, size }), className)} {...props} />;
}
