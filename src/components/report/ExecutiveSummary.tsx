import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { TrendingUpIcon, UsersIcon, DollarSignIcon, ActivityIcon } from "lucide-react";

export const ExecutiveSummary = () => {
  return (
    <section>
      <h2 className="text-3xl font-bold text-foreground mb-6">Executive Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Общий доход"
          value="₽42.5 млрд"
          change={12.3}
          subtitle="За отчётный период"
          icon={<DollarSignIcon className="w-6 h-6 text-accent" />}
        />
        
        <MetricCard
          title="Активные клиенты"
          value="2.4 млн"
          change={8.5}
          subtitle="MAU текущего периода"
          icon={<UsersIcon className="w-6 h-6 text-accent" />}
        />
        
        <MetricCard
          title="ROE"
          value="18.2%"
          change={3.1}
          subtitle="Рентабельность капитала"
          icon={<TrendingUpIcon className="w-6 h-6 text-accent" />}
        />
        
        <MetricCard
          title="Cost-to-Income"
          value="42.5%"
          change={-2.3}
          subtitle="Операционная эффективность"
          icon={<ActivityIcon className="w-6 h-6 text-accent" />}
        />
      </div>
    </section>
  );
};
