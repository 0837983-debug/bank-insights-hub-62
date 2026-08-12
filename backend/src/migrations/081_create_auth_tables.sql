-- Миграция 081: таблицы авторизации и ролей
-- Схема auth.users — пользователи, auth.refresh_tokens — токены обновления (сессии).

CREATE SCHEMA IF NOT EXISTS auth;

-- Пользователи системы
CREATE TABLE IF NOT EXISTS auth.users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('super_admin', 'manager', 'viewer')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Хранение refresh-токенов (сессий) для управления сроком жизни и отзывом
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON auth.refresh_tokens(token_hash);
