import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[];
  maxSize?: number; // в байтах
  className?: string;
  disabled?: boolean;
}

export const FileUploader = ({
  onFileSelect,
  acceptedFormats = [".csv", ".xlsx"],
  maxSize = 50 * 1024 * 1024, // 50MB по умолчанию
  className,
  disabled = false,
}: FileUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Проверка типа файла
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      const allowedExtensions = acceptedFormats.map((f) => f.replace(".", "").toLowerCase());

      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        return `Неподдерживаемый формат файла. Поддерживаются: ${acceptedFormats.join(", ")}`;
      }

      // Проверка размера
      if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
        return `Размер файла превышает ${maxSizeMB}MB`;
      }

      return null;
    },
    [acceptedFormats, maxSize]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }

      setError(null);
      setSelectedFile(file);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Выберите файл</Label>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          !selectedFile && !error && "border-muted-foreground/25 hover:border-primary/50",
          error && "border-destructive",
          selectedFile && !error && "border-primary/50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <Input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(",")}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2 text-center">
          {selectedFile ? (
            <>
              <FileText className="h-8 w-8 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Удалить
                </Button>
              )}
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Перетащите файл сюда или нажмите для выбора
                </p>
                <p className="text-xs text-muted-foreground">
                  Поддерживаются форматы: {acceptedFormats.join(", ")}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};
