import { KPICard } from "@/components/KPICard";
import { FinancialTable, TableRowData } from "@/components/FinancialTable";
import { CollapsibleSection } from "@/components/report/CollapsibleSection";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";

const ComponentsShowcase = () => {
  // Тестовые данные для KPICard
  const kpiCardData = {
    title: "Выручка",
    value: "₽125.4M",
    description: "Общая выручка за отчетный период",
    change: 12.5,
    ytdChange: 8.3,
    showChange: true,
  };

  // Тестовые данные для FinancialTable
  const tableData: TableRowData[] = [
    {
      id: "revenue",
      name: "Доходы",
      value: 125400000,
      percentage: 100,
      change: 12.5,
      changeYtd: 8.3,
      isGroup: true,
      description: "Общие доходы компании",
    },
    {
      id: "revenue-services",
      name: "Услуги",
      value: 85000000,
      percentage: 67.8,
      change: 15.2,
      changeYtd: 10.1,
      parentId: "revenue",
    },
    {
      id: "revenue-services-consulting",
      name: "Консалтинг",
      value: 45000000,
      percentage: 52.9,
      change: 18.5,
      changeYtd: 12.3,
      parentId: "revenue-services",
    },
    {
      id: "revenue-services-development",
      name: "Разработка",
      value: 40000000,
      percentage: 47.1,
      change: 11.8,
      changeYtd: 7.9,
      parentId: "revenue-services",
    },
    {
      id: "revenue-products",
      name: "Продукты",
      value: 30400000,
      percentage: 24.2,
      change: 8.7,
      changeYtd: 5.2,
      parentId: "revenue",
    },
    {
      id: "revenue-other",
      name: "Прочее",
      value: 10000000,
      percentage: 8.0,
      change: 2.1,
      changeYtd: -1.5,
      parentId: "revenue",
    },
    {
      id: "total",
      name: "ИТОГО",
      value: 125400000,
      percentage: 100,
      change: 12.5,
      changeYtd: 8.3,
      isTotal: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Демонстрация компонентов</h1>
          <p className="text-muted-foreground">
            Все основные компоненты системы управленческой отчетности
          </p>
        </div>

        {/* KPICard - Карточка метрики */}
        <CollapsibleSection title="1. KPICard — Карточка метрики">
          <div className="space-y-4">
            <p className="text-muted-foreground mb-4">
              Компактная карточка для отображения ключевых показателей эффективности (KPI).
              Поддерживает отображение изменений по периодам (PPTD и YTD).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title={kpiCardData.title}
                value={kpiCardData.value}
                description={kpiCardData.description}
                change={kpiCardData.change}
                ytdChange={kpiCardData.ytdChange}
                showChange={kpiCardData.showChange}
                icon={<DollarSign className="w-5 h-5 text-primary" />}
              />

              <KPICard
                title="Транзакции"
                value="1,248"
                description="Количество транзакций за период"
                change={-3.2}
                ytdChange={2.1}
                showChange={true}
                icon={<CreditCard className="w-5 h-5 text-primary" />}
              />

              <KPICard
                title="Конверсия"
                value="23.4%"
                description="Конверсия посетителей в клиентов"
                change={5.8}
                showChange={true}
                icon={<TrendingUp className="w-5 h-5 text-primary" />}
              />

              <KPICard
                title="Клиентская база"
                value="45.2K"
                description="Общее количество активных клиентов"
                change={8.9}
                ytdChange={15.3}
                showChange={true}
                icon={<Users className="w-5 h-5 text-primary" />}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* FinancialTable - Финансовая таблица */}
        <CollapsibleSection title="2. FinancialTable — Финансовая таблица">
          <div className="space-y-4">
            <p className="text-muted-foreground mb-4">
              Иерархическая таблица с возможностью сворачивания/разворачивания групп, сортировкой,
              отображением долей и изменений. Поддерживает двойной клик для детализации.
            </p>
            <FinancialTable
              title="Структура доходов"
              rows={tableData}
              showPercentage={true}
              showChange={true}
              periodLabel="Значение, ₽"
            />
          </div>
        </CollapsibleSection>

        {/* CollapsibleSection - Раздел */}
        <CollapsibleSection title="3. CollapsibleSection — Сворачиваемый раздел">
          <div className="space-y-4">
            <p className="text-muted-foreground mb-4">
              Контейнер для группировки компонентов с возможностью сворачивания/разворачивания.
              Используется для организации структуры отчета по разделам.
            </p>
            <div className="bg-muted/30 rounded-lg p-6 space-y-4">
              <p className="text-sm">
                <strong>Функции:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Группировка связанных компонентов (карточек, таблиц, графиков)</li>
                <li>Плавная анимация сворачивания/разворачивания</li>
                <li>Настраиваемое начальное состояние (открыт/закрыт)</li>
                <li>Дополнительный контент в заголовке (headerContent)</li>
              </ul>
            </div>
          </div>
        </CollapsibleSection>

        {/* Пример комбинации компонентов */}
        <CollapsibleSection title="4. Пример комбинированного использования">
          <div className="space-y-6">
            <p className="text-muted-foreground mb-4">
              Пример использования всех компонентов вместе для создания полноценного раздела отчета.
            </p>

            <CollapsibleSection title="Финансовые показатели" defaultOpen={true}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    title="Выручка"
                    value="₽125.4M"
                    description="Общая выручка"
                    change={12.5}
                    ytdChange={8.3}
                    showChange={true}
                    icon={<DollarSign className="w-5 h-5 text-primary" />}
                  />
                  <KPICard
                    title="Прибыль"
                    value="₽38.2M"
                    description="Чистая прибыль"
                    change={15.8}
                    ytdChange={11.2}
                    showChange={true}
                    icon={<TrendingUp className="w-5 h-5 text-primary" />}
                  />
                  <KPICard
                    title="Рентабельность"
                    value="30.5%"
                    description="Рентабельность продаж"
                    change={2.3}
                    showChange={true}
                    icon={<TrendingUp className="w-5 h-5 text-primary" />}
                  />
                  <KPICard
                    title="Маржа"
                    value="42.1%"
                    description="Валовая маржа"
                    change={-1.2}
                    ytdChange={0.8}
                    showChange={true}
                    icon={<TrendingUp className="w-5 h-5 text-primary" />}
                  />
                </div>

                <FinancialTable
                  title="Детализация доходов и расходов"
                  rows={tableData}
                  showPercentage={true}
                  showChange={true}
                  periodLabel="Сумма, ₽"
                />
              </div>
            </CollapsibleSection>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default ComponentsShowcase;
