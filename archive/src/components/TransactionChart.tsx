import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { month: "Jan", transactions: 145000, volume: 2850000 },
  { month: "Feb", transactions: 152000, volume: 2980000 },
  { month: "Mar", transactions: 168000, volume: 3250000 },
  { month: "Apr", transactions: 162000, volume: 3120000 },
  { month: "May", transactions: 178000, volume: 3450000 },
  { month: "Jun", transactions: 185000, volume: 3680000 },
];

export const TransactionChart = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Transaction Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="month"
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: "12px" }}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Bar
            dataKey="transactions"
            fill="hsl(var(--chart-1))"
            name="Transactions"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="volume"
            fill="hsl(var(--chart-2))"
            name="Volume ($)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
