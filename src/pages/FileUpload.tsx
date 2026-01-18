import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { Header } from "@/components/Header";
import { FileUploader } from "@/components/upload/FileUploader";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { ValidationErrors } from "@/components/upload/ValidationErrors";
import { UploadHistory } from "@/components/upload/UploadHistory";
import { useFileUpload, useUploadStatus, useRollbackUpload } from "@/hooks/useFileUpload";
import type { AggregatedValidationError } from "@/lib/api";

export default function FileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetTable, setTargetTable] = useState<string>("balance");
  const [sheetName, setSheetName] = useState<string | undefined>(undefined);
  const [uploadId, setUploadId] = useState<number | null>(null);

  const { upload, isLoading, progress, error, data: uploadResponse, isSuccess, reset } = useFileUpload({
    targetTable,
    onSuccess: (response) => {
      setUploadId(response.uploadId);
    },
  });

  // Получаем статус загрузки, если есть uploadId
  const { data: uploadStatus } = useUploadStatus(uploadId, uploadId !== null);

  const rollbackMutation = useRollbackUpload();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    reset(); // Сбрасываем предыдущее состояние
    setUploadId(null);
    setSheetName(undefined);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Логирование перед загрузкой
    console.log("Starting upload:", {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
      targetTable,
      sheetName,
    });

    try {
      const response = await upload(selectedFile, sheetName);
      setUploadId(response.uploadId);
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  const handleRollback = async () => {
    if (!uploadId) return;

    try {
      await rollbackMutation.mutateAsync({ uploadId });
      setUploadId(null);
      reset();
    } catch (err) {
      console.error("Rollback error:", err);
    }
  };

  // Определяем текущий статус
  const currentStatus = uploadStatus?.status || uploadResponse?.status || (isLoading ? "processing" : undefined);
  const validationErrors: AggregatedValidationError[] | undefined =
    uploadStatus?.validationErrors || uploadResponse?.validationErrors;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Загрузка файлов</h1>

        <div className="space-y-6">
          {/* Форма загрузки */}
          <Card>
            <CardHeader>
              <CardTitle>Загрузить файл</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Выбор целевой таблицы */}
              <div className="space-y-2">
                <Label>Целевая таблица</Label>
                <Select value={targetTable} onValueChange={setTargetTable} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance">Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Выбор файла */}
              <FileUploader
                onFileSelect={handleFileSelect}
                acceptedFormats={[".csv", ".xlsx"]}
                disabled={isLoading}
              />

              {/* Выбор листа для XLSX (опционально, если известен) */}
              {selectedFile?.name.endsWith(".xlsx") && (
                <div className="space-y-2">
                  <Label>Имя листа (опционально, для XLSX)</Label>
                  <input
                    type="text"
                    value={sheetName || ""}
                    onChange={(e) => setSheetName(e.target.value || undefined)}
                    placeholder="Оставьте пустым для первого листа"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Прогресс загрузки */}
              {(isLoading || currentStatus === "processing") && (
                <UploadProgress progress={progress} status={currentStatus} />
              )}

              {/* Ошибки валидации */}
              {validationErrors && validationErrors.length > 0 && (
                <ValidationErrors errors={validationErrors} />
              )}

              {/* Общие ошибки */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Ошибка загрузки</AlertTitle>
                  <AlertDescription>
                    {error instanceof Error ? error.message : "Произошла ошибка при загрузке файла"}
                  </AlertDescription>
                </Alert>
              )}

              {/* Сообщение об успехе */}
              {currentStatus === "completed" && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Загрузка завершена успешно</AlertTitle>
                  <AlertDescription>
                    Обработано строк: {uploadStatus?.rowsSuccessful || uploadResponse?.rowsSuccessful || 0}
                    {uploadResponse?.duplicatePeriodsWarning && (
                      <div className="mt-2 text-sm text-yellow-600">
                        {uploadResponse.duplicatePeriodsWarning}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Кнопки действий */}
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isLoading || currentStatus === "completed"}
                >
                  {isLoading ? "Загрузка..." : "Загрузить"}
                </Button>

                {currentStatus === "completed" && uploadId && (
                  <Button
                    variant="outline"
                    onClick={handleRollback}
                    disabled={rollbackMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Откатить загрузку
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* История загрузок */}
          <UploadHistory targetTable={targetTable} limit={10} />
        </div>
      </main>
    </div>
  );
}
