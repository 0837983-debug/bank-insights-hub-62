import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { CollapsibleSection } from "@/components/report/CollapsibleSection";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ArrowDownIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortableHeader } from "@/components/SortableHeader";
import { useTableSort } from "@/hooks/use-table-sort";

interface ConversionTableRow {
  id: string;
  name: string;
  transactions: number;
  transactionsChange: number;
  volumeRub: number;
  volumeRubChange: number;
  volumeOriginal: number;
  volumeOriginalChange: number;
}

// Currency pairs data
const currencyPairsData: ConversionTableRow[] = [
  { id: "usd-rub", name: "USD/RUB", transactions: 284500, transactionsChange: 8.2, volumeRub: 42.8, volumeRubChange: 12.4, volumeOriginal: 456, volumeOriginalChange: 11.8 },
  { id: "eur-rub", name: "EUR/RUB", transactions: 156200, transactionsChange: 5.1, volumeRub: 28.4, volumeRubChange: 7.3, volumeOriginal: 285, volumeOriginalChange: 6.9 },
  { id: "usd-eur", name: "USD/EUR", transactions: 45800, transactionsChange: -2.3, volumeRub: 8.2, volumeRubChange: -1.8, volumeOriginal: 87, volumeOriginalChange: -2.1 },
  { id: "aed-rub", name: "AED/RUB", transactions: 89400, transactionsChange: 24.6, volumeRub: 12.6, volumeRubChange: 28.3, volumeOriginal: 134, volumeOriginalChange: 27.5 },
  { id: "cny-rub", name: "CNY/RUB", transactions: 67300, transactionsChange: 18.9, volumeRub: 9.8, volumeRubChange: 22.1, volumeOriginal: 680, volumeOriginalChange: 21.4 },
  { id: "try-rub", name: "TRY/RUB", transactions: 34200, transactionsChange: 15.2, volumeRub: 4.2, volumeRubChange: 17.8, volumeOriginal: 1250, volumeOriginalChange: 16.9 },
  { id: "gbp-rub", name: "GBP/RUB", transactions: 28100, transactionsChange: 3.4, volumeRub: 5.6, volumeRubChange: 4.8, volumeOriginal: 48, volumeOriginalChange: 4.2 },
];

// Client segments data
const clientSegmentsData: ConversionTableRow[] = [
  { id: "retail", name: "ФЛ розница", transactions: 425000, transactionsChange: 9.8, volumeRub: 38.4, volumeRubChange: 11.2, volumeOriginal: 408, volumeOriginalChange: 10.5 },
  { id: "private", name: "ФЛ прайват", transactions: 45200, transactionsChange: 6.2, volumeRub: 28.6, volumeRubChange: 8.4, volumeOriginal: 304, volumeOriginalChange: 7.9 },
  { id: "ie", name: "ИП", transactions: 67800, transactionsChange: 12.4, volumeRub: 12.8, volumeRubChange: 15.6, volumeOriginal: 136, volumeOriginalChange: 14.8 },
  { id: "smb", name: "ЮЛ малый бизнес", transactions: 89400, transactionsChange: 7.3, volumeRub: 18.4, volumeRubChange: 9.1, volumeOriginal: 195, volumeOriginalChange: 8.6 },
  { id: "corporate", name: "ЮЛ корпоративные", transactions: 34600, transactionsChange: 4.8, volumeRub: 45.2, volumeRubChange: 6.2, volumeOriginal: 480, volumeOriginalChange: 5.8 },
  { id: "nonresident", name: "Нерезиденты", transactions: 43500, transactionsChange: 18.6, volumeRub: 8.2, volumeRubChange: 22.4, volumeOriginal: 87, volumeOriginalChange: 21.6 },
];

// Buy/Sell direction data
const buySellData: ConversionTableRow[] = [
  { id: "buy", name: "Покупка клиентами (Buy)", transactions: 412500, transactionsChange: 10.2, volumeRub: 78.4, volumeRubChange: 12.8, volumeOriginal: 832, volumeOriginalChange: 12.1 },
  { id: "sell", name: "Продажа клиентами (Sell)", transactions: 293000, transactionsChange: 7.6, volumeRub: 73.2, volumeRubChange: 9.4, volumeOriginal: 778, volumeOriginalChange: 8.9 },
  { id: "net", name: "Нетто-позиция", transactions: 119500, transactionsChange: 15.8, volumeRub: 5.2, volumeRubChange: 42.6, volumeOriginal: 54, volumeOriginalChange: 41.2 },
];

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

const formatVolume = (num: number) => `${num.toFixed(1)}B`;

interface ConversionTableProps {
  title: string;
  data: ConversionTableRow[];
  showCurrencyToggle?: boolean;
}

const ConversionTable = ({ title, data, showCurrencyToggle = true }: ConversionTableProps) => {
  const [showRub, setShowRub] = useState(true);

  const getValueFn = useCallback((item: ConversionTableRow, column: string) => {
    switch (column) {
      case "name": return item.name;
      case "transactions": return item.transactions;
      case "volume": return showRub ? item.volumeRub : item.volumeOriginal;
      default: return item.name;
    }
  }, [showRub]);

  const { sortedData, sortState, handleSort } = useTableSort(data, getValueFn);

  const renderChange = (change: number) => {
    const isPositive = change > 0;
    return (
      <div className="flex items-center gap-1 text-xs mt-0.5">
        {isPositive ? (
          <ArrowUpIcon className="w-3 h-3 text-success" />
        ) : (
          <ArrowDownIcon className="w-3 h-3 text-destructive" />
        )}
        <span className={isPositive ? "text-success" : "text-destructive"}>
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-foreground">{title}</h4>
        {showCurrencyToggle && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRub(!showRub)}
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className="w-3.5 h-3.5" />
            {showRub ? "RUB" : "Исходная валюта"}
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">
              <SortableHeader
                label="Наименование"
                column="name"
                currentColumn={sortState.column}
                direction={sortState.direction}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label="Количество транзакций"
                column="transactions"
                currentColumn={sortState.column}
                direction={sortState.direction}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                label={showRub ? "Объём, B руб" : "Объём, M ед."}
                column="volume"
                currentColumn={sortState.column}
                direction={sortState.direction}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-right">
                <div>{formatNumber(row.transactions)}</div>
                {renderChange(row.transactionsChange)}
              </TableCell>
              <TableCell className="text-right">
                <div>
                  {showRub 
                    ? formatVolume(row.volumeRub)
                    : `${row.volumeOriginal.toFixed(0)}M`
                  }
                </div>
                {renderChange(showRub ? row.volumeRubChange : row.volumeOriginalChange)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export const Conversion = () => {
  return (
    <CollapsibleSection title="Конвертация">
      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <KPICard
          title="Количество FX-сделок"
          value="705.5K"
          change={9.4}
          ytdChange={18.7}
          showChange
          description="Общее количество конверсионных операций за период"
        />
        <KPICard
          title="Средний чек FX-сделки"
          value="₽214.8K"
          change={3.2}
          ytdChange={5.6}
          showChange
          description="Средний объём одной конверсионной операции"
        />
        <KPICard
          title="Средневзв. FX-спред"
          value="1.82%"
          change={-0.08}
          ytdChange={-0.15}
          showChange
          description="Средневзвешенный спред по всем FX-операциям"
        />
        <KPICard
          title="Уникальных клиентов FX"
          value="186.4K"
          change={12.6}
          ytdChange={22.4}
          showChange
          description="Количество уникальных клиентов, совершавших конверсии"
        />
        <KPICard
          title="FX-транзакций на клиента"
          value="3.78"
          change={-2.8}
          ytdChange={-1.5}
          showChange
          description="Среднее количество FX-операций на одного клиента"
        />
      </div>

      {/* Tables */}
      <div className="space-y-6">
        <ConversionTable
          title="По валютным парам"
          data={currencyPairsData}
        />
        
        <ConversionTable
          title="По клиентским сегментам"
          data={clientSegmentsData}
        />
        
        <ConversionTable
          title="По покупкам и продажам валюты"
          data={buySellData}
        />
      </div>
    </CollapsibleSection>
  );
};
