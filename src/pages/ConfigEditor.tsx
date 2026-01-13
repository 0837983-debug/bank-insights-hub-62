import { useState } from "react";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Settings,
  Palette,
  LayoutGrid,
  Table as TableIcon,
  Plus,
  Pencil,
  Trash2,
  Save,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  ChevronRight,
  Search,
  Users,
  History,
  Upload,
} from "lucide-react";
import { UserManagement } from "@/components/admin/UserManagement";
import { AuthLogs } from "@/components/admin/AuthLogs";
import { UploadManagement } from "@/components/admin/UploadManagement";
import {
  Format,
  Component,
  ComponentField,
  Layout,
  LayoutComponentMapping,
  mockFormats,
  mockComponents,
  mockComponentFields,
  mockLayouts,
  mockLayoutMappings,
} from "@/types/config";

// Format Editor Component
function FormatEditor({
  format,
  onSave,
  onClose,
}: {
  format: Format | null;
  onSave: (f: Format) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Format>(
    format || {
      id: "",
      name: "",
      kind: "number",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      thousandSeparator: true,
      shorten: false,
      displayOrder: 0,
      isActive: true,
      isSystem: false,
    }
  );

  const handleSubmit = () => {
    if (!formData.id || !formData.name) {
      toast.error("ID и название обязательны");
      return;
    }
    onSave(formData);
    toast.success(format ? "Формат обновлён" : "Формат создан");
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="id">ID формата</Label>
          <Input
            id="id"
            value={formData.id}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            disabled={!!format}
            placeholder="currency_rub"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Название</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Рубли с сокращением"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="kind">Тип</Label>
          <Select
            value={formData.kind}
            onValueChange={(v) => setFormData({ ...formData, kind: v as Format["kind"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Число</SelectItem>
              <SelectItem value="currency">Валюта</SelectItem>
              <SelectItem value="percent">Процент</SelectItem>
              <SelectItem value="date">Дата</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prefix">Префикс</Label>
          <Input
            id="prefix"
            value={formData.prefixUnitSymbol || ""}
            onChange={(e) =>
              setFormData({ ...formData, prefixUnitSymbol: e.target.value || undefined })
            }
            placeholder="₽"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="suffix">Суффикс</Label>
          <Input
            id="suffix"
            value={formData.suffixUnitSymbol || ""}
            onChange={(e) =>
              setFormData({ ...formData, suffixUnitSymbol: e.target.value || undefined })
            }
            placeholder="%"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minDigits">Мин. знаков</Label>
          <Input
            id="minDigits"
            type="number"
            min={0}
            max={10}
            value={formData.minimumFractionDigits}
            onChange={(e) =>
              setFormData({ ...formData, minimumFractionDigits: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxDigits">Макс. знаков</Label>
          <Input
            id="maxDigits"
            type="number"
            min={0}
            max={10}
            value={formData.maximumFractionDigits}
            onChange={(e) =>
              setFormData({ ...formData, maximumFractionDigits: parseInt(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Категория</Label>
          <Input
            id="category"
            value={formData.category || ""}
            onChange={(e) => setFormData({ ...formData, category: e.target.value || undefined })}
            placeholder="currency"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="order">Порядок</Label>
          <Input
            id="order"
            type="number"
            value={formData.displayOrder}
            onChange={(e) =>
              setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="thousandSep"
            checked={formData.thousandSeparator}
            onCheckedChange={(v) => setFormData({ ...formData, thousandSeparator: v })}
          />
          <Label htmlFor="thousandSep">Разделитель тысяч</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="shorten"
            checked={formData.shorten}
            onCheckedChange={(v) => setFormData({ ...formData, shorten: v })}
          />
          <Label htmlFor="shorten">Сокращать (K/M/B)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
          />
          <Label htmlFor="isActive">Активен</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })}
          placeholder="Описание формата..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="example">Пример</Label>
        <Input
          id="example"
          value={formData.example || ""}
          onChange={(e) => setFormData({ ...formData, example: e.target.value || undefined })}
          placeholder="8200000 → ₽8.2B"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={handleSubmit}>
          <Save className="w-4 h-4 mr-2" />
          Сохранить
        </Button>
      </DialogFooter>
    </div>
  );
}

// Component Editor
function ComponentEditor({
  component,
  formats,
  onSave,
  onClose,
}: {
  component: Component | null;
  formats: Format[];
  onSave: (c: Component) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Component>(
    component || {
      id: "",
      componentType: "card",
      isActive: true,
    }
  );

  const handleSubmit = () => {
    if (!formData.id) {
      toast.error("ID компонента обязателен");
      return;
    }
    onSave(formData);
    toast.success(component ? "Компонент обновлён" : "Компонент создан");
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="id">ID компонента</Label>
          <Input
            id="id"
            value={formData.id}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            disabled={!!component}
            placeholder="capital_card"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Тип</Label>
          <Select
            value={formData.componentType}
            onValueChange={(v) =>
              setFormData({ ...formData, componentType: v as Component["componentType"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="container">Контейнер (секция)</SelectItem>
              <SelectItem value="card">Карточка</SelectItem>
              <SelectItem value="table">Таблица</SelectItem>
              <SelectItem value="chart">График</SelectItem>
              <SelectItem value="filter">Фильтр</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Заголовок</Label>
          <Input
            id="title"
            value={formData.title || ""}
            onChange={(e) => setFormData({ ...formData, title: e.target.value || undefined })}
            placeholder="Капитал"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label">Метка</Label>
          <Input
            id="label"
            value={formData.label || ""}
            onChange={(e) => setFormData({ ...formData, label: e.target.value || undefined })}
            placeholder="Капитал"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="icon">Иконка</Label>
          <Input
            id="icon"
            value={formData.icon || ""}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value || undefined })}
            placeholder="Landmark"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataSource">Ключ источника данных</Label>
          <Input
            id="dataSource"
            value={formData.dataSourceKey || ""}
            onChange={(e) =>
              setFormData({ ...formData, dataSourceKey: e.target.value || undefined })
            }
            placeholder="capital"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Категория</Label>
          <Select
            value={formData.category || ""}
            onValueChange={(v) => setFormData({ ...formData, category: v || undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="section">Секция</SelectItem>
              <SelectItem value="card">Карточка</SelectItem>
              <SelectItem value="table">Таблица</SelectItem>
              <SelectItem value="chart">График</SelectItem>
              <SelectItem value="filter">Фильтр</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
            />
            <Label htmlFor="isActive">Активен</Label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tooltip">Подсказка</Label>
        <Textarea
          id="tooltip"
          value={formData.tooltip || ""}
          onChange={(e) => setFormData({ ...formData, tooltip: e.target.value || undefined })}
          placeholder="Подсказка при наведении..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })}
          placeholder="Описание компонента..."
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={handleSubmit}>
          <Save className="w-4 h-4 mr-2" />
          Сохранить
        </Button>
      </DialogFooter>
    </div>
  );
}

// Main Config Editor Page
export default function ConfigEditor() {
  const [formats, setFormats] = useState<Format[]>(mockFormats);
  const [components, setComponents] = useState<Component[]>(mockComponents);
  const [componentFields, setComponentFields] = useState<ComponentField[]>(mockComponentFields);
  const [layouts, setLayouts] = useState<Layout[]>(mockLayouts);
  const [layoutMappings, setLayoutMappings] =
    useState<LayoutComponentMapping[]>(mockLayoutMappings);

  const [searchTerm, setSearchTerm] = useState("");
  const [editingFormat, setEditingFormat] = useState<Format | null>(null);
  const [isFormatDialogOpen, setIsFormatDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<string>(layouts[0]?.id || "");

  // Formats tab handlers
  const handleSaveFormat = (format: Format) => {
    if (editingFormat) {
      setFormats(formats.map((f) => (f.id === format.id ? format : f)));
    } else {
      setFormats([...formats, format]);
    }
  };

  const handleDeleteFormat = (id: string) => {
    const format = formats.find((f) => f.id === id);
    if (format?.isSystem) {
      toast.error("Системные форматы нельзя удалить");
      return;
    }
    setFormats(formats.filter((f) => f.id !== id));
    toast.success("Формат удалён");
  };

  // Components tab handlers
  const handleSaveComponent = (component: Component) => {
    if (editingComponent) {
      setComponents(components.map((c) => (c.id === component.id ? component : c)));
    } else {
      setComponents([...components, component]);
    }
  };

  const handleDeleteComponent = (id: string) => {
    setComponents(components.filter((c) => c.id !== id));
    toast.success("Компонент удалён");
  };

  const handleToggleComponentActive = (id: string) => {
    setComponents(components.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)));
  };

  // Layout mapping handlers
  const handleToggleMappingVisible = (id: number) => {
    setLayoutMappings(
      layoutMappings.map((m) => (m.id === id ? { ...m, isVisible: !m.isVisible } : m))
    );
    toast.success("Видимость изменена");
  };

  // Filter functions
  const filteredFormats = formats.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredComponents = components.filter(
    (c) =>
      c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLayoutMappings = layoutMappings
    .filter((m) => m.layoutId === selectedLayout)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Group mappings by section
  const sectionMappings = selectedLayoutMappings.filter((m) => !m.parentInstanceId);
  const getChildMappings = (parentId: string) =>
    selectedLayoutMappings.filter((m) => m.parentInstanceId === parentId);

  const getComponentById = (id: string) => components.find((c) => c.id === id);

  const getCategoryBadgeColor = (category?: string) => {
    switch (category) {
      case "section":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "card":
        return "bg-green-500/10 text-green-600 border-green-200";
      case "table":
        return "bg-purple-500/10 text-purple-600 border-purple-200";
      case "chart":
        return "bg-orange-500/10 text-orange-600 border-orange-200";
      case "filter":
        return "bg-gray-500/10 text-gray-600 border-gray-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "container":
        return "bg-blue-500/10 text-blue-600";
      case "card":
        return "bg-green-500/10 text-green-600";
      case "table":
        return "bg-purple-500/10 text-purple-600";
      case "chart":
        return "bg-orange-500/10 text-orange-600";
      case "filter":
        return "bg-gray-500/10 text-gray-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Панель администратора</h1>
            <p className="text-muted-foreground mt-1">
              Управление пользователями, загрузками и конфигурацией
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-7">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Логи
            </TabsTrigger>
            <TabsTrigger value="uploads" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Загрузки
            </TabsTrigger>
            <TabsTrigger value="formats" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Форматы
            </TabsTrigger>
            <TabsTrigger value="components" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Компоненты
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              Поля
            </TabsTrigger>
            <TabsTrigger value="layouts" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Макеты
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <AuthLogs />
          </TabsContent>

          {/* Uploads Tab */}
          <TabsContent value="uploads">
            <UploadManagement />
          </TabsContent>

          {/* Formats Tab */}
          <TabsContent value="formats" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Форматы отображения</CardTitle>
                  <CardDescription>
                    Настройки форматирования чисел, валют и процентов
                  </CardDescription>
                </div>
                <Dialog open={isFormatDialogOpen} onOpenChange={setIsFormatDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingFormat(null);
                        setIsFormatDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить формат
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingFormat ? "Редактировать формат" : "Новый формат"}
                      </DialogTitle>
                      <DialogDescription>
                        Настройте параметры форматирования значений
                      </DialogDescription>
                    </DialogHeader>
                    <FormatEditor
                      format={editingFormat}
                      onSave={handleSaveFormat}
                      onClose={() => setIsFormatDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">ID</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead className="w-24">Тип</TableHead>
                        <TableHead className="w-32">Префикс/Суффикс</TableHead>
                        <TableHead className="w-32">Пример</TableHead>
                        <TableHead className="w-24">Статус</TableHead>
                        <TableHead className="w-32 text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFormats.map((format) => (
                        <TableRow key={format.id}>
                          <TableCell className="font-mono text-sm">{format.id}</TableCell>
                          <TableCell className="font-medium">{format.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                format.category === "currency"
                                  ? "bg-green-500/10 text-green-600"
                                  : format.category === "percent"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-gray-500/10"
                              }
                            >
                              {format.category || format.kind}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {format.prefixUnitSymbol || ""}
                            {format.suffixUnitSymbol || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format.example || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {format.isActive ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-200">
                                  Активен
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Неактивен</Badge>
                              )}
                              {format.isSystem && <Badge variant="outline">Системный</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingFormat(format);
                                  setIsFormatDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  navigator.clipboard.writeText(format.id);
                                  toast.success("ID скопирован");
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={format.isSystem}
                                onClick={() => handleDeleteFormat(format.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Компоненты</CardTitle>
                  <CardDescription>Карточки, таблицы, секции и фильтры</CardDescription>
                </div>
                <Dialog open={isComponentDialogOpen} onOpenChange={setIsComponentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingComponent(null);
                        setIsComponentDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить компонент
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingComponent ? "Редактировать компонент" : "Новый компонент"}
                      </DialogTitle>
                      <DialogDescription>Настройте параметры компонента</DialogDescription>
                    </DialogHeader>
                    <ComponentEditor
                      component={editingComponent}
                      formats={formats}
                      onSave={handleSaveComponent}
                      onClose={() => setIsComponentDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">ID</TableHead>
                        <TableHead>Заголовок</TableHead>
                        <TableHead className="w-28">Тип</TableHead>
                        <TableHead className="w-28">Категория</TableHead>
                        <TableHead className="w-40">Источник данных</TableHead>
                        <TableHead className="w-24">Статус</TableHead>
                        <TableHead className="w-32 text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredComponents.map((component) => (
                        <TableRow
                          key={component.id}
                          className={!component.isActive ? "opacity-50" : ""}
                        >
                          <TableCell className="font-mono text-sm">{component.id}</TableCell>
                          <TableCell className="font-medium">{component.title || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getTypeBadgeColor(component.componentType)}
                            >
                              {component.componentType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getCategoryBadgeColor(component.category)}
                            >
                              {component.category || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {component.dataSourceKey || "-"}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={component.isActive}
                              onCheckedChange={() => handleToggleComponentActive(component.id)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingComponent(component);
                                  setIsComponentDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteComponent(component.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fields Tab */}
          <TabsContent value="fields" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Поля компонентов</CardTitle>
                <CardDescription>Колонки таблиц и поля карточек</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label>Фильтр по компоненту</Label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-64 mt-1">
                      <SelectValue placeholder="Все компоненты" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все компоненты</SelectItem>
                      {components
                        .filter((c) => c.componentType === "table")
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title || c.id}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="h-[450px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Компонент</TableHead>
                        <TableHead className="w-32">ID поля</TableHead>
                        <TableHead>Метка</TableHead>
                        <TableHead className="w-24">Тип</TableHead>
                        <TableHead className="w-32">Формат</TableHead>
                        <TableHead className="w-20">Порядок</TableHead>
                        <TableHead className="w-24">Видим</TableHead>
                        <TableHead className="w-24">Сортир.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {componentFields.map((field) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-mono text-sm">{field.componentId}</TableCell>
                          <TableCell className="font-mono text-sm">{field.fieldId}</TableCell>
                          <TableCell className="font-medium">{field.label || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{field.fieldType}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {field.formatId || "-"}
                          </TableCell>
                          <TableCell>{field.displayOrder}</TableCell>
                          <TableCell>
                            <Switch checked={field.isVisible} />
                          </TableCell>
                          <TableCell>
                            <Switch checked={field.isSortable} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Layouts Tab */}
          <TabsContent value="layouts" className="space-y-4">
            <div className="grid grid-cols-3 gap-6">
              {/* Layout selector */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Макеты</CardTitle>
                  <CardDescription>Выберите макет для редактирования</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {layouts.map((layout) => (
                    <div
                      key={layout.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedLayout === layout.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedLayout(layout.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{layout.name}</span>
                        {layout.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            По умолчанию
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{layout.description}</p>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Новый макет
                  </Button>
                </CardContent>
              </Card>

              {/* Layout structure */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Структура макета</CardTitle>
                  <CardDescription>Иерархия компонентов в макете</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[450px]">
                    <div className="space-y-4">
                      {sectionMappings.map((section) => {
                        const sectionComponent = getComponentById(section.componentId);
                        const children = getChildMappings(section.instanceId);

                        return (
                          <div key={section.id} className="border rounded-lg">
                            <div className="flex items-center justify-between p-3 bg-muted/30">
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                                  Секция
                                </Badge>
                                <span className="font-medium">
                                  {sectionComponent?.title || section.instanceId}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleMappingVisible(section.id)}
                                >
                                  {section.isVisible ? (
                                    <Eye className="h-4 w-4" />
                                  ) : (
                                    <EyeOff className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="p-2 space-y-1">
                              {children.map((child) => {
                                const childComponent = getComponentById(child.componentId);
                                return (
                                  <div
                                    key={child.id}
                                    className={`flex items-center justify-between p-2 rounded hover:bg-muted/50 ${!child.isVisible ? "opacity-50" : ""}`}
                                  >
                                    <div className="flex items-center gap-2 ml-6">
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                      <Badge
                                        variant="outline"
                                        className={getTypeBadgeColor(
                                          childComponent?.componentType || ""
                                        )}
                                      >
                                        {childComponent?.componentType}
                                      </Badge>
                                      <span className="text-sm">
                                        {childComponent?.title || child.instanceId}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground mr-2">
                                        #{child.displayOrder}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleToggleMappingVisible(child.id)}
                                      >
                                        {child.isVisible ? (
                                          <Eye className="h-3 w-3" />
                                        ) : (
                                          <EyeOff className="h-3 w-3" />
                                        )}
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
