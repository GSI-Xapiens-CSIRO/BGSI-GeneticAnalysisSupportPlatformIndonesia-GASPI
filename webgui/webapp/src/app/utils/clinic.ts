import { Sort } from '@angular/material/sort';
import { environment } from 'src/environments/environment';

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

export function clinicMultiFilter<T extends Record<string, any>>(
  rows: T[],
  terms: string[],
  update: (filtered: T[]) => void,
): void {
  if (!terms || terms.length == 0) {
    update(rows);
    return;
  }

  const lowerTerms = terms.map((t) => t.toLowerCase());

  const filtered = rows.filter((row) => {
    return Object.entries(row).some(([_, value]) => {
      return (
        isFilterable(value) &&
        lowerTerms.some((term) => value.toString().toLowerCase().includes(term))
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

export function validationReportsArray(listArray: any, listSelectedData: any) {
  const arrayList: any[] = listArray;
  const arrayBValues: any[] = Array.from(listSelectedData.values());

  function isEqual(valA: any, valB: any): boolean {
    if (Array.isArray(valA) && Array.isArray(valB)) {
      if (valA.length !== valB.length) return false;
      // cek apakah semua elemen sama (strict order)
      return valA.every((v, i) => String(v).trim() === String(valB[i]).trim());

      // ingnore order
      // return [...valA].sort().join('|') === [...valB].sort().join('|');
    }

    // default (primitive, string, number, boolean)
    return String(valA).trim() === String(valB).trim();
  }

  function isMatch(objA: any, objB: any): boolean {
    return Object.keys(objA).every((key) => {
      const av = objA[key];
      const bv = objB[key];
      return isEqual(av, bv);
    });
  }

  const found = arrayList.some((a) => arrayBValues.some((b) => isMatch(a, b)));

  return found;
}
export function validationReportsObject(listArray: any, obj: any) {
  const hubName: string = environment.hub_name;
  const arrayA: any[] = listArray;

  function isEqual(valA: any, valB: any): boolean {
    if (Array.isArray(valA) && Array.isArray(valB)) {
      if (valA.length !== valB.length) return false;
      return valA.every((v, i) => String(v).trim() === String(valB[i]).trim());
    }
    return String(valA).trim() === String(valB).trim();
  }

  const isMatchByKeysOfA = (a: any, b: any) =>
    Object.keys(a)
      .filter((k) => !(hubName === 'RSJPD' && k === 'Zygosity')) // <-- ignore Zygosity hanya saat RSPPD
      .every((k) => b.hasOwnProperty(k) && isEqual(a[k], b[k]));

  return arrayA.some((a) => isMatchByKeysOfA(a, obj));
}
