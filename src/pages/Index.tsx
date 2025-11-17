import { Header } from "@/components/Header";
import { MetricCard } from "@/components/MetricCard";
import { FilterPanel } from "@/components/FilterPanel";
import { TransactionChart } from "@/components/TransactionChart";
import { ChannelBreakdown } from "@/components/ChannelBreakdown";
import { RegionalTable } from "@/components/RegionalTable";
import { 
  ActivityIcon, 
  TrendingUpIcon, 
  DollarSignIcon, 
  UsersIcon 
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="mb-8">
          <FilterPanel />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Transactions"
            value="185K"
            change={8.2}
            subtitle="Current month"
            icon={<ActivityIcon className="w-6 h-6 text-accent" />}
          />
          <MetricCard
            title="Transaction Volume"
            value="$3.68B"
            change={12.5}
            subtitle="Current month"
            icon={<DollarSignIcon className="w-6 h-6 text-accent" />}
          />
          <MetricCard
            title="Avg Transaction"
            value="$19,892"
            change={3.7}
            subtitle="Per transaction"
            icon={<TrendingUpIcon className="w-6 h-6 text-accent" />}
          />
          <MetricCard
            title="Active Users"
            value="2.4M"
            change={-1.2}
            subtitle="Monthly active"
            icon={<UsersIcon className="w-6 h-6 text-accent" />}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TransactionChart />
          <ChannelBreakdown />
        </div>

        {/* Regional Table */}
        <div className="mb-8">
          <RegionalTable />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Operating Expenses"
            value="$45.2M"
            change={-2.8}
            subtitle="Current quarter"
          />
          <MetricCard
            title="Cost per Transaction"
            value="$2.44"
            change={-5.1}
            subtitle="Efficiency ratio"
          />
          <MetricCard
            title="Branch Utilization"
            value="78%"
            change={4.3}
            subtitle="Avg capacity"
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
