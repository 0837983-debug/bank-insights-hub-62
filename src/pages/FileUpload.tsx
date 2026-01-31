import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, RotateCcw, FileSpreadsheet, TrendingUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { FileUploader, type FileUploaderRef } from "@/components/upload/FileUploader";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { UploadStagesProgress } from "@/components/upload/UploadStagesProgress";
import { ValidationErrors } from "@/components/upload/ValidationErrors";
import { UploadHistory } from "@/components/upload/UploadHistory";
import { useFileUpload, useUploadStatus, useRollbackUpload, generateSessionId } from "@/hooks/useFileUpload";
import { useUploadProgress } from "@/hooks/useUploadProgress";
import { APIError } from "@/lib/api";
import type { AggregatedValidationError } from "@/lib/api";

export default function FileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetTable, setTargetTable] = useState<string>("balance");
  const [sheetName, setSheetName] = useState<string | undefined>(undefined);
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [progressSessionId, setProgressSessionId] = useState<string | null>(null);
  
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  const { upload, isLoading, progress, error, data: uploadResponse, isSuccess, reset } = useFileUpload({
    targetTable,
    onSuccess: (response) => {
      setUploadId(response.uploadId);
    },
  });

  // Получаем статус загрузки, если есть uploadId
  const { data: uploadStatus } = useUploadStatus(uploadId, uploadId !== null);

  const rollbackMutation = useRollbackUpload();

  // Real-time прогресс через SSE (используем sessionId, который генерируется ДО начала загрузки)
  const { stages: progressStages, isConnected } = useUploadProgress({
    sessionId: progressSessionId,
    onComplete: () => {
      console.log('Upload completed via SSE');
    },
    onError: (error) => {
      console.error('Upload error via SSE:', error);
    }
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    reset(); // Сбрасываем предыдущее состояние
    setUploadId(null);
    setSheetName(undefined);
    setProgressSessionId(null);
  };

  // Обработчик клика по кнопке загрузки
  const handleUploadButtonClick = (table: "balance" | "fin_results") => {
    setTargetTable(table);
    reset();
    setUploadId(null);
    setSelectedFile(null);
    setProgressSessionId(null);
    fileUploaderRef.current?.clearFile();
    // Открываем file picker
    fileUploaderRef.current?.openFilePicker();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Генерируем sessionId ДО начала загрузки для SSE прогресса
    const newSessionId = generateSessionId();
    setProgressSessionId(newSessionId);
    
    // Логирование перед загрузкой
    console.log("Starting upload:", {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
      targetTable,
      sheetName,
      sessionId: newSessionId,
    });

    // Небольшая задержка чтобы SSE успел подключиться
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const response = await upload(selectedFile, sheetName, newSessionId);
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
  
  // Конвертируем validationErrors из формата backend в формат frontend
  const convertValidationErrors = (errors: any): AggregatedValidationError[] | undefined => {
    if (!errors) return undefined;
    
    // Если уже массив - возвращаем как есть
    if (Array.isArray(errors)) {
      return errors;
    }
    
    // Если объект с examples/byType - конвертируем в массив
    if (errors.examples && Array.isArray(errors.examples)) {
      return errors.examples.map((ex: any) => {
        const fieldInfo = ex.field ? `Поле "${ex.field}": ` : '';
        const message = ex.message || 'Ошибка валидации';
        return {
          errorType: ex.type || 'unknown',
          errorMessage: `${fieldInfo}${message}`,
          fieldName: ex.field,
          totalCount: ex.totalAffected || errors.byType?.[ex.type] || 1,
          exampleMessages: [`${fieldInfo}${message}`],
          // Новые поля для детализации ошибок
          rowNumbers: ex.rowNumbers || [],
          sampleValue: ex.sampleValue,
          totalAffected: ex.totalAffected || errors.byType?.[ex.type] || 1,
        };
      });
    }
    
    return undefined;
  };

  // Извлекаем validationErrors из разных источников:
  // 1. Из uploadStatus (если загрузка завершилась с ошибками)
  // 2. Из uploadResponse (если ошибка в ответе)
  // 3. Из error.data (если ошибка при загрузке)
  const validationErrors: AggregatedValidationError[] | undefined = (() => {
    // Сначала проверяем статус загрузки
    if (uploadStatus?.validationErrors) {
      return convertValidationErrors(uploadStatus.validationErrors);
    }
    // Затем проверяем ответ
    if (uploadResponse?.validationErrors) {
      return convertValidationErrors(uploadResponse.validationErrors);
    }
    // Если есть ошибка API, проверяем её data
    if (error && error instanceof APIError && error.data) {
      const errorData = error.data as any;
      if (errorData.validationErrors) {
        return convertValidationErrors(errorData.validationErrors);
      }
    }
    return undefined;
  })();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Загрузка файлов</h1>

        <div className="space-y-6">
          {/* Форма загрузки */}
          <Card data-testid="upload-form">
            <CardHeader>
              <CardTitle>Загрузить файл</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Кнопки выбора типа загрузки */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => handleUploadButtonClick("balance")}
                  disabled={isLoading}
                  data-testid="btn-upload-balance"
                >
                  <FileSpreadsheet className="h-8 w-8" />
                  <span className="font-medium">Загрузить Баланс</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-24 flex flex-col items-center justify-center gap-2"
                  onClick={() => handleUploadButtonClick("fin_results")}
                  disabled={isLoading}
                  data-testid="btn-upload-fin-results"
                >
                  <TrendingUp className="h-8 w-8" />
                  <span className="font-medium">Загрузить Финрез</span>
                </Button>
              </div>

              {/* Скрытый FileUploader для выбора файла */}
              <FileUploader
                ref={fileUploaderRef}
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

              {/* Real-time прогресс стадий */}
              {progressSessionId && (progressStages.length > 0 || isLoading) && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium mb-3 flex items-center gap-2">
                    Прогресс загрузки:
                    {isConnected && <span className="text-xs text-green-600">(SSE подключен)</span>}
                  </div>
                  {progressStages.length > 0 ? (
                    <UploadStagesProgress stages={progressStages} />
                  ) : (
                    <div className="text-sm text-muted-foreground">Ожидание данных...</div>
                  )}
                </div>
              )}

              {/* Ошибки валидации */}
              {validationErrors && validationErrors.length > 0 && (
                <ValidationErrors errors={validationErrors} />
              )}

              {/* Общие ошибки (показываем только если нет validationErrors) */}
              {error && !validationErrors && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Ошибка загрузки</AlertTitle>
                  <AlertDescription>
                    {error instanceof Error ? error.message : "Произошла ошибка при загрузке файла"}
                    {error instanceof APIError && error.data && typeof error.data === 'object' && 'error' in error.data && (
                      <div className="mt-2 text-sm">
                        {String((error.data as any).error)}
                      </div>
                    )}
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

              {/* Информация о выбранной таблице и кнопки действий */}
              {selectedFile && (
                <div className="text-sm text-muted-foreground">
                  Загрузка в: <span className="font-medium text-foreground">{targetTable === "balance" ? "Баланс" : "Финрез"}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isLoading || currentStatus === "completed"}
                  data-testid="btn-upload"
                >
                  {isLoading ? "Загрузка..." : `Загрузить в ${targetTable === "balance" ? "Баланс" : "Финрез"}`}
                </Button>

                {currentStatus === "completed" && uploadId && (
                  <Button
                    variant="outline"
                    onClick={handleRollback}
                    disabled={rollbackMutation.isPending}
                    data-testid="btn-rollback"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Откатить загрузку
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* История загрузок — показываем все загрузки */}
          <UploadHistory limit={10} />
        </div>
      </main>
    </div>
  );
}
