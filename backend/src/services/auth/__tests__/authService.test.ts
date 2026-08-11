/**
 * Тесты сервиса авторизации (репозиторий замокан).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword } from "../passwordService.js";
import { signRefreshToken } from "../tokenService.js";
import * as repo from "../userRepository.js";
import {
  login,
  refresh,
  logout,
  ensureSuperAdmin,
  AuthError,
} from "../authService.js";

// Мокаем репозиторий — тесты не обращаются к БД
vi.mock("../userRepository.js", () => ({
  findByUsername: vi.fn(),
  findById: vi.fn(),
  createUser: vi.fn(),
  saveRefreshToken: vi.fn(),
  isRefreshTokenValid: vi.fn(),
  revokeRefreshToken: vi.fn(),
  revokeAllUserTokens: vi.fn(),
}));

const mockedRepo = vi.mocked(repo);

// Очистка моков между всеми тестами (реализации и вызовы)
beforeEach(() => {
  vi.resetAllMocks();
});

const activeUser = {
  id: 1,
  username: "admin",
  role: "super_admin" as const,
  isActive: true,
  createdAt: "2026-08-11T00:00:00.000Z",
};

async function makePasswordHash(password: string): Promise<string> {
  return hashPassword(password);
}

describe("authService.login", () => {
  it("пускает при верном пароле и выдаёт токены", async () => {
    const passwordHash = await makePasswordHash("secret");
    mockedRepo.findByUsername.mockResolvedValue({ ...activeUser, passwordHash });
    mockedRepo.saveRefreshToken.mockResolvedValue(undefined);

    const result = await login({ username: "admin", password: "secret" });
    expect(result.auth.user.username).toBe("admin");
    expect(result.auth.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(mockedRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
  });

  it("отказывает при неверном пароле", async () => {
    const passwordHash = await makePasswordHash("secret");
    mockedRepo.findByUsername.mockResolvedValue({ ...activeUser, passwordHash });

    await expect(login({ username: "admin", password: "wrong" })).rejects.toThrow(
      AuthError
    );
    expect(mockedRepo.saveRefreshToken).not.toHaveBeenCalled();
  });

  it("отказывает заблокированному пользователю", async () => {
    const passwordHash = await makePasswordHash("secret");
    mockedRepo.findByUsername.mockResolvedValue({
      ...activeUser,
      isActive: false,
      passwordHash,
    });

    await expect(login({ username: "admin", password: "secret" })).rejects.toThrow(
      AuthError
    );
  });

  it("отказывает несуществующему пользователю", async () => {
    mockedRepo.findByUsername.mockResolvedValue(null);
    await expect(
      login({ username: "nobody", password: "x" })
    ).rejects.toThrow(AuthError);
  });
});

describe("authService.refresh", () => {
  it("выдаёт новую пару токенов при валидной сессии", async () => {
    const real = signRefreshToken(1);
    mockedRepo.findById.mockResolvedValue(activeUser);
    mockedRepo.isRefreshTokenValid.mockResolvedValue(true);
    mockedRepo.revokeRefreshToken.mockResolvedValue(undefined);
    mockedRepo.saveRefreshToken.mockResolvedValue(undefined);

    const result = await refresh(real.token);
    expect(result.auth.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(mockedRepo.revokeRefreshToken).toHaveBeenCalledWith(real.token);
  });

  it("отклоняет невалидный refresh-токен", async () => {
    await expect(refresh("garbage")).rejects.toThrow(AuthError);
  });
});

describe("authService.ensureSuperAdmin", () => {
  it("создаёт супер-админа, если его нет", async () => {
    mockedRepo.findByUsername.mockResolvedValue(null);
    mockedRepo.createUser.mockResolvedValue(activeUser);

    await ensureSuperAdmin();
    expect(mockedRepo.createUser).toHaveBeenCalledTimes(1);
    const args = mockedRepo.createUser.mock.calls[0][0];
    expect(args.role).toBe("super_admin");
    expect(args.passwordHash).toBeTruthy();
  });

  it("не создаёт повторно существующего супер-админа", async () => {
    mockedRepo.findByUsername.mockResolvedValue(activeUser);

    await ensureSuperAdmin();
    expect(mockedRepo.createUser).not.toHaveBeenCalled();
  });
});

describe("authService.logout", () => {
  it("отзывает refresh-токен", async () => {
    mockedRepo.revokeRefreshToken.mockResolvedValue(undefined);
    await logout("some-token");
    expect(mockedRepo.revokeRefreshToken).toHaveBeenCalledWith("some-token");
  });

  it("ничего не делает без токена", async () => {
    await logout(undefined);
    expect(mockedRepo.revokeRefreshToken).not.toHaveBeenCalled();
  });
});
