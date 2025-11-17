import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { MetricCard } from "./MetricCard";
import { TrendingUpIcon, DollarSignIcon, PiggyBankIcon } from "lucide-react";

const commissionData = [
  { name: "Переводы", value: 45, color: "hsl(var(--chart-1))" },
  { name: "Обслуживание счетов", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Эквайринг", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Прочее", value: 10, color: "hsl(var(--chart-4))" },
];

export const FinancialMetrics = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">1. Финансово-операционные метрики</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="AUM (Средства клиентов)"
          value="₽82.5 млрд"
          change={6.3}
          subtitle="Общий объём"
          icon={<PiggyBankIcon className="w-6 h-6 text-accent" />}
        />
        <MetricCard
          title="LCR"
          value="145%"
          change={2.1}
          subtitle="Коэффициент покрытия"
          icon={<TrendingUpIcon className="w-6 h-6 text-success" />}
        />
        <MetricCard
          title="Cost-to-Income"
          value="42.8%"
          change={-1.5}
          subtitle="Коэффициент эффективности"
          icon={<DollarSignIcon className="w-6 h-6 text-accent" />}
        />
        <MetricCard
          title="Высоколиквидные активы"
          value="38.2%"
          change={3.4}
          subtitle="Доля в портфеле"
          icon={<TrendingUpIcon className="w-6 h-6 text-success" />}
        />
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Структура комиссионных доходов</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={commissionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {commissionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
