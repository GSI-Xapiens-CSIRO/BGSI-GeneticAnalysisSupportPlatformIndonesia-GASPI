import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface ProjectFile {
  filename: string;
  disabled: boolean;
}

interface Project {
  name: string;
  description: string;
  files: ProjectFile[];
  indexed: boolean;
}

@Component({
  selector: 'app-project-item',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './project-item.component.html',
  styleUrl: './project-item.component.scss',
})
export class ProjectItemComponent {
  @Input() project: Project | null = null;
  @Output() panelToggled = new EventEmitter<boolean>();
  @Output() submitQuery = new EventEmitter<ProjectFile>();
  @Output() viewQcReport = new EventEmitter<ProjectFile>();
  @Output() batchSubmitQuery = new EventEmitter<Set<string>>();
  searchControl = new FormControl('');
  protected projectFiles: ProjectFile[] = [];
  protected enabledFiles: ProjectFile[] = [];
  protected checkedFiles: Set<string> = new Set();
  protected allFilesSelected: boolean = false;

  ngOnInit(): void {
    this.searchControl.valueChanges.subscribe((value) => {
      this.filterFiles(value as string);
    });
    this.filterFiles('');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project']) {
      this.filterFiles(this.searchControl.value || '');
    }
  }

  filterFiles(searchTerm: string) {
    if (!this.project) {
      this.projectFiles = [];
      this.allFilesSelected = false;
      return;
    }
    const lowerSearch = searchTerm.toLowerCase();
    this.projectFiles = this.project.files.filter((file) =>
      file.filename.toLowerCase().includes(lowerSearch),
    );

    this.enabledFiles = this.projectFiles
      .filter((f) => !f.disabled)
      .map((f) => f);

    this.allFilesSelected = this.checkAllFilesSelected();
  }

  checkAllFilesSelected(): boolean {
    if (this.enabledFiles.length === 0) return false;
    return this.enabledFiles.every((f) => this.checkedFiles.has(f.filename));
  }

  updateCheckedFile(file: ProjectFile): void {
    if (file.disabled) return;
    this.checkedFiles.has(file.filename)
      ? this.checkedFiles.delete(file.filename)
      : this.checkedFiles.add(file.filename);

    this.allFilesSelected = this.checkAllFilesSelected();
  }

  checkAllFiles(): void {
    const action = this.allFilesSelected
      ? (f: ProjectFile) => this.checkedFiles.delete(f.filename)
      : (f: ProjectFile) => this.checkedFiles.add(f.filename);

    this.enabledFiles.filter((f) => !f.disabled).forEach(action);
    this.allFilesSelected = !this.allFilesSelected;
  }

  togglePanel(opened: boolean) {
    this.panelToggled.emit(opened);
  }
}
