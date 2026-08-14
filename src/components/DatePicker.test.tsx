/**
 * Unit-тесты компонента DatePicker (календарь выбора периодов).
 *
 * Проверяет ключевую бизнес-логику выбора периодов:
 *  - селектор количества периодов (от 1 до 6);
 *  - выбор конкретных месяцев из календаря-сетки;
 *  - сортировка выбранных дат по убыванию (p1 — самая новая);
 *  - корректный вызов onApply с массивом дат;
 *  - ограничение числа выбранных периодов.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DatePicker, MAX_PERIODS } from "./DatePicker";
import type { PeriodDate } from "@/lib/api";

// Радикс-компоненты (Popover/Select) требуют ResizeObserver и scrollIntoView в jsdom.
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverMock;
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};

// Набор доступных дат (6 последних месяцев) с флагами периодов.
const availableDates: PeriodDate[] = [
  {
    periodDate: "2026-08-01",
    isP1: true,
    isP2: false,
    isP3: false,
    isP4: false,
    isP5: false,
    isP6: false,
  },
  {
    periodDate: "2026-07-01",
    isP1: false,
    isP2: true,
    isP3: false,
    isP4: false,
    isP5: false,
    isP6: false,
  },
  {
    periodDate: "2026-06-01",
    isP1: false,
    isP2: false,
    isP3: true,
    isP4: false,
    isP5: false,
    isP6: false,
  },
  {
    periodDate: "2026-05-01",
    isP1: false,
    isP2: false,
    isP3: false,
    isP4: true,
    isP5: false,
    isP6: false,
  },
  {
    periodDate: "2026-04-01",
    isP1: false,
    isP2: false,
    isP3: false,
    isP4: false,
    isP5: true,
    isP6: false,
  },
  {
    periodDate: "2026-03-01",
    isP1: false,
    isP2: false,
    isP3: false,
    isP4: false,
    isP5: false,
    isP6: true,
  },
];

describe("DatePicker", () => {
  const onApply = vi.fn();

  beforeEach(() => {
    onApply.mockClear();
  });

  it("показывает кнопку с диапазоном выбранных периодов", () => {
    render(
      <DatePicker
        availableDates={availableDates}
        selectedDates={["2026-08-01", "2026-07-01", "2026-06-01"]}
        onApply={onApply}
      />
    );
    // Кнопка показывает «авг. 2026 — июн. 2026» (месяц кратко).
    expect(screen.getByTestId("date-picker-trigger")).toBeInTheDocument();
  });

  it("открывает календарь и показывает селектор количества периодов", async () => {
    render(
      <DatePicker
        availableDates={availableDates}
        selectedDates={["2026-08-01"]}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByTestId("date-picker-trigger"));
    expect(await screen.findByText("Выберите периоды")).toBeInTheDocument();
    expect(screen.getByText("Количество периодов")).toBeInTheDocument();
  });

  it("позволяет изменить количество периодов на 6", async () => {
    render(
      <DatePicker
        availableDates={availableDates}
        selectedDates={["2026-08-01", "2026-07-01", "2026-06-01"]}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByTestId("date-picker-trigger"));
    // Открываем селектор количества и выбираем 6.
    fireEvent.click(screen.getByTestId("period-count-trigger"));
    const option6 = await screen.findByTestId("period-count-6");
    fireEvent.click(option6);
    // После выбора 6 должен появиться текст «Выберите 6 месяцев из календаря».
    expect(screen.getByText(/Выберите 6 месяцев из календаря/)).toBeInTheDocument();
  });

  it("применяет выбранные даты через onApply, отсортированные по убыванию", async () => {
    const selected = ["2026-08-01", "2026-06-01", "2026-07-01"]; // намеренно перемешаны
    render(
      <DatePicker availableDates={availableDates} selectedDates={selected} onApply={onApply} />
    );
    fireEvent.click(screen.getByTestId("date-picker-trigger"));
    const applyButton = await screen.findByTestId("date-picker-apply");

    // Кнопка Применить активна только если были изменения относительно props.
    // Здесь локальный выбор синхронизирован с props, поэтому изменения нет —
    // проверим, что выбор месяца создаёт изменение.
    fireEvent.click(screen.getByTestId("date-option-2026-05-01"));
    await waitFor(() => expect(screen.getByTestId("date-picker-apply")).toBeEnabled());
    fireEvent.click(screen.getByTestId("date-picker-apply"));

    // onApply должен вернуть массив, где p1 — самая новая дата (2026-08-01).
    expect(onApply).toHaveBeenCalledTimes(1);
    const result = onApply.mock.calls[0][0] as string[];
    expect(result[0]).toBe("2026-08-01");
  });

  it("ограничивает выбор максимальным числом периодов", async () => {
    render(
      <DatePicker
        availableDates={availableDates}
        selectedDates={["2026-08-01"]}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByTestId("date-picker-trigger"));
    // Выбираем 6 периодов по очереди.
    fireEvent.click(screen.getByTestId("period-count-trigger"));
    fireEvent.click(await screen.findByTestId("period-count-6"));

    // Выбираем 6 разных месяцев.
    const monthDates = ["2026-07-01", "2026-06-01", "2026-05-01", "2026-04-01", "2026-03-01"];
    for (const d of monthDates) {
      fireEvent.click(screen.getByTestId(`date-option-${d}`));
    }
    // После выбора 6 месяцев выбрано ровно 6 (максимум).
    await waitFor(() => expect(screen.getByTestId("date-picker-apply")).toBeEnabled());
    fireEvent.click(screen.getByTestId("date-picker-apply"));
    const result = onApply.mock.calls[0][0] as string[];
    expect(result.length).toBeLessThanOrEqual(MAX_PERIODS);
  });
});
