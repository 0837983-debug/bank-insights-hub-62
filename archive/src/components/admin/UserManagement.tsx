import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, UserX, Search, Clock, Shield, ShieldCheck, ShieldX } from "lucide-react";

interface UserRequest {
  id: string;
  email: string;
  name: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  provider: "google" | "apple";
}

interface ActiveUser {
  id: string;
  email: string;
  name: string;
  provider: "google" | "apple";
  authorizedAt: string;
  lastLogin: string;
  isActive: boolean;
}

// Mock data
const mockRequests: UserRequest[] = [
  {
    id: "1",
    email: "petrov@example.com",
    name: "Пётр Петров",
    requestedAt: "2024-01-15 10:30",
    status: "pending",
    provider: "google",
  },
  {
    id: "2",
    email: "sidorov@example.com",
    name: "Сидор Сидоров",
    requestedAt: "2024-01-15 09:15",
    status: "pending",
    provider: "apple",
  },
  {
    id: "3",
    email: "kozlov@example.com",
    name: "Козлов Иван",
    requestedAt: "2024-01-14 16:45",
    status: "pending",
    provider: "google",
  },
];

const mockActiveUsers: ActiveUser[] = [
  {
    id: "1",
    email: "admin@bank.ru",
    name: "Администратор",
    provider: "google",
    authorizedAt: "2024-01-01 09:00",
    lastLogin: "2024-01-15 08:30",
    isActive: true,
  },
  {
    id: "2",
    email: "ivanov@bank.ru",
    name: "Иван Иванов",
    provider: "google",
    authorizedAt: "2024-01-05 11:00",
    lastLogin: "2024-01-14 17:45",
    isActive: true,
  },
  {
    id: "3",
    email: "smirnova@bank.ru",
    name: "Анна Смирнова",
    provider: "apple",
    authorizedAt: "2024-01-08 14:30",
    lastLogin: "2024-01-15 10:00",
    isActive: true,
  },
  {
    id: "4",
    email: "kuznetsov@bank.ru",
    name: "Алексей Кузнецов",
    provider: "google",
    authorizedAt: "2024-01-10 10:00",
    lastLogin: "2024-01-12 09:30",
    isActive: false,
  },
];

export function UserManagement() {
  const [requests, setRequests] = useState<UserRequest[]>(mockRequests);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>(mockActiveUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<ActiveUser | null>(null);

  const handleApprove = (id: string) => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, status: "approved" as const } : r)));
    toast.success("Пользователь авторизован");
  };

  const handleReject = (id: string) => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, status: "rejected" as const } : r)));
    toast.success("Запрос отклонён");
  };

  const handleRevoke = () => {
    if (!userToRevoke) return;
    setActiveUsers(
      activeUsers.map((u) => (u.id === userToRevoke.id ? { ...u, isActive: false } : u))
    );
    toast.success(`Доступ пользователя ${userToRevoke.name} отозван`);
    setRevokeDialogOpen(false);
    setUserToRevoke(null);
  };

  const handleReactivate = (id: string) => {
    setActiveUsers(activeUsers.map((u) => (u.id === id ? { ...u, isActive: true } : u)));
    toast.success("Доступ восстановлен");
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const filteredUsers = activeUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Запросы на авторизацию
              </CardTitle>
              <CardDescription>Ожидают одобрения администратора</CardDescription>
            </div>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="text-lg px-3 py-1">
                {pendingRequests.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Нет ожидающих запросов</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Способ входа</TableHead>
                  <TableHead>Дата запроса</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.name}</TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {request.provider === "google" ? "Google" : "Apple"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{request.requestedAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Одобрить
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(request.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Отклонить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Авторизованные пользователи
              </CardTitle>
              <CardDescription>Управление доступом пользователей</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск пользователя..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Способ входа</TableHead>
                  <TableHead>Авторизован</TableHead>
                  <TableHead>Последний вход</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className={!user.isActive ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.provider === "google" ? "Google" : "Apple"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.authorizedAt}</TableCell>
                    <TableCell className="text-muted-foreground">{user.lastLogin}</TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Активен
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <ShieldX className="h-3 w-3 mr-1" />
                          Отозван
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setUserToRevoke(user);
                            setRevokeDialogOpen(true);
                          }}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Отозвать
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReactivate(user.id)}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          Восстановить
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отзыв авторизации</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите отозвать доступ пользователя{" "}
              <strong>{userToRevoke?.name}</strong>?
              <br />
              Пользователь не сможет войти в систему до повторной авторизации.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleRevoke}>
              <UserX className="h-4 w-4 mr-2" />
              Отозвать доступ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
