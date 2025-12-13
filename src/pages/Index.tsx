import { useState } from "react";
import { Header } from "@/components/Header";
import { ReportFilters } from "@/components/ReportFilters";
import { ExecutiveSummary } from "@/components/report/ExecutiveSummary";
import { FinancialResultsSection } from "@/components/report/FinancialResultsSection";
import { BalanceSection } from "@/components/report/BalanceSection";
import { ClientBaseSection } from "@/components/report/ClientBaseSection";
import { Conversion } from "@/components/report/Conversion";

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

        {/* Executive Summary */}
        <ExecutiveSummary />

        {/* Financial Results Section */}
        <FinancialResultsSection />

        {/* Balance Section */}
        <BalanceSection />

        {/* Client Base Section */}
        <ClientBaseSection />

        {/* Conversion Section */}
        <Conversion />
      </main>
    </div>
  );
};

export default Index;
