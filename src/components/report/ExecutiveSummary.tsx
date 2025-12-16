import { useState, useEffect } from "react";
import { KPICard } from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { Settings2Icon, CheckIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { allDashboardKPIs, defaultSelectedKPIs, kpiCategories } from "@/data/dashboard-kpis";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "executive-summary-kpis";

export const ExecutiveSummary = () => {
  const [selectedKPIs, setSelectedKPIs] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultSelectedKPIs;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempSelection, setTempSelection] = useState<string[]>(selectedKPIs);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKPIs));
  }, [selectedKPIs]);

  const handleOpenDialog = () => {
    setTempSelection(selectedKPIs);
    setDialogOpen(true);
  };

  const handleToggleKPI = (kpiId: string) => {
    setTempSelection((prev) =>
      prev.includes(kpiId)
        ? prev.filter((id) => id !== kpiId)
        : [...prev, kpiId]
    );
  };

  const handleSave = () => {
    setSelectedKPIs(tempSelection);
    setDialogOpen(false);
  };

  const handleSelectAll = () => {
    setTempSelection(allDashboardKPIs.map((kpi) => kpi.id));
  };

  const handleClearAll = () => {
    setTempSelection([]);
  };

  const selectedKPIData = allDashboardKPIs.filter((kpi) =>
    selectedKPIs.includes(kpi.id)
  );

  const getKPIsByCategory = (category: string) =>
    allDashboardKPIs.filter((kpi) => kpi.category === category);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-foreground">Executive Summary</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleOpenDialog}
            >
              <Settings2Icon className="w-4 h-4" />
              Настройки
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Выбор показателей для Executive Summary</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">
                Выбрано: {tempSelection.length} из {allDashboardKPIs.length}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Выбрать все
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  Очистить
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {kpiCategories.map((category) => (
                  <div key={category}>
                    <h4 className="font-semibold text-foreground mb-3">{category}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {getKPIsByCategory(category).map((kpi) => {
                        const isSelected = tempSelection.includes(kpi.id);
                        return (
                          <div
                            key={kpi.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50"
                            )}
                            onClick={() => handleToggleKPI(kpi.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleKPI(kpi.id)}
                            />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="p-1.5 bg-accent/10 rounded">
                                {kpi.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">
                                  {kpi.title}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {kpi.value}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave} className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                Сохранить
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedKPIData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Нет выбранных показателей.</p>
          <p className="text-sm mt-1">Нажмите «Настройки» чтобы выбрать метрики.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {selectedKPIData.map((kpi) => (
            <div key={kpi.id} className="flex-1 min-w-[140px] max-w-[220px]">
              <KPICard
                title={kpi.title}
                value={kpi.value}
                description={kpi.description}
                change={kpi.change}
                ytdChange={kpi.ytdChange}
                showChange
                icon={kpi.icon}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
