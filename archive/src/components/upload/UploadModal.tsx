import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileIcon,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadType } from "@/pages/FileUpload";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadType: UploadType;
}

interface UploadedFile {
  file: File;
  id: string;
}

interface ValidationStep {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "error";
  message?: string;
  details?: ValidationError[];
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  expected: string;
}

export const UploadModal = ({ isOpen, onClose, uploadType }: UploadModalProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>([]);
  const [progress, setProgress] = useState(0);

  const acceptedFormats = uploadType.acceptedFormats.join(",");

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const newFiles: UploadedFile[] = Array.from(selectedFiles).map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
      setValidationComplete(false);
      setValidationSteps([]);
      setHasErrors(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles) {
        const newFiles: UploadedFile[] = Array.from(droppedFiles)
          .filter((file) => {
            const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
            return uploadType.acceptedFormats.includes(ext);
          })
          .map((file) => ({
            file,
            id: `${file.name}-${Date.now()}-${Math.random()}`,
          }));
        setFiles((prev) => [...prev, ...newFiles]);
        setValidationComplete(false);
        setValidationSteps([]);
        setHasErrors(false);
      }
    },
    [uploadType.acceptedFormats]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setValidationComplete(false);
    setValidationSteps([]);
    setHasErrors(false);
  };

  const simulateValidation = async () => {
    setIsValidating(true);
    setProgress(0);
    setHasErrors(false);

    const steps: ValidationStep[] = [
      { id: "format", name: "Проверка формата файла", status: "pending" },
      { id: "structure", name: "Проверка структуры данных", status: "pending" },
      { id: "columns", name: "Проверка наличия обязательных колонок", status: "pending" },
      { id: "types", name: "Валидация типов данных", status: "pending" },
      { id: "values", name: "Проверка значений", status: "pending" },
      { id: "duplicates", name: "Проверка на дубликаты", status: "pending" },
    ];

    setValidationSteps(steps);

    // Simulate random errors (30% chance of error on any step)
    const shouldHaveError = Math.random() < 0.3;
    const errorStepIndex = shouldHaveError ? Math.floor(Math.random() * steps.length) : -1;

    for (let i = 0; i < steps.length; i++) {
      // Update current step to running
      setValidationSteps((prev) =>
        prev.map((step, idx) => (idx === i ? { ...step, status: "running" } : step))
      );

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

      const isError = i === errorStepIndex;

      if (isError) {
        // Generate sample errors
        const sampleErrors: ValidationError[] = [
          { row: 15, column: "Сумма", value: "abc", expected: "Число" },
          { row: 23, column: "Дата", value: "31.02.2024", expected: "Корректная дата" },
          { row: 47, column: "Сумма", value: "-", expected: "Число" },
        ];

        setValidationSteps((prev) =>
          prev.map((step, idx) =>
            idx === i
              ? {
                  ...step,
                  status: "error",
                  message: "Обнаружены ошибки в данных",
                  details: sampleErrors,
                }
              : step
          )
        );
        setHasErrors(true);
        setProgress(((i + 1) / steps.length) * 100);
        break;
      } else {
        setValidationSteps((prev) =>
          prev.map((step, idx) =>
            idx === i ? { ...step, status: "success", message: "Успешно" } : step
          )
        );
      }

      setProgress(((i + 1) / steps.length) * 100);
    }

    setIsValidating(false);
    setValidationComplete(true);
  };

  const handleRetry = () => {
    setValidationComplete(false);
    setValidationSteps([]);
    setHasErrors(false);
    setProgress(0);
  };

  const handleConfirm = () => {
    // Here would be the actual upload to database
    alert("Данные успешно загружены в базу данных!");
    onClose();
    resetState();
  };

  const resetState = () => {
    setFiles([]);
    setIsValidating(false);
    setValidationComplete(false);
    setValidationSteps([]);
    setHasErrors(false);
    setProgress(0);
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allStepsSuccessful =
    validationComplete && !hasErrors && validationSteps.every((s) => s.status === "success");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-5 w-5 text-primary" />
            {uploadType.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Drop Zone */}
          {!isValidating && !validationComplete && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept={acceptedFormats}
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-1">
                  Перетащите файлы сюда или нажмите для выбора
                </p>
                <p className="text-sm text-muted-foreground">
                  Поддерживаемые форматы: {uploadType.acceptedFormats.join(", ")}
                </p>
              </label>
            </div>
          )}

          {/* Selected Files */}
          {files.length > 0 && !isValidating && !validationComplete && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                Выбранные файлы ({files.length})
              </h4>
              <div className="space-y-2">
                {files.map((uploadedFile) => (
                  <div
                    key={uploadedFile.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{uploadedFile.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadedFile.file.size)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(uploadedFile.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected Columns Info */}
          {files.length > 0 && !isValidating && !validationComplete && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Ожидаемые колонки:</h4>
              <div className="flex flex-wrap gap-2">
                {uploadType.expectedColumns.map((col) => (
                  <span key={col} className="px-2 py-1 bg-background rounded text-xs font-medium">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Validation Progress */}
          {(isValidating || validationComplete) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Прогресс проверки</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-2">
                {validationSteps.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "p-3 rounded-lg border transition-colors",
                      step.status === "pending" && "border-muted bg-muted/20",
                      step.status === "running" && "border-primary bg-primary/5",
                      step.status === "success" && "border-green-500/50 bg-green-500/10",
                      step.status === "error" && "border-destructive/50 bg-destructive/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {step.status === "pending" && (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        {step.status === "running" && (
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        )}
                        {step.status === "success" && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {step.status === "error" && (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <span className="font-medium text-sm">{step.name}</span>
                      </div>
                      {step.message && (
                        <span
                          className={cn(
                            "text-xs",
                            step.status === "success" && "text-green-600",
                            step.status === "error" && "text-destructive"
                          )}
                        >
                          {step.message}
                        </span>
                      )}
                    </div>

                    {/* Error Details */}
                    {step.status === "error" && step.details && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Найдены ошибки в следующих строках:</span>
                        </div>
                        <div className="bg-background rounded p-3 space-y-1 text-sm">
                          <div className="grid grid-cols-4 gap-2 font-medium text-muted-foreground pb-2 border-b">
                            <span>Строка</span>
                            <span>Колонка</span>
                            <span>Значение</span>
                            <span>Ожидается</span>
                          </div>
                          {step.details.map((error, idx) => (
                            <div key={idx} className="grid grid-cols-4 gap-2 text-destructive">
                              <span>{error.row}</span>
                              <span>{error.column}</span>
                              <span className="font-mono">"{error.value}"</span>
                              <span>{error.expected}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Отмена
            </Button>

            {!isValidating && !validationComplete && files.length > 0 && (
              <Button onClick={simulateValidation} className="gap-2">
                <Upload className="h-4 w-4" />
                Загрузить и проверить
              </Button>
            )}

            {validationComplete && hasErrors && (
              <Button onClick={handleRetry} variant="secondary" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Загрузить снова
              </Button>
            )}

            {allStepsSuccessful && (
              <Button onClick={handleConfirm} className="gap-2 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Подтвердить загрузку
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
