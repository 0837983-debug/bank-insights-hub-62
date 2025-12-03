import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableHeader } from "@/components/SortableHeader";
import { useTableSort } from "@/hooks/use-table-sort";
import { 
  ArrowRightLeft, 
  TrendingDown, 
  Globe, 
  CreditCard, 
  Users,
} from "lucide-react";

// Transaction types data
const transactionTypesData = [
  { id: "internal", name: "Платежи (внутренние)", count: 2450000, countChange: 8.2, volume: 45.2, volumeChange: 12.1, avgCheck: 18400, avgCheckChange: 3.6, successRate: 99.2 },
  { id: "international", name: "Международные переводы", count: 890000, countChange: 15.4, volume: 78.5, volumeChange: 22.3, avgCheck: 88200, avgCheckChange: 6.0, successRate: 97.8 },
  { id: "p2p", name: "P2P переводы", count: 1850000, countChange: 12.8, volume: 32.1, volumeChange: 18.5, avgCheck: 17350, avgCheckChange: 5.1, successRate: 99.5 },
  { id: "cash_withdrawal", name: "Снятие наличных", count: 420000, countChange: -5.2, volume: 28.4, volumeChange: -2.1, avgCheck: 67600, avgCheckChange: 3.3, successRate: 98.9 },
  { id: "deposit", name: "Пополнение", count: 680000, countChange: 6.7, volume: 52.3, volumeChange: 9.8, avgCheck: 76900, avgCheckChange: 2.9, successRate: 99.7 },
  { id: "pos", name: "Карточные операции POS", count: 3200000, countChange: 18.5, volume: 41.8, volumeChange: 21.2, avgCheck: 13060, avgCheckChange: 2.3, successRate: 98.4 },
  { id: "ecom", name: "Card-Not-Present / e-commerce", count: 2100000, countChange: 25.3, volume: 38.9, volumeChange: 28.7, avgCheck: 18520, avgCheckChange: 2.7, successRate: 96.8 },
  { id: "bills", name: "Коммерческие платежи (bills, штрафы, госуслуги)", count: 950000, countChange: 4.1, volume: 15.6, volumeChange: 5.8, avgCheck: 16420, avgCheckChange: 1.6, successRate: 99.1 },
];

// Channels data
const channelsData = [
  { id: "mobile", name: "Мобильное приложение", count: 8200000, countChange: 22.4, volume: 198.5, volumeChange: 28.1, avgCheck: 24200, successRate: 98.9 },
  { id: "web", name: "Интернет-банк", count: 1450000, countChange: -3.2, volume: 85.2, volumeChange: 2.1, avgCheck: 58750, successRate: 99.1 },
  { id: "card", name: "Карточная инфраструктура (POS + e-commerce)", count: 5300000, countChange: 21.8, volume: 80.7, volumeChange: 24.5, avgCheck: 15230, successRate: 97.6 },
  { id: "atm", name: "Банкоматы", count: 420000, countChange: -5.2, volume: 28.4, volumeChange: -2.1, avgCheck: 67600, successRate: 98.9 },
  { id: "api", name: "API / BaaS (Banker)", count: 680000, countChange: 45.8, volume: 42.3, volumeChange: 52.4, avgCheck: 62200, successRate: 99.4 },
];

// Categories data
const categoriesData = [
  { id: "own_accounts", name: "Переводы между своими счетами", count: 1200000, countChange: 5.4, volume: 38.2, volumeChange: 8.1, avgCheck: 31830, commission: 0 },
  { id: "internal_clients", name: "Переводы другим клиентам банка", count: 1650000, countChange: 10.2, volume: 28.5, volumeChange: 14.3, avgCheck: 17270, commission: 0.8 },
  { id: "other_banks_ru", name: "Переводы в другие банки РФ", count: 890000, countChange: 8.7, volume: 42.1, volumeChange: 12.5, avgCheck: 47300, commission: 2.1 },
  { id: "international", name: "Переводы за рубеж", count: 890000, countChange: 15.4, volume: 78.5, volumeChange: 22.3, avgCheck: 88200, commission: 12.4 },
  { id: "services", name: "Оплата услуг", count: 950000, countChange: 4.1, volume: 15.6, volumeChange: 5.8, avgCheck: 16420, commission: 1.2 },
  { id: "trade", name: "Торговые операции (карты)", count: 5300000, countChange: 21.8, volume: 80.7, volumeChange: 24.5, avgCheck: 15230, commission: 3.8 },
  { id: "cash", name: "Наличные операции", count: 1100000, countChange: -1.2, volume: 80.7, volumeChange: 3.5, avgCheck: 73360, commission: 1.5 },
];

// International directions data
const internationalData = [
  { id: "cis", name: "СНГ (Армения, Кыргызстан, Казахстан…)", count: 520000, countChange: 18.2, volume: 42.5, volumeChange: 24.1, avgCheck: 81730, commission: 6.8 },
  { id: "europe", name: "Европа", count: 145000, countChange: -8.5, volume: 18.2, volumeChange: -5.2, avgCheck: 125520, commission: 2.9 },
  { id: "asia", name: "Азия", count: 98000, countChange: 32.4, volume: 8.5, volumeChange: 38.7, avgCheck: 86730, commission: 1.4 },
  { id: "middle_east", name: "Ближний Восток", count: 78000, countChange: 22.1, volume: 5.8, volumeChange: 28.4, avgCheck: 74360, commission: 0.9 },
  { id: "usa_canada", name: "США / Канада", count: 49000, countChange: -12.3, volume: 3.5, volumeChange: -8.1, avgCheck: 71430, commission: 0.4 },
];

const formatNumber = (num: number) => num.toLocaleString("ru-RU");

const ChangeIndicator = ({ value }: { value: number }) => (
  <span className={`text-xs ${value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
    {value >= 0 ? "+" : ""}{value.toFixed(1)}%
  </span>
);

export const Transactions = () => {
  // Sorting for transaction types table
  const { sortedData: sortedTypes, sortState: typesSort, handleSort: handleTypesSort } = useTableSort(
    transactionTypesData,
    (item, column) => {
      switch (column) {
        case "name": return item.name;
        case "count": return item.count;
        case "volume": return item.volume;
        case "avgCheck": return item.avgCheck;
        case "successRate": return item.successRate;
        default: return item.name;
      }
    }
  );

  // Sorting for channels table
  const { sortedData: sortedChannels, sortState: channelsSort, handleSort: handleChannelsSort } = useTableSort(
    channelsData,
    (item, column) => {
      switch (column) {
        case "name": return item.name;
        case "count": return item.count;
        case "volume": return item.volume;
        case "avgCheck": return item.avgCheck;
        case "successRate": return item.successRate;
        default: return item.name;
      }
    }
  );

  // Sorting for categories table
  const { sortedData: sortedCategories, sortState: categoriesSort, handleSort: handleCategoriesSort } = useTableSort(
    categoriesData,
    (item, column) => {
      switch (column) {
        case "name": return item.name;
        case "count": return item.count;
        case "volume": return item.volume;
        case "avgCheck": return item.avgCheck;
        case "commission": return item.commission;
        default: return item.name;
      }
    }
  );

  // Sorting for international table
  const { sortedData: sortedInternational, sortState: intlSort, handleSort: handleIntlSort } = useTableSort(
    internationalData,
    (item, column) => {
      switch (column) {
        case "name": return item.name;
        case "count": return item.count;
        case "volume": return item.volume;
        case "avgCheck": return item.avgCheck;
        case "commission": return item.commission;
        default: return item.name;
      }
    }
  );

  return (
    <section className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground">Транзакционная деятельность</h2>
      
      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title="Общее кол-во транзакций"
          value="12.5 млн"
          change={14.2}
          showChange
          icon={<ArrowRightLeft className="w-5 h-5" />}
          description="Суммарное количество всех типов транзакций за период"
        />
        <KPICard
          title="Уровень отказов"
          value="1.8%"
          change={-0.3}
          showChange
          icon={<TrendingDown className="w-5 h-5" />}
          description="Доля неуспешных транзакций (decline rate)"
        />
        <KPICard
          title="Доля международных"
          value="7.1%"
          change={1.2}
          showChange
          icon={<Globe className="w-5 h-5" />}
          description="Доля международных переводов в общем объёме транзакций"
        />
        <KPICard
          title="Доля карточных операций"
          value="42.4%"
          change={3.8}
          showChange
          icon={<CreditCard className="w-5 h-5" />}
          description="Доля операций POS + e-commerce в общем объёме"
        />
        <KPICard
          title="Доля P2P транзакций"
          value="14.8%"
          change={2.1}
          showChange
          icon={<Users className="w-5 h-5" />}
          description="Доля P2P переводов между физическими лицами"
        />
      </div>

      {/* Transaction Types Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">По типам транзакций</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground font-medium">
                  <SortableHeader label="Тип транзакции" column="name" currentColumn={typesSort.column} direction={typesSort.direction} onSort={handleTypesSort} />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Кол-во транзакций" column="count" currentColumn={typesSort.column} direction={typesSort.direction} onSort={handleTypesSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Объём, млрд руб" column="volume" currentColumn={typesSort.column} direction={typesSort.direction} onSort={handleTypesSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Средний чек, руб" column="avgCheck" currentColumn={typesSort.column} direction={typesSort.direction} onSort={handleTypesSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Успешность, %" column="successRate" currentColumn={typesSort.column} direction={typesSort.direction} onSort={handleTypesSort} className="justify-end" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTypes.map((item) => (
                <TableRow key={item.id} className="border-border/30 hover:bg-muted/30">
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">{formatNumber(item.count)}</span>
                      <ChangeIndicator value={item.countChange} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">{item.volume.toFixed(1)}</span>
                      <ChangeIndicator value={item.volumeChange} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">{formatNumber(item.avgCheck)}</span>
                      <ChangeIndicator value={item.avgCheckChange} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-foreground">{item.successRate.toFixed(1)}%</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Channels Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">По каналам</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground font-medium">
                  <SortableHeader label="Канал" column="name" currentColumn={channelsSort.column} direction={channelsSort.direction} onSort={handleChannelsSort} />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Кол-во транзакций" column="count" currentColumn={channelsSort.column} direction={channelsSort.direction} onSort={handleChannelsSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Объём, млрд руб" column="volume" currentColumn={channelsSort.column} direction={channelsSort.direction} onSort={handleChannelsSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Средний чек, руб" column="avgCheck" currentColumn={channelsSort.column} direction={channelsSort.direction} onSort={handleChannelsSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Успешность, %" column="successRate" currentColumn={channelsSort.column} direction={channelsSort.direction} onSort={handleChannelsSort} className="justify-end" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedChannels.map((item) => (
                <TableRow key={item.id} className="border-border/30 hover:bg-muted/30">
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">{formatNumber(item.count)}</span>
                      <ChangeIndicator value={item.countChange} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">{item.volume.toFixed(1)}</span>
                      <ChangeIndicator value={item.volumeChange} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-foreground">{formatNumber(item.avgCheck)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-foreground">{item.successRate.toFixed(1)}%</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Categories Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">По категориям операций</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground font-medium">
                  <SortableHeader label="Категория" column="name" currentColumn={categoriesSort.column} direction={categoriesSort.direction} onSort={handleCategoriesSort} />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Кол-во транзакций" column="count" currentColumn={categoriesSort.column} direction={categoriesSort.direction} onSort={handleCategoriesSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Объём, млрд руб" column="volume" currentColumn={categoriesSort.column} direction={categoriesSort.direction} onSort={handleCategoriesSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Средний чек, руб" column="avgCheck" currentColumn={categoriesSort.column} direction={categoriesSort.direction} onSort={handleCategoriesSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Комиссии, млрд руб" column="commission" currentColumn={categoriesSort.column} direction={categoriesSort.direction} onSort={handleCategoriesSort} className="justify-end" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.map((item) => (
                <TableRow key={item.id} className="border-border/30 hover:bg-muted/30">
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">{formatNumber(item.count)}</span>
                      <ChangeIndicator value={item.countChange} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">{item.volume.toFixed(1)}</span>
                      <ChangeIndicator value={item.volumeChange} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-foreground">{formatNumber(item.avgCheck)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-foreground">{item.commission.toFixed(1)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* International Directions Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">По направлениям международных переводов</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground font-medium">
                  <SortableHeader label="Направление" column="name" currentColumn={intlSort.column} direction={intlSort.direction} onSort={handleIntlSort} />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Кол-во переводов" column="count" currentColumn={intlSort.column} direction={intlSort.direction} onSort={handleIntlSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Объём, млрд руб" column="volume" currentColumn={intlSort.column} direction={intlSort.direction} onSort={handleIntlSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Средний чек, руб" column="avgCheck" currentColumn={intlSort.column} direction={intlSort.direction} onSort={handleIntlSort} className="justify-end" />
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">
                  <SortableHeader label="Комиссионный доход, млрд руб" column="commission" currentColumn={intlSort.column} direction={intlSort.direction} onSort={handleIntlSort} className="justify-end" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInternational.map((item) => (
                <TableRow key={item.id} className="border-border/30 hover:bg-muted/30">
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">{formatNumber(item.count)}</span>
                      <ChangeIndicator value={item.countChange} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">{item.volume.toFixed(1)}</span>
                      <ChangeIndicator value={item.volumeChange} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-foreground">{formatNumber(item.avgCheck)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-foreground">{item.commission.toFixed(1)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </section>
  );
};
