import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MetricCard } from "./MetricCard";
import { UsersIcon, ActivityIcon, TrendingDownIcon, CheckCircleIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const currencyTransactionData = [
  { month: "Янв", RUB: 850000, USD: 420000, EUR: 180000 },
  { month: "Фев", RUB: 920000, USD: 440000, EUR: 160000 },
  { month: "Мар", RUB: 1050000, USD: 460000, EUR: 170000 },
  { month: "Апр", RUB: 980000, USD: 480000, EUR: 160000 },
  { month: "Май", RUB: 1100000, USD: 500000, EUR: 180000 },
  { month: "Июн", RUB: 1150000, USD: 520000, EUR: 180000 },
];

const currencyRevenueData = [
  { month: "Янв", RUB: 12.5, USD: 8.2, EUR: 3.8 },
  { month: "Фев", RUB: 13.2, USD: 8.8, EUR: 3.5 },
  { month: "Мар", RUB: 15.1, USD: 9.2, EUR: 3.7 },
  { month: "Апр", RUB: 14.2, USD: 9.6, EUR: 3.5 },
  { month: "Май", RUB: 16.3, USD: 10.1, EUR: 3.9 },
  { month: "Июн", RUB: 17.1, USD: 10.5, EUR: 3.9 },
];

const slaData = [
  { channel: "Мобильное приложение", sla: "99.8%", failed: "0.2%", avgTime: "0.3с" },
  { channel: "Онлайн-банкинг", sla: "99.5%", failed: "0.5%", avgTime: "0.5с" },
  { channel: "API", sla: "99.9%", failed: "0.1%", avgTime: "0.2с" },
  { channel: "Банкоматы", sla: "98.5%", failed: "1.5%", avgTime: "2.1с" },
];

export const TransactionMetrics = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">2. Транзакционные и клиентские метрики</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="MAU"
          value="2.4M"
          change={8.5}
          subtitle="Активные пользователи"
          icon={<UsersIcon className="w-6 h-6 text-accent" />}
        />
        <MetricCard
          title="Retention"
          value="87.3%"
          change={2.1}
          subtitle="Удержание клиентов"
          icon={<CheckCircleIcon className="w-6 h-6 text-success" />}
        />
        <MetricCard
          title="Churn"
          value="3.2%"
          change={-0.8}
          subtitle="Отток клиентов"
          icon={<TrendingDownIcon className="w-6 h-6 text-destructive" />}
        />
        <MetricCard
          title="ARPU"
          value="₽1,245"
          change={5.3}
          subtitle="Доход на клиента"
          icon={<ActivityIcon className="w-6 h-6 text-accent" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Динамика транзакций по валютам</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={currencyTransactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend align="left" />
              <Line 
                type="monotone" 
                dataKey="RUB" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                name="RUB"
              />
              <Line 
                type="monotone" 
                dataKey="USD" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name="USD"
              />
              <Line 
                type="monotone" 
                dataKey="EUR" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                name="EUR"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Динамика конверсионного дохода по валютам</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={currencyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => `₽${value}M`}
              />
              <Legend align="left" />
              <Line 
                type="monotone" 
                dataKey="RUB" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                name="RUB"
              />
              <Line 
                type="monotone" 
                dataKey="USD" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name="USD"
              />
              <Line 
                type="monotone" 
                dataKey="EUR" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                name="EUR"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">SLA и производительность по каналам</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Канал</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>% неуспешных</TableHead>
              <TableHead>Среднее время</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slaData.map((row) => (
              <TableRow key={row.channel}>
                <TableCell className="font-medium">{row.channel}</TableCell>
                <TableCell className="text-success">{row.sla}</TableCell>
                <TableCell>{row.failed}</TableCell>
                <TableCell>{row.avgTime}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
