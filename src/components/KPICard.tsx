import { Card } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  description: string;
  change?: number;
  showChange?: boolean;
  icon?: React.ReactNode;
}

export const KPICard = ({
  title,
  value,
  subtitle,
  description,
  change,
  showChange = false,
  icon,
}: KPICardProps) => {
  const isPositive = change !== undefined && change > 0;
  const changeColor = isPositive ? "text-success" : "text-destructive";

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <h3 className="text-3xl font-bold text-foreground mb-2">{value}</h3>
          <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
          {showChange && change !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <ArrowUpIcon className={cn("w-4 h-4", changeColor)} />
              ) : (
                <ArrowDownIcon className={cn("w-4 h-4", changeColor)} />
              )}
              <span className={cn("text-sm font-semibold", changeColor)}>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                vs пред. период
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-accent/10 rounded-lg">{icon}</div>
        )}
      </div>
    </Card>
  );
};
