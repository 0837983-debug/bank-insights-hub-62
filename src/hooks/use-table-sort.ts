import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function useTableSort<T>(
  data: T[],
  getValueFn: (item: T, column: string) => number | string
) {
  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });

  const handleSort = (column: string) => {
    setSortState((prev) => {
      if (prev.column !== column) {
        return { column, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { column, direction: "desc" };
      }
      return { column: null, direction: null };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortState.column || !sortState.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = getValueFn(a, sortState.column!);
      const bVal = getValueFn(b, sortState.column!);

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortState.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr, "ru");
      return sortState.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sortState, getValueFn]);

  return { sortedData, sortState, handleSort };
}

// Sort hierarchical data (groups with children)
export function useHierarchicalSort<T extends { id: string; children?: T[] }>(
  data: T[],
  getValueFn: (item: T, column: string) => number | string
) {
  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });

  const handleSort = (column: string) => {
    setSortState((prev) => {
      if (prev.column !== column) {
        return { column, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { column, direction: "desc" };
      }
      return { column: null, direction: null };
    });
  };

  const sortedData = useMemo(() => {
    if (!sortState.column || !sortState.direction) {
      return data;
    }

    const sortItems = (items: T[]): T[] => {
      const sorted = [...items].sort((a, b) => {
        const aVal = getValueFn(a, sortState.column!);
        const bVal = getValueFn(b, sortState.column!);

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortState.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        const cmp = aStr.localeCompare(bStr, "ru");
        return sortState.direction === "asc" ? cmp : -cmp;
      });

      return sorted.map((item) => ({
        ...item,
        children: item.children ? sortItems(item.children) : undefined,
      }));
    };

    return sortItems(data);
  }, [data, sortState, getValueFn]);

  return { sortedData, sortState, handleSort };
}
