import { ArrowUpIcon, ArrowDownIcon, ArrowUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortDirection } from "@/hooks/use-table-sort";

interface SortableHeaderProps {
  label: string;
  column: string;
  currentColumn: string | null;
  direction: SortDirection;
  onSort: (column: string) => void;
  className?: string;
}

export const SortableHeader = ({
  label,
  column,
  currentColumn,
  direction,
  onSort,
  className,
}: SortableHeaderProps) => {
  const isActive = currentColumn === column;

  return (
    <button
      onClick={() => onSort(column)}
      className={cn(
        "flex items-center gap-1 hover:text-foreground transition-colors group",
        isActive ? "text-foreground" : "text-muted-foreground",
        className
      )}
    >
      <span>{label}</span>
      {isActive && direction === "asc" && (
        <ArrowUpIcon className="w-3.5 h-3.5" />
      )}
      {isActive && direction === "desc" && (
        <ArrowDownIcon className="w-3.5 h-3.5" />
      )}
      {!isActive && (
        <ArrowUpDownIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </button>
  );
};
