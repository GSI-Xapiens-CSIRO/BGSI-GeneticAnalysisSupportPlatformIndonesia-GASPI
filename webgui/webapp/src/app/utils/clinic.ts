import { Sort } from '@angular/material/sort';

export function clinicFilter<T extends Record<string, any>>(
  rows: T[],
  term: string,
  update: (filtered: T[]) => void,
): void {
  if (!term) {
    update(rows);
    return;
  }
  const lowerTerm = term.toLowerCase();
  const filtered = rows.filter((row) => {
    return Object.entries(row).some(([_, value]) => {
      return (
        isFilterable(value) &&
        value.toString().toLowerCase().includes(lowerTerm)
      );
    });
  });
  update(filtered);
}

function isFilterable(value: unknown): value is { toString(): string } {
  return (
    value !== null &&
    value !== undefined &&
    typeof value.toString === 'function'
  );
}

export function clinicResort<T extends Record<string, any>>(
  rows: T[],
  sort: Sort,
  update: (sorted: T[]) => void,
): void {
  const snapshot = [...rows];
  const key = sort.active;
  if (sort.direction === 'asc') {
    snapshot.sort((a, b) => {
      return a[key] < b[key] ? -1 : 1;
    });
    update(snapshot);
  } else if (sort.direction === 'desc') {
    snapshot.sort((a, b) => {
      return a[key] > b[key] ? -1 : 1;
    });
    update(snapshot);
  } else {
    update(rows);
  }
}
