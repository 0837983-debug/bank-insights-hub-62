import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUploadHistory } from "@/hooks/useFileUpload";
import { format } from "date-fns";
import { FileText, CheckCircle2, XCircle, Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadHistoryProps {
  targetTable?: string;
  status?: string;
  limit?: number;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof FileText }> = {
  pending: { label: "Ожидание", variant: "outline", icon: Clock },
  processing: { label: "Обработка", variant: "secondary", icon: Clock },
  completed: { label: "Завершена", variant: "default", icon: CheckCircle2 },
  failed: { label: "Ошибка", variant: "destructive", icon: XCircle },
  rolled_back: { label: "Откат", variant: "outline", icon: RotateCcw },
};

export const UploadHistory = ({
  targetTable,
  status,
  limit = 10,
  className,
}: UploadHistoryProps) => {
  const { data, isLoading, error } = useUploadHistory({
    targetTable,
    status,
    limit,
  });

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>
          Ошибка загрузки истории: {error instanceof Error ? error.message : "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>История загрузок</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.uploads.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>История загрузок</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Нет загрузок</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>История загрузок</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.uploads.map((upload) => {
            const statusInfo = statusConfig[upload.status] || statusConfig.pending;
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={upload.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{upload.originalFilename}</span>
                    <Badge variant={statusInfo.variant} className="text-xs">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Обработано: {upload.rowsProcessed ?? 0} / Успешно: {upload.rowsSuccessful ?? 0}
                      {upload.rowsFailed !== null && upload.rowsFailed > 0 && (
                        <span className="text-destructive"> / Ошибок: {upload.rowsFailed}</span>
                      )}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {format(new Date(upload.createdAt), "dd.MM.yyyy, HH:mm")}
                  </div>

                  {upload.rolledBackAt && (
                    <div className="text-xs text-muted-foreground">
                      Откат: {format(new Date(upload.rolledBackAt), "dd.MM.yyyy, HH:mm")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
