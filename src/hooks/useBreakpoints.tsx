import { useEffect, useState } from "react";

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

type Breakpoint = keyof typeof breakpoints;

export default function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      if (width >= breakpoints["2xl"]) setBreakpoint("2xl");
      else if (width >= breakpoints.xl) setBreakpoint("xl");
      else if (width >= breakpoints.lg) setBreakpoint("lg");
      else if (width >= breakpoints.md) setBreakpoint("md");
      else if (width >= breakpoints.sm) setBreakpoint("sm");
      else setBreakpoint(null);

      setIsMobile(width < breakpoints.md); // mobile = moins de 768px
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { breakpoint, isMobile };
}
