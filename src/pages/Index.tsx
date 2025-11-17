import { Header } from "@/components/Header";
import { FilterPanel } from "@/components/FilterPanel";
import { FinancialMetrics } from "@/components/FinancialMetrics";
import { TransactionMetrics } from "@/components/TransactionMetrics";
import { TechnologyMetrics } from "@/components/TechnologyMetrics";
import { RiskMetrics } from "@/components/RiskMetrics";
import { StrategyMetrics } from "@/components/StrategyMetrics";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="mb-8">
          <FilterPanel />
        </div>

        {/* Section 1: Financial Metrics */}
        <div className="mb-12">
          <FinancialMetrics />
        </div>

        {/* Section 2: Transaction Metrics */}
        <div className="mb-12">
          <TransactionMetrics />
        </div>

        {/* Section 3: Technology Metrics */}
        <div className="mb-12">
          <TechnologyMetrics />
        </div>

        {/* Section 4: Risk Metrics */}
        <div className="mb-12">
          <RiskMetrics />
        </div>

        {/* Section 5: Strategy Metrics */}
        <div className="mb-12">
          <StrategyMetrics />
        </div>
      </main>
    </div>
  );
};

export default Index;
