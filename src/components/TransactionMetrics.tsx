import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MetricCard } from "./MetricCard";
import { UsersIcon, ActivityIcon, TrendingDownIcon, CheckCircleIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const transactionTrendData = [
  { month: "Янв", transactions: 1450000, volume: 28500 },
  { month: "Фев", transactions: 1520000, volume: 29800 },
  { month: "Мар", transactions: 1680000, volume: 32500 },
  { month: "Апр", transactions: 1620000, volume: 31200 },
  { month: "Май", transactions: 1780000, volume: 34500 },
  { month: "Июн", transactions: 1850000, volume: 36800 },
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
          value="2.4 млн"
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

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Динамика транзакций</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={transactionTrendData}>
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
            <Legend />
            <Line 
              type="monotone" 
              dataKey="transactions" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              name="Транзакции"
            />
            <Line 
              type="monotone" 
              dataKey="volume" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="Объём (млн ₽)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

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
