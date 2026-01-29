import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { AggregatedValidationError } from "@/lib/api";

interface ValidationErrorsProps {
  errors: AggregatedValidationError[];
  className?: string;
}

export const ValidationErrors = ({ errors, className }: ValidationErrorsProps) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div className={className} data-testid="validation-errors">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ошибки валидации данных</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="border-l-2 border-destructive pl-3 py-1" data-testid={`validation-error-${index}`}>
              <div className="font-semibold text-sm">{error.errorMessage}</div>
              {error.exampleMessages && error.exampleMessages.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  <div className="font-medium mb-1">Примеры:</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {error.exampleMessages.slice(0, 2).map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
              {error.totalCount > (error.exampleMessages?.length || 0) && (
                <div className="text-xs text-muted-foreground mt-1">
                  Всего ошибок этого типа: {error.totalCount}
                </div>
              )}
            </div>
          ))}
        </AlertDescription>
      </Alert>
    </div>
  );
};
