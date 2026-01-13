import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Database,
  Users,
  DollarSign,
  TrendingUp,
  Building,
} from "lucide-react";
import { UploadModal } from "@/components/upload/UploadModal";

export interface UploadType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  acceptedFormats: string[];
  expectedColumns: string[];
}

const uploadTypes: UploadType[] = [
  {
    id: "financial_results",
    name: "Финансовые результаты",
    description: "Загрузка данных по доходам и расходам",
    icon: <DollarSign className="h-6 w-6" />,
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    expectedColumns: ["Период", "Категория", "Сумма", "Валюта"],
  },
  {
    id: "client_base",
    name: "Клиентская база",
    description: "Данные по клиентам и сегментам",
    icon: <Users className="h-6 w-6" />,
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    expectedColumns: ["ID клиента", "Сегмент", "Дата регистрации", "Статус"],
  },
  {
    id: "balance_data",
    name: "Балансовые данные",
    description: "Остатки и движение средств",
    icon: <Database className="h-6 w-6" />,
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    expectedColumns: ["Счёт", "Дата", "Остаток", "Валюта"],
  },
  {
    id: "kpi_targets",
    name: "Целевые KPI",
    description: "Плановые показатели эффективности",
    icon: <TrendingUp className="h-6 w-6" />,
    acceptedFormats: [".xlsx", ".xls", ".csv", ".txt"],
    expectedColumns: ["KPI", "План", "Период", "Подразделение"],
  },
  {
    id: "org_structure",
    name: "Оргструктура",
    description: "Данные по подразделениям и иерархии",
    icon: <Building className="h-6 w-6" />,
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    expectedColumns: ["Код подразделения", "Наименование", "Родительский код", "Уровень"],
  },
  {
    id: "transactions",
    name: "Транзакции",
    description: "Детальные данные по операциям",
    icon: <FileSpreadsheet className="h-6 w-6" />,
    acceptedFormats: [".xlsx", ".xls", ".csv"],
    expectedColumns: ["ID транзакции", "Дата", "Сумма", "Тип", "Статус"],
  },
  {
    id: "manual_adjustments",
    name: "Ручные корректировки",
    description: "Корректирующие проводки",
    icon: <FileText className="h-6 w-6" />,
    acceptedFormats: [".xlsx", ".xls", ".csv", ".txt"],
    expectedColumns: ["Дата", "Счёт", "Сумма", "Комментарий"],
  },
];

const FileUpload = () => {
  const [selectedUpload, setSelectedUpload] = useState<UploadType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUploadClick = (uploadType: UploadType) => {
    setSelectedUpload(uploadType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUpload(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Загрузка данных</h1>
          <p className="text-muted-foreground">
            Выберите тип данных для загрузки. Файлы будут проверены перед сохранением в базу данных.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uploadTypes.map((uploadType) => (
            <Card
              key={uploadType.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => handleUploadClick(uploadType)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {uploadType.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{uploadType.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">{uploadType.description}</CardDescription>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Форматы: {uploadType.acceptedFormats.join(", ")}
                  </span>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Загрузить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {selectedUpload && (
        <UploadModal isOpen={isModalOpen} onClose={handleCloseModal} uploadType={selectedUpload} />
      )}
    </div>
  );
};

export default FileUpload;
