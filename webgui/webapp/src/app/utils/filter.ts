export type Condition = 'AND' | 'OR';
export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'array';

export interface FieldConfig {
  field: string;
  dataType: 'string' | 'number' | 'boolean';
  defaultValue?: any;
}

export interface FilterRule {
  condition?: 'AND' | 'OR';
  type: 'rule';
  field: string;
  operator: string;
  dataType: 'string' | 'number' | 'boolean';
  value: any;
}

export interface FilterGroup {
  type: 'group';
  condition: 'AND' | 'OR';
  children: Array<FilterGroup | FilterRule>;
}

export const operatorMap: Record<DataType, string[]> = {
  string: [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    // 'regex',
    // 'not_regex',
    // 'is_empty',
    // 'is_not_empty',
    'in',
    'not_in',
  ],

  number: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_or_equal',
    'less_or_equal',
    // 'between',
    // 'not_between',
    // 'in',
    // 'not_in',
    // 'is_null',
    // 'is_not_null',
  ],

  boolean: [
    'equals',
    'not_equals',
    'is_true',
    'is_false',
    // 'is_null',
    // 'is_not_null',
  ],

  date: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_or_equal',
    'less_or_equal',
    // 'between',
    // 'not_between',
    // 'before',
    // 'after',
    // 'is_null',
    // 'is_not_null',
  ],

  array: [
    'contains',
    'not_contains',
    'contains_any',
    'contains_all',
    // 'is_empty',
    // 'is_not_empty',
    // 'length_equals',
    // 'length_greater',
    // 'length_less',
  ],
};

export const OperatorLabels: Record<string, string> = {
  equals: 'Equals',
  not_equals: 'Not Equals',

  greater_than: 'Greater Than',
  less_than: 'Less Than',
  greater_or_equal: 'Greater Than Or Equal',
  less_or_equal: 'Less Than Or Equal',

  contains: 'Contains',
  not_contains: 'Does Not Contain',
  starts_with: 'Starts With',
  ends_with: 'Ends With',

  between: 'Between',
  not_between: 'Not Between',

  in: 'In List',
  not_in: 'Not In List',

  is_null: 'Is Null',
  is_not_null: 'Is Not Null',
  is_empty: 'Is Empty',
  is_not_empty: 'Is Not Empty',

  is_true: 'Is True',
  is_false: 'Is False',

  regex: 'Matches Regex',
  not_regex: 'Does Not Match Regex',

  contains_any: 'Contains Any',
  contains_all: 'Contains All',

  length_equals: 'Length Equals',
  length_greater: 'Length Greater Than',
  length_less: 'Length Less Than',

  before: 'Before',
  after: 'After',
};

export function evaluateRule(rule: any, item: any): boolean {
  const data = item?.[rule.field];
  const value = rule.value;
  const normalizedData = data === '.' ? null : data;
  const normalize = (v: any) => String(v ?? '').toLowerCase();

  switch (rule.operator) {
    case 'equals':
      if (Array.isArray(normalizedData)) {
        return normalizedData.includes(value);
      }
      if (typeof value === 'number' || !isNaN(Number(value))) {
        return Number(normalizedData) === Number(value);
      }
      return normalizedData === value;

    case 'not_equals':
      if (Array.isArray(normalizedData)) {
        return !normalizedData.includes(value);
      }
      if (typeof value === 'number' || !isNaN(Number(value))) {
        return Number(normalizedData) !== Number(value);
      }
      return normalizedData !== value;

    /* =====================
         NULL / EMPTY
      ====================== */

    case 'is_null':
      return normalizedData === null || normalizedData === undefined;

    case 'is_not_null':
      return normalizedData !== null && normalizedData !== undefined;

    case 'is_empty':
      if (Array.isArray(normalizedData)) return normalizedData.length === 0;
      return normalizedData === '' || normalizedData === null;

    case 'is_not_empty':
      if (Array.isArray(normalizedData)) return normalizedData.length > 0;
      return normalizedData !== '' && normalizedData !== null;

    /* =====================
         NUMBER
      ====================== */

    case 'greater_than':
      return Number(normalizedData) > Number(value);

    case 'less_than':
      return Number(normalizedData) < Number(value);

    case 'greater_or_equal':
      return Number(normalizedData) >= Number(value);

    case 'less_or_equal':
      return Number(normalizedData) <= Number(value);

    case 'between':
      if (!Array.isArray(value) || value.length !== 2) return false;
      return (
        Number(normalizedData) >= Number(value[0]) &&
        Number(normalizedData) <= Number(value[1])
      );

    /* =====================
         STRING (AUTO SUPPORT ARRAY)
      ====================== */

    case 'contains':
      if (Array.isArray(normalizedData)) {
        return normalizedData.some((v) =>
          normalize(v).includes(normalize(value)),
        );
      }
      return normalize(normalizedData).includes(normalize(value));

    case 'not_contains':
      if (Array.isArray(normalizedData)) {
        return !normalizedData.some((v) =>
          normalize(v).includes(normalize(value)),
        );
      }
      return !normalize(normalizedData).includes(normalize(value));

    case 'starts_with':
      if (Array.isArray(normalizedData)) {
        return normalizedData.some((v) =>
          normalize(v).startsWith(normalize(value)),
        );
      }
      return normalize(normalizedData).startsWith(normalize(value));

    case 'ends_with':
      if (Array.isArray(normalizedData)) {
        return normalizedData.some((v) =>
          normalize(v).endsWith(normalize(value)),
        );
      }
      return normalize(normalizedData).endsWith(normalize(value));

    /* =====================
         IN / NOT IN
      ====================== */

    case 'in':
      if (!Array.isArray(value)) return false;

      if (Array.isArray(normalizedData)) {
        return normalizedData.some((v) => value.includes(v));
      }

      if (
        typeof normalizedData === 'number' ||
        !isNaN(Number(normalizedData))
      ) {
        return value.map(Number).includes(Number(normalizedData));
      }

      return value.includes(normalizedData);

    case 'not_in':
      if (!Array.isArray(value)) return false;

      if (Array.isArray(normalizedData)) {
        return !normalizedData.some((v) => value.includes(v));
      }

      if (
        typeof normalizedData === 'number' ||
        !isNaN(Number(normalizedData))
      ) {
        return !value.map(Number).includes(Number(normalizedData));
      }

      return !value.includes(normalizedData);

    /* =====================
         ARRAY FIELD
      ====================== */

    case 'array_contains':
      return Array.isArray(normalizedData) && normalizedData.includes(value);

    case 'array_contains_any':
      return (
        Array.isArray(normalizedData) &&
        Array.isArray(value) &&
        value.some((v) => normalizedData.includes(v))
      );

    case 'array_contains_all':
      return (
        Array.isArray(normalizedData) &&
        Array.isArray(value) &&
        value.every((v) => normalizedData.includes(v))
      );

    case 'array_length_equals':
      return (
        Array.isArray(normalizedData) && normalizedData.length === Number(value)
      );

    default:
      return false;
  }
}

export function evaluateGroup(group: any, item: any): boolean {
  if (!group?.children?.length) return true;

  const results = group.children.map((child: any) => {
    if (child.type === 'group') {
      return evaluateGroup(child, item);
    } else {
      return evaluateRule(child, item);
    }
  });

  return group.condition === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
}

export function GetFilterSummaryText(group: FilterGroup): string {
  if (!group?.children?.length) return '';
  return buildGroupText(group);
}

function buildGroupText(group: FilterGroup): string {
  if (!group?.children?.length) return '';

  const validParts: string[] = [];

  group.children.forEach((child: any) => {
    // ===== RULE =====
    if (child.type === 'rule') {
      if (!isValidRule(child)) return;

      validParts.push(
        `${child.field} ${OperatorLabels[child.operator]} ${formatValue(
          child,
        )}`,
      );
    }

    // ===== GROUP =====
    if (child.type === 'group') {
      const nested = buildGroupText(child);
      if (!nested) return;

      validParts.push(`(${nested})`);
    }
  });

  if (validParts.length === 0) return '';

  return validParts.join(` ${group.condition} `);
}

function isValidRule(rule: FilterRule): boolean {
  if (!rule.field) return false;
  if (!rule.operator) return false;

  if (rule.dataType === 'boolean') {
    return rule.value === true || rule.value === false;
  }

  return rule.value !== null && rule.value !== undefined && rule.value !== '';
}

function formatValue(rule: FilterRule): string {
  if (rule.dataType === 'string') {
    return `"${rule.value}"`;
  }

  if (Array.isArray(rule.value)) {
    return `[${rule.value.join(', ')}]`;
  }

  return rule.value;
}
