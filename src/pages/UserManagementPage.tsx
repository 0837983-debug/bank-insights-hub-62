/**
 * Страница управления аккаунтами (доступна только супер-админу).
 * Создание/удаление пользователей, назначение ролей, блокировка.
 * Пароли генерируются и показываются один раз.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  apiCreateUser,
  apiDeleteUser,
  apiListUsers,
  apiResetPassword,
  apiSetActive,
  apiUpdateRole,
  type AuthUser,
  type Role,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { toErrorMessage } from "@/lib/error-catalog";

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Супер-админ",
  manager: "Менеджер",
  viewer: "Просмотр",
};

export default function UserManagementPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Форма создания
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<Role>("viewer");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiListUsers();
      setUsers(data.users);
      setError(null);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setCreating(true);
    try {
      const res = await apiCreateUser(newUsername.trim(), newRole);
      setMessage(
        res.generatedPassword
          ? `Пользователь создан. Пароль (показан один раз): ${res.generatedPassword}`
          : "Пользователь создан"
      );
      setNewUsername("");
      setNewRole("viewer");
      await load();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(id: number, role: Role) {
    try {
      await apiUpdateRole(id, role);
      setMessage("Роль обновлена");
      await load();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  async function handleToggleActive(u: AuthUser) {
    try {
      await apiSetActive(u.id, !u.isActive);
      setMessage(u.isActive ? "Пользователь заблокирован" : "Пользователь разблокирован");
      await load();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  async function handleDelete(u: AuthUser) {
    if (!window.confirm(`Удалить пользователя «${u.username}»?`)) return;
    try {
      await apiDeleteUser(u.id);
      setMessage("Пользователь удалён");
      await load();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  async function handleResetPassword(u: AuthUser) {
    try {
      const res = await apiResetPassword(u.id);
      setMessage(
        res.generatedPassword
          ? `Новый пароль для «${u.username}» (показан один раз): ${res.generatedPassword}`
          : "Пароль сброшен"
      );
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-4 text-2xl font-semibold">Управление аккаунтами</h1>

      {error && (
        <p data-testid="users-error" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p data-testid="users-message" className="mb-3 text-sm text-green-600">
          {message}
        </p>
      )}

      {/* Форма создания */}
      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <Label htmlFor="newUsername">Имя пользователя</Label>
          <Input
            id="newUsername"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="например, manager1"
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Роль</Label>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
            <SelectTrigger className="w-44" data-testid="role-select">
              <SelectValue placeholder="Роль" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manager">Менеджер</SelectItem>
              <SelectItem value="viewer">Просмотр</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={creating}>
          {creating ? "Создание..." : "Создать"}
        </Button>
      </form>

      {/* Таблица пользователей */}
      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Имя</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>
                  {u.username}
                  {me && me.id === u.id && (
                    <Badge className="ml-2" variant="secondary">это вы</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    disabled={u.role === "super_admin"}
                    onValueChange={(v) => handleRoleChange(u.id, v as Role)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Менеджер</SelectItem>
                      <SelectItem value="viewer">Просмотр</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "default" : "destructive"}>
                    {u.isActive ? "Активен" : "Заблокирован"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={u.role === "super_admin" || (me?.id === u.id)}
                      onClick={() => handleToggleActive(u)}
                      data-testid={`btn-toggle-${u.username}`}
                    >
                      {u.isActive ? "Заблокировать" : "Разблокировать"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(u)}
                      data-testid={`btn-reset-${u.username}`}
                    >
                      Сброс пароля
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={me?.id === u.id}
                      onClick={() => handleDelete(u)}
                      data-testid={`btn-delete-${u.username}`}
                    >
                      Удалить
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
