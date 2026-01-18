import { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  headerContent?: ReactNode;
}

export const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
  headerContent,
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-muted rounded-md transition-colors"
          aria-label={isOpen ? "Свернуть раздел" : "Развернуть раздел"}
        >
          {isOpen ? (
            <ChevronDown className="h-6 w-6 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-6 w-6 text-muted-foreground" />
          )}
        </button>
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        {headerContent}
      </div>

      <div
        className={cn(
          "transition-all duration-300 overflow-hidden",
          isOpen ? "opacity-100 max-h-[10000px]" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </section>
  );
};
