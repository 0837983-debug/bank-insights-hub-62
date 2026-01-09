import { Card } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  description: string;
  change?: number;
  ytdChange?: number;
  showChange?: boolean;
  icon?: React.ReactNode;
}

export const KPICard = ({
  title,
  value,
  description,
  change,
  ytdChange,
  showChange = false,
  icon,
}: KPICardProps) => {
  const isPositive = change !== undefined && change > 0;
  const isYtdPositive = ytdChange !== undefined && ytdChange > 0;
  const changeColor = isPositive ? "text-success" : "text-destructive";
  const ytdChangeColor = isYtdPositive ? "text-success" : "text-destructive";

  return (
    <Card className="p-3 hover:shadow-lg transition-shadow min-w-0">
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-3 h-3 text-muted-foreground/60 cursor-help flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <h3 className="text-xl font-bold text-foreground">{value}</h3>
          {showChange && change !== undefined && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5 cursor-help">
                      {isPositive ? (
                        <ArrowUpIcon className={cn("w-3 h-3", changeColor)} />
                      ) : (
                        <ArrowDownIcon className={cn("w-3 h-3", changeColor)} />
                      )}
                      <span className={cn("text-xs font-semibold", changeColor)}>
                        {Math.abs(change)}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">PPTD — изменение к предыдущему периоду</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {ytdChange !== undefined && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn("text-xs cursor-help", ytdChangeColor)}>
                        ({isYtdPositive ? "↑" : "↓"}
                        {Math.abs(ytdChange)}%)
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">YTD — изменение с начала года</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
        {icon && <div className="p-2 bg-accent/10 rounded-lg flex-shrink-0">{icon}</div>}
      </div>
    </Card>
  );
};
