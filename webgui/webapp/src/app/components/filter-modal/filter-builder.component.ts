import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import {
  GetFilterSummaryText,
  DataType,
  operatorMap,
  FilterGroup,
  FieldConfig,
  FilterRule,
  OperatorLabels,
} from 'src/app/utils/filter';

@Component({
  selector: 'app-filter-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
  ],
  templateUrl: './filter-builder.component.html',
  styleUrls: ['./filter-builder.component.scss'],
})
export class FilterBuilderComponent {
  @Input() group!: FilterGroup;
  @Input() fields: FieldConfig[] = [];
  @Input() isRoot = true;

  @Output() groupChange = new EventEmitter<FilterGroup | null>();

  operatorMap = operatorMap;
  operatorLabels = OperatorLabels;

  isArray = Array.isArray;

  // Search terms for searchable dropdowns
  fieldSearchTerm = '';
  operatorSearchTerm = '';

  get summaryText(): string {
    return GetFilterSummaryText(this.group);
  }

  /** Return fields filtered by search term */
  getFilteredFields(): FieldConfig[] {
    if (!this.fieldSearchTerm) return this.fields;
    const term = this.fieldSearchTerm.toLowerCase();
    return this.fields.filter((f) => f.field.toLowerCase().includes(term));
  }

  /** Return operators filtered by search term */
  getFilteredOperators(dataType: DataType): string[] {
    const ops = operatorMap[dataType] || [];
    if (!this.operatorSearchTerm) return ops;
    const term = this.operatorSearchTerm.toLowerCase();
    return ops.filter((op) => {
      const label = (this.operatorLabels[op] || op).toLowerCase();
      return label.includes(term);
    });
  }

  /** Clear search term when a select panel is closed */
  onSelectOpenedChange(opened: boolean, type: 'field' | 'operator') {
    if (!opened) {
      if (type === 'field') this.fieldSearchTerm = '';
      if (type === 'operator') this.operatorSearchTerm = '';
    }
  }

  emitChange() {
    this.groupChange.emit(this.group);
  }

  ngOnInit() {
    if (!this.group.children || this.group.children.length === 0) {
      this.addRule();
    }
  }

  addRule() {
    const defaultField = this.fields.length
      ? this.fields[0]
      : { field: '', dataType: 'string', defaultValue: '' };
    const defaultCondition =
      this.group.children.length > 0 ? this.group.condition : undefined;
    this.group.children.push({
      condition: defaultCondition,
      type: 'rule',
      field: defaultField.field,
      operator: 'equals',
      dataType: defaultField.dataType as
        | 'string'
        | 'number'
        | 'boolean'
        | 'date'
        | 'array',
      value: defaultField.defaultValue ?? '',
    });
    this.emitChange();
  }

  addGroup() {
    this.group.children.push({
      type: 'group',
      condition: 'AND',
      children: [],
    });
    this.emitChange();
  }

  remove(index: number) {
    const newChildren = [...this.group.children];
    newChildren.splice(index, 1);

    this.group = {
      ...this.group,
      children: newChildren,
    };

    this.emitChange();
  }

  removeSelf() {
    this.groupChange.emit(null);
  }

  updateChild(index: number, child: FilterGroup | null) {
    const newChildren = [...this.group.children];

    if (child === null) {
      newChildren.splice(index, 1);
    } else {
      newChildren[index] = child;
    }

    this.group = {
      ...this.group,
      children: newChildren,
    };

    this.emitChange();
  }

  onFieldChange(rule: FilterRule) {
    const selected = this.fields.find((f) => f.field === rule.field);
    if (!selected) return;

    rule.dataType = selected.dataType;
    rule.operator = 'equals';
    rule.value = selected.defaultValue ?? '';
    this.emitChange();
  }

  onOperatorChange(rule: FilterRule) {
    if (this.isBetweenOperator(rule.operator)) {
      if (!Array.isArray(rule.value) || rule.value.length !== 2) {
        rule.value = [null, null];
      }
    } else if (this.isNoValueOperator(rule.operator)) {
      rule.value = '';
    } else if (this.isInOperator(rule.operator)) {
      if (!Array.isArray(rule.value)) {
        rule.value = rule.value ? [rule.value] : [];
      }
    } else {
      if (Array.isArray(rule.value)) {
        rule.value = rule.value[0] ?? '';
      }
    }
    this.emitChange();
  }

  isOperatorInvalid(rule: FilterRule): boolean {
    return !rule.operator;
  }

  isValueInvalid(rule: FilterRule): boolean {
    if (this.isNoValueOperator(rule.operator)) {
      return false;
    }
    if (rule.dataType === 'boolean') {
      return rule.value !== true && rule.value !== false;
    }
    return rule.value === null || rule.value === undefined || rule.value === '';
  }
  private isValidRule(rule: FilterRule): boolean {
    if (!rule.field) return false;
    if (!rule.operator) return false;

    if (rule.dataType === 'boolean') {
      return rule.value === true || rule.value === false;
    }

    if (rule.value === null || rule.value === undefined || rule.value === '') {
      return false;
    }

    return true;
  }
  getOperators(dataType: DataType): string[] {
    return operatorMap[dataType] || [];
  }

  isNoValueOperator(op: string): boolean {
    return [
      'is_null',
      'is_not_null',
      'is_true',
      'is_false',
      'is_empty',
      'is_not_empty',
    ].includes(op);
  }

  isBetweenOperator(op: string): boolean {
    return ['between', 'not_between'].includes(op);
  }

  isInOperator(op: string): boolean {
    return ['in', 'not_in', 'contains_any', 'contains_all'].includes(op);
  }

  onArrayInputChange(value: string, child: any) {
    if (value === null || value === undefined) {
      child.value = [];
      return;
    }

    child.value = value.split(',').map((v: string) => v.trim());
  }

  onGroupConditionChange(condition: 'AND' | 'OR') {
    const newChildren = this.group.children.map((child) => {
      if (child.type === 'rule') {
        return {
          ...child,
          condition: condition,
        };
      }

      // group child tidak disentuh isinya
      return child;
    });

    this.group = {
      ...this.group,
      condition,
      children: newChildren,
    };

    this.emitChange();
  }
}
