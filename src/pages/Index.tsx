import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";

const sections = [
  "Executive Summary",
  "Финансовые результаты и баланс",
  "Клиентская база и сегменты",
  "Продукты и коммерческая активность",
  "Транзакционная деятельность и конвертация",
  "Риски и комплаенс",
  "Нормативы и регуляторные показатели",
  "Забота о клиенте и качество сервиса",
  "Операционная деятельность",
  "ИТ и информационная безопасность",
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-12">
        {sections.map((section) => (
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
