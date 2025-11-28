import { Header } from "@/components/Header";
import { ExecutiveSummary } from "@/components/report/ExecutiveSummary";
import { FinancialResults } from "@/components/report/FinancialResults";
import { ClientBase } from "@/components/report/ClientBase";
import { Products } from "@/components/report/Products";
import { Transactions } from "@/components/report/Transactions";
import { Risks } from "@/components/report/Risks";
import { Regulations } from "@/components/report/Regulations";
import { CustomerCare } from "@/components/report/CustomerCare";
import { Operations } from "@/components/report/Operations";
import { ITSecurity } from "@/components/report/ITSecurity";

const Report = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Section 1: Executive Summary */}
        <div className="mb-12" id="executive-summary">
          <ExecutiveSummary />
        </div>

        {/* Section 2: Financial Results and Balance */}
        <div className="mb-12" id="financial-results">
          <FinancialResults />
        </div>

        {/* Section 3: Client Base and Segments */}
        <div className="mb-12" id="client-base">
          <ClientBase />
        </div>

        {/* Section 4: Products and Commercial Activity */}
        <div className="mb-12" id="products">
          <Products />
        </div>

        {/* Section 5: Transaction Activity and Conversion */}
        <div className="mb-12" id="transactions">
          <Transactions />
        </div>

        {/* Section 6: Risks and Compliance */}
        <div className="mb-12" id="risks">
          <Risks />
        </div>

        {/* Section 7: Regulations and Regulatory Indicators */}
        <div className="mb-12" id="regulations">
          <Regulations />
        </div>

        {/* Section 8: Customer Care and Service Quality */}
        <div className="mb-12" id="customer-care">
          <CustomerCare />
        </div>

        {/* Section 9: Operational Activity */}
        <div className="mb-12" id="operations">
          <Operations />
        </div>

        {/* Section 10: IT and Information Security */}
        <div className="mb-12" id="it-security">
          <ITSecurity />
        </div>
      </main>
    </div>
  );
};

export default Report;
