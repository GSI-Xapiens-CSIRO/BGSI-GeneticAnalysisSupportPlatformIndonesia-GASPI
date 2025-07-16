import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
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
  searchControl = new FormControl('');
  protected projectFiles: ProjectFile[] = [];

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
      return;
    }
    const lowerSearch = searchTerm.toLowerCase();
    this.projectFiles = this.project.files.filter((file) =>
      file.filename.toLowerCase().includes(lowerSearch),
    );
  }

  togglePanel(opened: boolean) {
    this.panelToggled.emit(opened);
  }
}
