import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FilterGroup, FieldConfig } from 'src/app/utils/filter';
import { FilterBuilderComponent } from './filter-builder.component';

@Component({
  selector: 'app-filter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterBuilderComponent],
  templateUrl: './filter-modal.component.html',
  styleUrls: ['./filter-modal.component.scss'],
})
export class FilterModalComponent {
  filter: FilterGroup;

  constructor(
    private dialogRef: MatDialogRef<FilterModalComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { fields: FieldConfig[]; existingFilter?: FilterGroup },
  ) {
    // If an existing filter is provided, deep-clone it so edits don't mutate the caller's state
    this.filter = data.existingFilter
      ? JSON.parse(JSON.stringify(data.existingFilter))
      : { type: 'group', condition: 'AND', children: [] };
  }

  get fields(): FieldConfig[] {
    return this.data.fields;
  }

  private hasValidFilter(group: FilterGroup): boolean {
    for (const child of group.children) {
      if (child.type === 'rule') {
        if (this.isValidRule(child)) return true;
      }

      if (child.type === 'group') {
        if (this.hasValidFilter(child)) return true;
      }
    }

    return false;
  }

  private isValidRule(rule: any): boolean {
    if (!rule.field) return false;
    if (!rule.operator) return false;

    // Skip value check for no-value operators
    const noValueOps = [
      'is_null',
      'is_not_null',
      'is_true',
      'is_false',
      'is_empty',
      'is_not_empty',
    ];
    if (noValueOps.includes(rule.operator)) {
      return true;
    }

    if (rule.dataType === 'boolean') {
      return rule.value === true || rule.value === false;
    }

    return rule.value !== null && rule.value !== undefined && rule.value !== '';
  }

  onApply() {
    if (!this.hasValidFilter(this.filter)) {
      return;
    }

    this.dialogRef.close(this.filter);
  }

  onCancel() {
    this.dialogRef.close();
  }
}
