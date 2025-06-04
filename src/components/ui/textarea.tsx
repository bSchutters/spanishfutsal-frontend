import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-spanish-accent/50 focus-visible:border-spanish-bg-lighter focus-visible:ring-spanish-accent/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 border-2 border-spanish-bg-lighter aria-invalid:border-destructive  flex field-sizing-content min-h-16 w-full rounded-md  bg-spanish-bg-light px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none  disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
