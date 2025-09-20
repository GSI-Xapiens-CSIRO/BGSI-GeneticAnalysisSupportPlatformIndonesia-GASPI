import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { effect, signal, computed, Component } from '@angular/core';
import {
  state,
  style,
  animate,
  trigger,
  transition,
} from '@angular/animations';

import { glossaryData, glossaryItem } from '../data';
import { environment } from 'src/environments/environment';

export interface Task {
  name: string;
  completed: boolean;
  subtasks?: Task[];
}

@Component({
  selector: 'app-glossary-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    FormsModule,
    MatIconModule,
  ],
  animations: [
    trigger('expandCollapse', [
      state('void', style({ height: 0, opacity: 0, overflow: 'hidden' })),
      state('*', style({ height: '*', opacity: 1, overflow: 'hidden' })),
      transition('void <=> *', animate('250ms ease-in-out')),
    ]),
  ],
  templateUrl: './glossary-page.component.html',
  styleUrl: './glossary-page.component.scss',
})
export class GlossaryPageComponent {
  protected hubName: string = environment.hub_name;

  listGlossary: glossaryItem[] = [];
  letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A-Z
  showAllDiseases = false;

  // start of checkbox
  allComplete$ = signal(false);
  pharmCat$ = signal(false);
  IGNG$ = signal(false);
  RSJPD$ = signal(false);
  selectedLetter$ = signal('');
  search$ = signal('');
  task$ = signal<Task>({
    name: 'Disease Diagnosis Terms',
    completed: false,
    subtasks: [
      { name: 'Variants Information', completed: false },
      { name: 'Sequence Information', completed: false },
      { name: 'Allele Frequency', completed: false },
      { name: 'Resources', completed: false },
      { name: 'Constraint', completed: false },
      { name: 'Computational Predictions', completed: false },
      { name: 'Publication Media', completed: false },
      { name: 'Sequence Information', completed: false },
      { name: 'Result Card Header', completed: false },
    ],
  });

  combined$ = computed(() => ({
    pharmCat: this.pharmCat$(),
    IGNG: this.IGNG$(),
    RSJPD: this.RSJPD$(),
    selectedLetter: this.selectedLetter$(),
    search: this.search$(),
    task: this.task$(),
  }));

  constructor() {
    this.listGlossary = glossaryData;
    if (['RSCM', 'RSSARDJITO'].includes(this.hubName)) {
      this.task$.update((task) => ({
        ...task,
        completed: true,
        subtasks:
          task.subtasks?.map((st) => ({ ...st, completed: true })) ?? [],
      }));
      this.allComplete$.set(true);
    }

    if (['RSPON', 'RSJPD'].includes(this.hubName)) {
      this.pharmCat$.set(true);
    }

    if (['RSIGNG'].includes(this.hubName)) {
      this.IGNG$.set(true);
    }

    if (['RSJPD'].includes(this.hubName)) {
      this.RSJPD$.set(true);
    }

    effect(() => {
      const values = this.combined$();
      console.log('Ada perubahan di salah satu filter:', values);
      this.filterData(values);
    });
  }

  filterData(values: any) {
    const completedSubtasks = values.task.subtasks
      .filter((s: any) => s.completed)
      .map((s: any) => s.name);

    const tableSubMap: Record<string, string[]> = {};

    // add table based on filter
    if (values.IGNG) {
      tableSubMap['Pharmacogenomics_Lookup_IGNG'] = [''];
    }
    if (values.pharmCat) {
      tableSubMap['Pharmacogenomics_PharmCat'] = [''];
    }
    if (values.RSJPD) {
      tableSubMap['Pharmacogenomics_Lookup_RSJPD'] = [''];
    }

    // cek all subtask
    if (completedSubtasks.length > 0) {
      tableSubMap['Diseases Diagnosis'] = completedSubtasks;
    }

    // cek inactive filter
    const noFilterActive =
      !values.IGNG &&
      !values.pharmCat &&
      !values.RSJPD &&
      completedSubtasks.length === 0 &&
      !values.selectedLetter &&
      !values.search;

    if (noFilterActive) {
      this.listGlossary = [];
      return;
    }

    const searchLower = values.search?.toLowerCase() || '';
    const selectedLetterLower = values.selectedLetter?.toLowerCase() || '';

    // Filter data
    const filteredData = glossaryData.filter((item) => {
      const allowedSub = tableSubMap[item.table];

      if (!allowedSub || !allowedSub.includes(item.sub)) {
        return false;
      }

      // Filter keyword based on selectedLetter
      if (
        selectedLetterLower &&
        !item.keyword.toLowerCase().startsWith(selectedLetterLower)
      ) {
        return false;
      }

      // Filter search based on definition
      if (searchLower && !item.definition.toLowerCase().includes(searchLower)) {
        return false;
      }

      return true;
    });

    this.listGlossary = filteredData || [];
  }

  // start of checkbox
  updateAllComplete() {
    this.task$.update((task) => {
      const allComplete = task.subtasks?.every((t) => t.completed) ?? false;
      this.allComplete$.set(allComplete);
      return task;
    });
  }

  someComplete(): boolean {
    const task = this.task$();
    if (!task.subtasks) return false;
    return task.subtasks.some((t) => t.completed) && !this.allComplete$();
  }

  setAll(completed: boolean) {
    this.task$.update((task) => ({
      ...task,
      subtasks: task.subtasks?.map((st) => ({ ...st, completed })) ?? [],
    }));
    this.allComplete$.set(completed);
  }

  toggleSubtask(subtask: Task) {
    this.task$.update((task) => {
      const subtasks =
        task.subtasks?.map((s) =>
          s === subtask ? { ...s, completed: !s.completed } : s,
        ) ?? [];

      this.allComplete$.set(subtasks.every((s) => s.completed));
      return { ...task, subtasks };
    });
  }

  // end of checkbox

  toggleShowAllDiseases() {
    this.showAllDiseases = !this.showAllDiseases;
  }

  selectLetter(letter: string) {
    this.selectedLetter$.update((prev) => (prev === letter ? '' : letter));
    //if selected letter remove filter by search
    this.search$.set('');
  }

  updateSearch(value: string) {
    this.search$.set(value);
  }

  //getter
  get allComplete() {
    return this.allComplete$();
  }
  get task() {
    return this.task$();
  }
  get pharmCat() {
    return this.pharmCat$();
  }
  get IGNG() {
    return this.IGNG$();
  }
  get RSJPD() {
    return this.RSJPD$();
  }
  get selectedLetter() {
    return this.selectedLetter$();
  }

  //setter
  set pharmCat(value: boolean) {
    this.pharmCat$.set(value);
  }
  set IGNG(value: boolean) {
    this.IGNG$.set(value);
  }
  set RSJPD(value: boolean) {
    this.RSJPD$.set(value);
  }

  set search(value: string) {
    this.search$.set(value);
    //if search value change remove filter by letters
    this.selectedLetter$.set('');
  }
}
