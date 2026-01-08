import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search,
  History,
  LogIn,
  LogOut,
  UserCheck,
  UserX,
  Shield,
  Download,
  Filter
} from "lucide-react";

interface AuthLog {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  action: 'login' | 'logout' | 'approved' | 'rejected' | 'revoked' | 'restored';
  provider?: 'google' | 'apple';
  ip?: string;
  adminEmail?: string;
}

// Mock logs
const mockLogs: AuthLog[] = [
  { id: '1', timestamp: '2024-01-15 10:35', userEmail: 'smirnova@bank.ru', userName: 'Анна Смирнова', action: 'login', provider: 'apple', ip: '192.168.1.45' },
  { id: '2', timestamp: '2024-01-15 10:30', userEmail: 'petrov@example.com', userName: 'Пётр Петров', action: 'approved', adminEmail: 'admin@bank.ru' },
  { id: '3', timestamp: '2024-01-15 09:20', userEmail: 'sidorov@example.com', userName: 'Сидор Сидоров', action: 'rejected', adminEmail: 'admin@bank.ru' },
  { id: '4', timestamp: '2024-01-15 08:30', userEmail: 'admin@bank.ru', userName: 'Администратор', action: 'login', provider: 'google', ip: '192.168.1.100' },
  { id: '5', timestamp: '2024-01-14 18:00', userEmail: 'ivanov@bank.ru', userName: 'Иван Иванов', action: 'logout', ip: '192.168.1.32' },
  { id: '6', timestamp: '2024-01-14 17:45', userEmail: 'ivanov@bank.ru', userName: 'Иван Иванов', action: 'login', provider: 'google', ip: '192.168.1.32' },
  { id: '7', timestamp: '2024-01-14 16:00', userEmail: 'kuznetsov@bank.ru', userName: 'Алексей Кузнецов', action: 'revoked', adminEmail: 'admin@bank.ru' },
  { id: '8', timestamp: '2024-01-14 12:30', userEmail: 'kuznetsov@bank.ru', userName: 'Алексей Кузнецов', action: 'login', provider: 'google', ip: '192.168.1.88' },
  { id: '9', timestamp: '2024-01-13 09:00', userEmail: 'kuznetsov@bank.ru', userName: 'Алексей Кузнецов', action: 'restored', adminEmail: 'admin@bank.ru' },
  { id: '10', timestamp: '2024-01-12 15:00', userEmail: 'smirnova@bank.ru', userName: 'Анна Смирнова', action: 'approved', adminEmail: 'admin@bank.ru' },
];

const getActionIcon = (action: AuthLog['action']) => {
  switch (action) {
    case 'login': return <LogIn className="h-4 w-4" />;
    case 'logout': return <LogOut className="h-4 w-4" />;
    case 'approved': return <UserCheck className="h-4 w-4" />;
    case 'rejected': return <UserX className="h-4 w-4" />;
    case 'revoked': return <Shield className="h-4 w-4" />;
    case 'restored': return <Shield className="h-4 w-4" />;
  }
};

const getActionLabel = (action: AuthLog['action']) => {
  switch (action) {
    case 'login': return 'Вход';
    case 'logout': return 'Выход';
    case 'approved': return 'Авторизован';
    case 'rejected': return 'Отклонён';
    case 'revoked': return 'Отозван';
    case 'restored': return 'Восстановлен';
  }
};

const getActionBadgeClass = (action: AuthLog['action']) => {
  switch (action) {
    case 'login': return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'logout': return 'bg-gray-500/10 text-gray-600 border-gray-200';
    case 'approved': return 'bg-green-500/10 text-green-600 border-green-200';
    case 'rejected': return 'bg-red-500/10 text-red-600 border-red-200';
    case 'revoked': return 'bg-orange-500/10 text-orange-600 border-orange-200';
    case 'restored': return 'bg-purple-500/10 text-purple-600 border-purple-200';
  }
};

export function AuthLogs() {
  const [logs] = useState<AuthLog[]>(mockLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const handleExport = () => {
    // Mock export
    const csv = [
      'Дата/время,Пользователь,Email,Действие,IP,Администратор',
      ...filteredLogs.map(log => 
        `${log.timestamp},${log.userName},${log.userEmail},${getActionLabel(log.action)},${log.ip || ''},${log.adminEmail || ''}`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'auth_logs.csv';
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Логи авторизации
            </CardTitle>
            <CardDescription>История входов и изменений доступа</CardDescription>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Поиск по имени или email..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Все действия" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все действия</SelectItem>
                <SelectItem value="login">Вход</SelectItem>
                <SelectItem value="logout">Выход</SelectItem>
                <SelectItem value="approved">Авторизация</SelectItem>
                <SelectItem value="rejected">Отклонение</SelectItem>
                <SelectItem value="revoked">Отзыв</SelectItem>
                <SelectItem value="restored">Восстановление</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Дата/время</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-32">Действие</TableHead>
                <TableHead>Способ входа</TableHead>
                <TableHead>IP адрес</TableHead>
                <TableHead>Администратор</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {log.timestamp}
                  </TableCell>
                  <TableCell className="font-medium">{log.userName}</TableCell>
                  <TableCell>{log.userEmail}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getActionBadgeClass(log.action)}>
                      {getActionIcon(log.action)}
                      <span className="ml-1">{getActionLabel(log.action)}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.provider && (
                      <Badge variant="outline">
                        {log.provider === 'google' ? 'Google' : 'Apple'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {log.ip || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.adminEmail || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
