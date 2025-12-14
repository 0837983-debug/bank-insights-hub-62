import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { MetricCard } from "./MetricCard";
import { TrendingUpIcon, DollarSignIcon, PiggyBankIcon } from "lucide-react";

const chkdData = [
  { name: "Переводы", value: 45, amount: 12.5, color: "hsl(var(--chart-1))" },
  { name: "Обслуживание счетов", value: 25, amount: 6.9, color: "hsl(var(--chart-2))" },
  { name: "Эквайринг", value: 20, amount: 5.5, color: "hsl(var(--chart-3))" },
  { name: "Прочее", value: 10, amount: 2.8, color: "hsl(var(--chart-4))" },
];

const chpdData = [
  { name: "Кредиты корпоративные", value: 40, amount: 18.2, color: "hsl(var(--chart-1))" },
  { name: "Кредиты розничные", value: 35, amount: 15.9, color: "hsl(var(--chart-2))" },
  { name: "Межбанковские кредиты", value: 15, amount: 6.8, color: "hsl(var(--chart-3))" },
  { name: "Прочие процентные", value: 10, amount: 4.5, color: "hsl(var(--chart-4))" },
];

const totalRevenueData = [
  { name: "ЧКД", value: 30, amount: 27.7, color: "hsl(var(--chart-1))" },
  { name: "ЧПД клиентские", value: 35, amount: 32.3, color: "hsl(var(--chart-2))" },
  { name: "ЧПД собственные", value: 20, amount: 18.5, color: "hsl(var(--chart-3))" },
  { name: "Прочие доходы", value: 15, amount: 13.8, color: "hsl(var(--chart-4))" },
];

export const FinancialMetrics = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">1. Финансово-операционные метрики</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="AUM (Средства клиентов)"
          value="₽82.5B"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Структура ЧКД</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={chkdData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ value, percent, payload }) => `₽${payload.amount}B (${(percent * 100).toFixed(0)}%)`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '11px' }}
              >
                {chkdData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any, name: any, props: any) => [`₽${props.payload.amount}B (${value}%)`, props.payload.name]}
              />
              <Legend align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Структура ЧПД</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={chpdData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ value, percent, payload }) => `₽${payload.amount}B (${(percent * 100).toFixed(0)}%)`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '11px' }}
              >
                {chpdData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any, name: any, props: any) => [`₽${props.payload.amount}B (${value}%)`, props.payload.name]}
              />
              <Legend align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Общая структура доходов</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={totalRevenueData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ value, percent, payload }) => `₽${payload.amount}B (${(percent * 100).toFixed(0)}%)`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '11px' }}
              >
                {totalRevenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any, name: any, props: any) => [`₽${props.payload.amount}B (${value}%)`, props.payload.name]}
              />
              <Legend align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};
