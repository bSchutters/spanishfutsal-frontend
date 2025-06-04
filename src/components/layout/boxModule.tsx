import { cn } from "@/lib/utils";
import React from "react";

export default function BoxModule({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-spanish-bg-dark p-4 border-2 border-spanish-bg-lighter",
        className
      )}
    >
      {children}
    </div>
  );
}
