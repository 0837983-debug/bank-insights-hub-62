import { Card } from "@/components/ui/card";
import { KPICard } from "./MetricCard";
import { ShieldAlertIcon, AlertTriangleIcon, TrendingDownIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const amlData = [
  { type: "Подозрительные переводы", count: 47, status: "В обработке" },
  { type: "Необычная активность", count: 23, status: "Проверено" },
  { type: "Превышение лимитов", count: 15, status: "Закрыто" },
  { type: "Санкционные проверки", count: 8, status: "В обработке" },
];

export const RiskMetrics = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">4. Регуляторные и риск-метрики</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="AML события"
          value="93"
          showChange={true}
          change={-12.5}
          description="Подозрительные операции"
          icon={<ShieldAlertIcon className="w-6 h-6 text-warning" />}
        />
        <KPICard
          title="Комплаенс нарушения"
          value="4"
          showChange={true}
          change={-33.3}
          description="За текущий период"
          icon={<AlertTriangleIcon className="w-6 h-6 text-destructive" />}
        />
        <KPICard
          title="Операционные потери"
          value="₽2.1M"
          showChange={true}
          change={-18.2}
          description="Убытки от рисков"
          icon={<TrendingDownIcon className="w-6 h-6 text-destructive" />}
        />
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">AML события по категориям</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Тип события</TableHead>
              <TableHead>Количество</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {amlData.map((row) => (
              <TableRow key={row.type}>
                <TableCell className="font-medium">{row.type}</TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell>
                  <span
                    className={
                      row.status === "В обработке"
                        ? "text-warning"
                        : row.status === "Проверено"
                          ? "text-success"
                          : "text-muted-foreground"
                    }
                  >
                    {row.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
