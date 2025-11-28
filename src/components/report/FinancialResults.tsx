import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { WalletIcon, TrendingUpIcon, PiggyBankIcon, BarChart3Icon } from "lucide-react";

const assetsData = [
  { name: "Касса", value: 15, amount: "18.5", color: "hsl(var(--chart-1))" },
  { name: "Коррсчета", value: 25, amount: "31.2", color: "hsl(var(--chart-2))" },
  { name: "Инвестиции", value: 35, amount: "43.8", color: "hsl(var(--chart-3))" },
  { name: "Рабочие активы", value: 25, amount: "31.5", color: "hsl(var(--chart-4))" },
];

const liabilitiesData = [
  { name: "Депозиты", value: 40, amount: "52.8", color: "hsl(var(--chart-1))" },
  { name: "Остатки клиентов", value: 35, amount: "46.2", color: "hsl(var(--chart-2))" },
  { name: "Привлечённые средства", value: 25, amount: "33.0", color: "hsl(var(--chart-3))" },
];

const incomeData = [
  { name: "ЧПД", value: 45, amount: "19.1", color: "hsl(var(--chart-1))" },
  { name: "ЧКД", value: 30, amount: "12.7", color: "hsl(var(--chart-2))" },
  { name: "Доход по FX", value: 15, amount: "6.4", color: "hsl(var(--chart-3))" },
  { name: "Прочие доходы", value: 10, amount: "4.3", color: "hsl(var(--chart-4))" },
];

export const FinancialResults = () => {
  return (
    <section>
      <h2 className="text-3xl font-bold text-foreground mb-6">Финансовые результаты и баланс</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <MetricCard
          title="EBITDA"
          value="₽8.2 млрд"
          change={15.3}
          subtitle="До резервов"
          icon={<TrendingUpIcon className="w-6 h-6 text-accent" />}
        />
        
        <MetricCard
          title="Пассивы"
          value="₽132.0 млрд"
          change={6.8}
          subtitle="Всего обязательств"
          icon={<PiggyBankIcon className="w-6 h-6 text-accent" />}
        />
        
        <MetricCard
          title="ROA"
          value="6.5%"
          change={1.8}
          subtitle="Рентабельность активов"
          icon={<BarChart3Icon className="w-6 h-6 text-accent" />}
        />
        
        <MetricCard
          title="ROE"
          value="18.2%"
          change={3.1}
          subtitle="Рентабельность капитала"
          icon={<BarChart3Icon className="w-6 h-6 text-accent" />}
        />
        
        <MetricCard
          title="Капитал"
          value="₽18.5 млрд"
          change={9.1}
          subtitle="Регуляторный капитал"
          icon={<BarChart3Icon className="w-6 h-6 text-accent" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Структура активов</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={assetsData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ value, percent, payload }) => `₽${payload.amount} млрд (${value}%)`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '11px' }}
              >
                {assetsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any, name: any, props: any) => [`₽${props.payload.amount} млрд (${value}%)`, props.payload.name]}
              />
              <Legend align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Структура пассивов</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={liabilitiesData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ value, percent, payload }) => `₽${payload.amount} млрд (${value}%)`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '11px' }}
              >
                {liabilitiesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any, name: any, props: any) => [`₽${props.payload.amount} млрд (${value}%)`, props.payload.name]}
              />
              <Legend align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Структура доходов</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={incomeData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ value, percent, payload }) => `₽${payload.amount} млрд (${value}%)`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '11px' }}
              >
                {incomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any, name: any, props: any) => [`₽${props.payload.amount} млрд (${value}%)`, props.payload.name]}
              />
              <Legend align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </section>
  );
};
