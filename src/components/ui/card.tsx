import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-white text-black dark:bg-neutral-900 dark:text-white border-gray-200 dark:border-neutral-800",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export { Card };
