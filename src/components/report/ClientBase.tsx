import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { UsersIcon, UserCheckIcon, UserMinusIcon, TrendingUpIcon, DollarSignIcon, CreditCardIcon } from "lucide-react";

const clientBalanceData = [
  { name: "Остатки > ₽1,000", value: 65, amount: "1.56", color: "hsl(var(--chart-1))" },
  { name: "Остатки < ₽1,000", value: 35, amount: "0.84", color: "hsl(var(--chart-2))" },
];

const revenueConcentrationData = [
  { name: "Топ 20% клиентов", value: 80, amount: "34.0", color: "hsl(var(--chart-1))" },
  { name: "Остальные 80%", value: 20, amount: "8.5", color: "hsl(var(--chart-3))" },
];

export const ClientBase = () => {
  return (
    <section>
      <h2 className="text-3xl font-bold text-foreground mb-6">Клиентская база и сегменты</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="MAU"
          value="2.4 млн"
          change={8.5}
          subtitle="Активные пользователи"
          icon={<UsersIcon className="w-6 h-6 text-accent" />}
        />
        
        <MetricCard
          title="DAU"
          value="785 тыс"
          change={6.2}
          subtitle="Ежедневно активные"
          icon={<UserCheckIcon className="w-6 h-6 text-accent" />}
        />
        
        <MetricCard
          title="Retention M/M"
          value="78.5%"
          change={2.1}
          subtitle="Удержание клиентов"
          icon={<TrendingUpIcon className="w-6 h-6 text-accent" />}
        />
        
        <MetricCard
          title="Churn"
          value="4.2%"
          change={-1.3}
          subtitle="Отток клиентов"
          icon={<UserMinusIcon className="w-6 h-6 text-accent" />}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Новые клиенты"
          value="125 тыс"
          change={12.7}
          subtitle="За месяц"
        />
        
        <MetricCard
          title="ARPU"
          value="₽1,475"
          change={5.8}
          subtitle="Средний доход на клиента"
        />
        
        <MetricCard
          title="Средний баланс"
          value="₽45,820"
          change={7.3}
          subtitle="На клиента"
        />
        
        <MetricCard
          title="Транзакций/клиент"
          value="18.3"
          change={9.4}
          subtitle="Средняя интенсивность"
        />
      </div>

      {/* More Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Международные переводы"
          value="28.5%"
          change={4.2}
          subtitle="Доля клиентов"
          icon={<DollarSignIcon className="w-5 h-5 text-accent" />}
        />
        
        <MetricCard
          title="Карточные операции"
          value="67.8%"
          change={6.1}
          subtitle="Доля клиентов"
          icon={<CreditCardIcon className="w-5 h-5 text-accent" />}
        />
        
        <MetricCard
          title="Ушедшие клиенты"
          value="98 тыс"
          change={-8.5}
          subtitle="Неактивны ≥30 дней"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Распределение по остаткам</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={clientBalanceData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ value, percent, payload }) => `${payload.amount} млн клиентов (${value}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '12px' }}
              >
                {clientBalanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any, name: any, props: any) => [`${props.payload.amount} млн клиентов (${value}%)`, props.payload.name]}
              />
              <Legend align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Концентрация доходов</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={revenueConcentrationData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ value, percent, payload }) => `₽${payload.amount} млрд (${value}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '12px' }}
              >
                {revenueConcentrationData.map((entry, index) => (
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
