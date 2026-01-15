import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Upload,
  FileCheck,
  FileX,
  RotateCcw,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Download,
} from "lucide-react";

interface UploadRecord {
  id: string;
  uploadType: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: "pending" | "validated" | "applied" | "failed" | "cancelled";
  rowCount: number;
  errors?: number;
  appliedAt?: string;
}

// Mock data
const mockUploads: UploadRecord[] = [
  {
    id: "1",
    uploadType: "Финансовые результаты",
    fileName: "fin_results_2024_q1.xlsx",
    uploadedBy: "Иван Иванов",
    uploadedAt: "2024-01-15 10:30",
    status: "applied",
    rowCount: 156,
    appliedAt: "2024-01-15 10:35",
  },
  {
    id: "2",
    uploadType: "Клиентская база",
    fileName: "clients_jan_2024.csv",
    uploadedBy: "Анна Смирнова",
    uploadedAt: "2024-01-15 09:45",
    status: "validated",
    rowCount: 2340,
  },
  {
    id: "3",
    uploadType: "Операционные данные",
    fileName: "operations_w2.xlsx",
    uploadedBy: "Пётр Петров",
    uploadedAt: "2024-01-15 08:20",
    status: "failed",
    rowCount: 890,
    errors: 15,
  },
  {
    id: "4",
    uploadType: "Транзакции",
    fileName: "transactions_daily.csv",
    uploadedBy: "Иван Иванов",
    uploadedAt: "2024-01-14 17:00",
    status: "applied",
    rowCount: 15420,
    appliedAt: "2024-01-14 17:15",
  },
  {
    id: "5",
    uploadType: "Показатели риска",
    fileName: "risk_metrics_jan.xlsx",
    uploadedBy: "Козлов Дмитрий",
    uploadedAt: "2024-01-14 14:30",
    status: "cancelled",
    rowCount: 234,
  },
  {
    id: "6",
    uploadType: "Финансовые результаты",
    fileName: "fin_results_2023_q4.xlsx",
    uploadedBy: "Иван Иванов",
    uploadedAt: "2024-01-13 11:00",
    status: "applied",
    rowCount: 162,
    appliedAt: "2024-01-13 11:10",
  },
  {
    id: "7",
    uploadType: "Клиентская база",
    fileName: "clients_dec_2023.csv",
    uploadedBy: "Анна Смирнова",
    uploadedAt: "2024-01-12 16:30",
    status: "applied",
    rowCount: 2180,
    appliedAt: "2024-01-12 16:45",
  },
];

const getStatusBadge = (status: UploadRecord["status"]) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Ожидает
        </Badge>
      );
    case "validated":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
          <FileCheck className="h-3 w-3 mr-1" />
          Проверено
        </Badge>
      );
    case "applied":
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Применено
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Ошибка
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-200">
          <FileX className="h-3 w-3 mr-1" />
          Отменено
        </Badge>
      );
  }
};

export function UploadManagement() {
  const [uploads, setUploads] = useState<UploadRecord[]>(mockUploads);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [uploadToCancel, setUploadToCancel] = useState<UploadRecord | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<UploadRecord | null>(null);

  const handleCancel = () => {
    if (!uploadToCancel) return;
    setUploads(
      uploads.map((u) => (u.id === uploadToCancel.id ? { ...u, status: "cancelled" as const } : u))
    );
    toast.success(`Загрузка "${uploadToCancel.fileName}" отменена`);
    setCancelDialogOpen(false);
    setUploadToCancel(null);
  };

  const handleReupload = (upload: UploadRecord) => {
    // Mock re-upload - just reset status to pending
    setUploads(
      uploads.map((u) =>
        u.id === upload.id ? { ...u, status: "pending" as const, errors: undefined } : u
      )
    );
    toast.success(`Файл "${upload.fileName}" отправлен на повторную загрузку`);
  };

  const handleApply = (upload: UploadRecord) => {
    setUploads(
      uploads.map((u) =>
        u.id === upload.id
          ? {
              ...u,
              status: "applied" as const,
              appliedAt: new Date()
                .toLocaleString("ru-RU", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
                .replace(",", ""),
            }
          : u
      )
    );
    toast.success(`Данные из "${upload.fileName}" применены`);
  };

  const filteredUploads = uploads.filter((upload) => {
    const matchesSearch =
      upload.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.uploadType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      upload.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || upload.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = uploads.filter((u) => u.status === "validated").length;
  const failedCount = uploads.filter((u) => u.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{uploads.length}</div>
            <p className="text-sm text-muted-foreground">Всего загрузок</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">Ожидают применения</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {uploads.filter((u) => u.status === "applied").length}
            </div>
            <p className="text-sm text-muted-foreground">Применено</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <p className="text-sm text-muted-foreground">С ошибками</p>
          </CardContent>
        </Card>
      </div>

      {/* Uploads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                История загрузок
              </CardTitle>
              <CardDescription>Управление загруженными файлами данных</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по файлу, типу или автору..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="pending">Ожидает</SelectItem>
                  <SelectItem value="validated">Проверено</SelectItem>
                  <SelectItem value="applied">Применено</SelectItem>
                  <SelectItem value="failed">Ошибка</SelectItem>
                  <SelectItem value="cancelled">Отменено</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип загрузки</TableHead>
                  <TableHead>Файл</TableHead>
                  <TableHead>Автор</TableHead>
                  <TableHead>Дата загрузки</TableHead>
                  <TableHead className="text-center">Записей</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="font-medium">{upload.uploadType}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{upload.fileName}</span>
                        {upload.errors && upload.errors > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {upload.errors} ошибок
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{upload.uploadedBy}</TableCell>
                    <TableCell className="text-muted-foreground">{upload.uploadedAt}</TableCell>
                    <TableCell className="text-center">
                      {upload.rowCount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(upload.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUpload(upload);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {upload.status === "validated" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApply(upload)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Применить
                          </Button>
                        )}

                        {upload.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReupload(upload)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Перезагрузить
                          </Button>
                        )}

                        {(upload.status === "validated" || upload.status === "pending") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setUploadToCancel(upload);
                              setCancelDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отмена загрузки</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите отменить загрузку файла{" "}
              <strong>{uploadToCancel?.fileName}</strong>?
              <br />
              Данные не будут применены к базе данных.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Назад
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              <Trash2 className="h-4 w-4 mr-2" />
              Отменить загрузку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали загрузки</DialogTitle>
          </DialogHeader>
          {selectedUpload && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Тип загрузки</p>
                  <p className="font-medium">{selectedUpload.uploadType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Статус</p>
                  <div className="mt-1">{getStatusBadge(selectedUpload.status)}</div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Файл</p>
                <p className="font-mono">{selectedUpload.fileName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Загружено</p>
                  <p>{selectedUpload.uploadedBy}</p>
                  <p className="text-sm text-muted-foreground">{selectedUpload.uploadedAt}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Записей</p>
                  <p className="text-lg font-semibold">
                    {selectedUpload.rowCount.toLocaleString()}
                  </p>
                </div>
              </div>
              {selectedUpload.appliedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Применено</p>
                  <p>{selectedUpload.appliedAt}</p>
                </div>
              )}
              {selectedUpload.errors && selectedUpload.errors > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">
                    Найдено ошибок: {selectedUpload.errors}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Проверьте исходный файл и загрузите снова
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Закрыть
            </Button>
            {selectedUpload?.status === "applied" && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Скачать файл
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
