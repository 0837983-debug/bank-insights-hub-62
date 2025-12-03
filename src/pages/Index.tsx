import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { ReportFilters } from "@/components/ReportFilters";
import { FinancialResultsSection } from "@/components/report/FinancialResultsSection";
import { ClientBaseSection } from "@/components/report/ClientBaseSection";

const placeholderSections = [
  "Продукты и коммерческая активность",
  "Транзакционная деятельность и конвертация",
  "Риски и комплаенс",
  "Нормативы и регуляторные показатели",
  "Забота о клиенте и качество сервиса",
  "Операционная деятельность",
  "ИТ и информационная безопасность",
];

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

        {/* Executive Summary - placeholder */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">Executive Summary</h2>
          <Card className="p-8">
            <p className="text-muted-foreground text-center">
              Раздел в разработке
            </p>
          </Card>
        </section>

        {/* Financial Results Section */}
        <FinancialResultsSection />

        {/* Client Base Section */}
        <ClientBaseSection />

        {/* Remaining placeholder sections */}
        {placeholderSections.map((section) => (
          <section key={section}>
            <h2 className="text-3xl font-bold text-foreground mb-6">{section}</h2>
            <Card className="p-8">
              <p className="text-muted-foreground text-center">
                Раздел в разработке
              </p>
            </Card>
          </section>
        ))}
      </main>
    </div>
  );
};

export default Index;
