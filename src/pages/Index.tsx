import { useState } from "react";
import { Header } from "@/components/Header";
import { ReportFilters } from "@/components/ReportFilters";
import { BalanceSection } from "@/components/report/BalanceSection";

const Index = () => {
  const [period, setPeriod] = useState("month");
  const [comparison, setComparison] = useState("prev-period");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-12">
        {/* Report-level Filters */}
        <ReportFilters
          period={period}
          comparison={comparison}
          onPeriodChange={setPeriod}
          onComparisonChange={setComparison}
        />

        {/* Balance Section */}
        <BalanceSection />
      </main>
    </div>
  );
};

export default Index;
