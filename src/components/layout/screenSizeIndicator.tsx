"use client";

import { useEffect, useState } from "react";

const getTailwindBreakpoint = (width: number): string => {
  if (width < 640) return "xs";
  if (width < 768) return "sm";
  if (width < 1024) return "md";
  if (width < 1280) return "lg";
  if (width < 1536) return "xl";
  return "2xl";
};

const ScreenSizeIndicator = () => {
  const [breakpoint, setBreakpoint] = useState("xs");

  useEffect(() => {
    const updateBreakpoint = () => {
      setBreakpoint(getTailwindBreakpoint(window.innerWidth));
    };

    window.addEventListener("resize", updateBreakpoint);
    updateBreakpoint(); // initial

    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-black text-white text-xs font-mono p-2 font-bold rounded-full z-50">
      {breakpoint}
    </div>
  );
};

export default ScreenSizeIndicator;
