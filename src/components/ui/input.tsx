import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-spanish-accent placeholder:text-spanish-accent/50 selection:bg-spanish-accent selection:text-spanish-bg-dark dark:bg-input/30  flex h-9 w-full min-w-0 rounded-md bg-spanish-bg-light border-2 border-spanish-bg-lighter px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-spanish-bg-lighter focus-visible:ring-spanish-accent/50 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
