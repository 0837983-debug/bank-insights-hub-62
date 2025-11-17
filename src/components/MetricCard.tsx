import { Card } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  icon?: React.ReactNode;
}

export const MetricCard = ({ 
  title, 
  value, 
  change, 
  trend = "neutral",
  subtitle,
  icon 
}: MetricCardProps) => {
  const isPositive = change > 0;
  const changeColor = isPositive ? "text-success" : "text-destructive";
  
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-foreground mb-2">{value}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
          )}
          <div className="flex items-center gap-1">
            {isPositive ? (
              <ArrowUpIcon className={cn("w-4 h-4", changeColor)} />
            ) : (
              <ArrowDownIcon className={cn("w-4 h-4", changeColor)} />
            )}
            <span className={cn("text-sm font-semibold", changeColor)}>
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">vs last period</span>
          </div>
        </div>
        {icon && (
          <div className="p-3 bg-accent/10 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
