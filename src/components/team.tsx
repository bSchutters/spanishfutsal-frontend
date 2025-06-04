import { cn } from "@/lib/utils";
import Image from "next/image";

interface TeamProps {
  logoFirst?: boolean;
  isNextMatch?: boolean;
  isMatchPage?: boolean;
  logo: string;
  teamName: string;
  className?: string;
  isMobile?: boolean;
}

export default function Team({
  logoFirst,
  logo,
  teamName,
  className,
  isNextMatch,
  isMatchPage,
  isMobile,
}: TeamProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4",
        logoFirst ? "" : "justify-end",
        isMatchPage && isMobile ? "flex-col items-center" : "",
        className
      )}
    >
      <p
        className={cn(
          "font-bold max-w-1/2 text-end xl:text-xl lg:text-base text-sm lg:leading-4 leading-3 uppercase",
          logoFirst ? "order-2 text-start" : "text-end",
          isMatchPage && isMobile ? "max-w-full text-center" : ""
        )}
      >
        {teamName}
      </p>
      <div className="relative">
        <Image
          src={logo}
          alt="Logo"
          width={0}
          height={0}
          className={cn(
            isNextMatch ? "md:h-16 h-12" : "h-16",
            isMatchPage
              ? "xl:w-16 md:w-8 w-auto h-16 md:max-h-20"
              : "w-auto xl:h-20"
          )}
        />
      </div>
    </div>
  );
}
