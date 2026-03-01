import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
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
export class FilterBuilderComponent implements OnInit {
  @Input() group!: FilterGroup;
  @Input() fields: FieldConfig[] = [];
  @Input() isRoot = true;

  @Output() groupChange = new EventEmitter<FilterGroup | null>();

  operatorMap = operatorMap;
  operatorLabels = OperatorLabels;
  isArray = Array.isArray;

  // Per-row state for field search (keyed by row index)
  filteredFieldsMap: Map<number, FieldConfig[]> = new Map();

  // Per-row state for operator search (keyed by row index)
  filteredOperatorsMap: Map<number, string[]> = new Map();

  get summaryText(): string {
    return GetFilterSummaryText(this.group);
  }

  ngOnInit() {
    if (!this.group.children || this.group.children.length === 0) {
      this.addRule();
    }
  }

  /** Get filtered fields for a specific row */
  getFilteredFieldsForRow(index: number): FieldConfig[] {
    return this.filteredFieldsMap.get(index) || this.fields;
  }

  /** Get filtered operators for a specific row */
  getFilteredOperatorsForRow(index: number, dataType: DataType): string[] {
    return this.filteredOperatorsMap.get(index) || (operatorMap[dataType] || []);
  }

  /** Called when field select opens/closes */
  onFieldSelectOpened(opened: boolean, index: number) {
    if (opened) {
      // Reset to show all fields when opening
      this.filteredFieldsMap.set(index, [...this.fields]);
    } else {
      // Clear when closed
      this.filteredFieldsMap.delete(index);
    }
  }

  /** Called when operator select opens/closes */
  onOperatorSelectOpened(opened: boolean, index: number, dataType: DataType) {
    if (opened) {
      // Reset to show all operators when opening
      this.filteredOperatorsMap.set(index, [...(operatorMap[dataType] || [])]);
    } else {
      // Clear when closed
      this.filteredOperatorsMap.delete(index);
    }
  }

  /** Filter fields based on search input for a specific row */
  onFieldSearchInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const term = input.value.toLowerCase();

    if (!term) {
      this.filteredFieldsMap.set(index, [...this.fields]);
    } else {
      const filtered = this.fields.filter(f =>
        f.field.toLowerCase().includes(term)
      );
      this.filteredFieldsMap.set(index, filtered);
    }
  }

  /** Filter operators based on search input for a specific row */
  onOperatorSearchInput(event: Event, index: number, dataType: DataType) {
    const input = event.target as HTMLInputElement;
    const term = input.value.toLowerCase();
    const ops = operatorMap[dataType] || [];

    if (!term) {
      this.filteredOperatorsMap.set(index, [...ops]);
    } else {
      const filtered = ops.filter(op => {
        const label = (this.operatorLabels[op] || op).toLowerCase();
        return label.includes(term);
      });
      this.filteredOperatorsMap.set(index, filtered);
    }
  }

  /** Prevent keyboard events from bubbling to mat-select */
  onSearchKeydown(event: KeyboardEvent) {
    event.stopPropagation();
  }

  /** Stop propagation for click events */
  onSearchClick(event: MouseEvent) {
    event.stopPropagation();
  }

  emitChange() {
    this.groupChange.emit(this.group);
  }

  addRule() {
    const defaultCondition =
      this.group.children.length > 0 ? this.group.condition : undefined;

    // Create empty rule - just placeholders, no default values
    this.group.children.push({
      condition: defaultCondition,
      type: 'rule',
      field: '',        // Empty - will show placeholder
      operator: '',     // Empty - will show placeholder
      dataType: 'string',
      value: '',        // Empty - will show placeholder
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
    this.group.children.splice(index, 1);
    // Clean up search state
    this.filteredFieldsMap.delete(index);
    this.filteredOperatorsMap.delete(index);
    this.emitChange();
  }

  removeSelf() {
    this.groupChange.emit(null);
  }

  updateChild(index: number, child: FilterGroup | null) {
    if (child === null) {
      this.group.children.splice(index, 1);
    } else {
      this.group.children[index] = child;
    }
    this.emitChange();
  }

  onFieldChange(rule: FilterRule) {
    const selected = this.fields.find((f) => f.field === rule.field);
    if (!selected) return;

    rule.dataType = selected.dataType as DataType;
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
    this.group.condition = condition;
    this.group.children.forEach((child) => {
      if (child.type === 'rule') {
        (child as FilterRule).condition = condition;
      }
    });
    this.emitChange();
  }
}
