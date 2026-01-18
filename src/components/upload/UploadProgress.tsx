import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  progress: number; // 0-100
  status?: "pending" | "processing" | "completed" | "failed";
  className?: string;
}

export const UploadProgress = ({ progress, status, className }: UploadProgressProps) => {
  const isProcessing = status === "processing" || status === "pending";

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {isProcessing ? "Загрузка..." : status === "completed" ? "Загрузка завершена" : "Ожидание"}
        </span>
        <div className="flex items-center gap-2">
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <span className="font-medium">{progress}%</span>
        </div>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};
