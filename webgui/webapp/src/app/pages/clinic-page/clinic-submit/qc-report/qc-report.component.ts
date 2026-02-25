import { Component, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { ToastrService } from 'ngx-toastr';
import {
  catchError,
  delay,
  lastValueFrom,
  mergeMap,
  of,
  retry,
  retryWhen,
  scan,
  throwError,
} from 'rxjs';
import { ClinicService } from 'src/app/services/clinic.service';
import { AuthService } from 'src/app/services/auth.service';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AddNoteDialogComponent } from './add-note-dialog/add-note-dialog.component';
import { DeleteNoteDialogComponent } from './delete-note-dialog/delete-note-dialog.component';

export interface FileSelectEvent {
  projectName: string;
  vcf: string;
}

export interface QCItem {
  title: string;
  desc: string;
  key: string;
  url?: string;
  status: 'error' | 'failed' | 'success' | 'pending';
  retries: number;
  loading?: boolean;
}

export interface NoteItem {
  id: string;
  user: string;
  email: string;
  createdAt: string;
  title: string;
  description: string;
}

@Component({
  selector: 'qc-report',
  providers: [],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    ComponentSpinnerComponent,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
    FormsModule,
  ],
  templateUrl: './qc-report.component.html',
  styleUrl: './qc-report.component.scss',
})
export class QcReportComponent {
  protected projectName: string = '';
  protected fileName: string = '';
  protected listQC: QCItem[] = [
    {
      title: 'Histogram : Variant Quality Score Distributions',
      desc: 'Here is the histogram representing the distribution of variant quality scores. The x-axis shows the quality score ranges, and the y-axis represents the number of variants in each range.',
      key: 'qc_hc',
      status: 'success',
      retries: 0,
    },
    {
      title: 'Scatter Plot : Low Variant Flagging',
      desc: 'Here is the scatter plot for Low-Variant Flagging, where each point represents a variant with its quality score (QUAL) on the x-axis and depth (DP) on the y-axis. Low-quality variants could be flagged based on predefined thresholds.',
      key: 'low_var',
      status: 'success',
      retries: 0,
    },
    {
      title: 'Histogram: Genotype Quality',
      desc: 'Here is the histogram for Genotype Quality, showing the distribution of GQ values across all the variants and samples. Missing GQ values are recorded as -1.',
      key: 'gq',
      status: 'success',
      retries: 0,
    },
    {
      title: 'Histogram or density plot: Allele Frequency',
      desc: 'Here is the Histogram/Density Plot: Allele Frequency, showing the distribution of allele frequencies. The histogram bars represent the count of variants in each frequency range, while the smooth density curve helps visualize the overall distribution trend.',
      key: 'alle_freq',
      status: 'success',
      retries: 0,
    },
    {
      title: 'Only with SNPs PASS all filters',
      desc: `Here is the Bar Chart: Number of Substitutions of SNPs (Passed Variants).The X-axis represents different types of SNP substitutions (Transitions and Transversions).The Y-axis represents the count of passed variants for each substitution type.`,
      key: 'snp_pass',
      status: 'success',
      retries: 0,
    },
  ];

  loading = false;

  // Notes
  notesList: NoteItem[] = [];
  filteredNotesList: NoteItem[] = [];
  notesLoading = false;
  searchText = '';
  sortOrder = 'newest';
  filterAuthor = '';
  currentUserName = '';
  currentUserEmail = '';

  // Unique authors derived from text-filtered results
  get filteredAuthors(): string[] {
    let filtered = [...this.notesList];
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.description.toLowerCase().includes(search) ||
          n.user.toLowerCase().includes(search),
      );
    }
    const authors = filtered.map((n) => n.user);
    return [...new Set(authors)];
  }

  private autoRetryInterval: any;
  maxRetries = 2;

  constructor(
    private tstr: ToastrService,
    private cs: ClinicService,
    private authService: AuthService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.projectName =
      this.route.snapshot.queryParamMap.get('projectName') || '';
    this.fileName = this.route.snapshot.queryParamMap.get('fileName') || '';
    this.cd.detectChanges();
    this.runAllQC().then(() => this.startAutoRetry());

    // Get current user
    this.authService.user.subscribe((user) => {
      if (user) {
        this.currentUserName = user.username || 'Unknown';
        this.currentUserEmail = user.attributes?.email || '';
      }
    });

    // Load notes
    this.loadNotes();
  }

  ngOnDestroy(): void {
    clearInterval(this.autoRetryInterval);
  }

  // ===== Notes Methods =====

  loadNotes(): void {
    this.notesLoading = true;
    this.cs
      .getQCNotes(this.projectName || '', this.fileName || '')
      .pipe(
        catchError((e) => {
          const errorMessage =
            e?.response?.data?.error?.errorMessage ||
            'Something went wrong when loading QC notes. Please try again later.';
          this.tstr.error(errorMessage, 'Error: QC Notes');
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (res) {
          try {
            const parsed = JSON.parse(res.notes || '[]');
            this.notesList = Array.isArray(parsed) ? parsed : [];
          } catch {
            // Legacy single-string notes — wrap into a note item if non-empty
            if (res.notes && res.notes.trim()) {
              this.notesList = [
                {
                  id: 'legacy_' + Date.now(),
                  user: 'System',
                  email: '',
                  createdAt: new Date().toISOString(),
                  title: 'Legacy Note',
                  description: res.notes,
                },
              ];
            } else {
              this.notesList = [];
            }
          }
        } else {
          this.notesList = [];
        }
        this.applyNotesFilter();
        this.notesLoading = false;
        this.cd.detectChanges();
      });
  }

  refreshNotes(): void {
    this.loadNotes();
  }

  openAddNoteDialog(): void {
    const dialogRef = this.dialog.open(AddNoteDialogComponent, {
      width: '1000px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const now = new Date();
        const newNote: NoteItem = {
          id: this.currentUserName + '_' + Math.floor(now.getTime() / 1000),
          user: this.currentUserName,
          email: this.currentUserEmail,
          createdAt: now.toISOString(),
          title: result.title,
          description: result.description,
        };
        this.notesList.push(newNote);
        this.saveNotesToApi();
        this.applyNotesFilter();
      }
    });
  }

  deleteNote(note: NoteItem): void {
    const dialogRef = this.dialog.open(DeleteNoteDialogComponent, {
      width: '434px',
      data: { title: note.title },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.notesList = this.notesList.filter((n) => n.id !== note.id);
        this.saveNotesToApi();
        this.applyNotesFilter();
      }
    });
  }

  applyNotesFilter(): void {
    let filtered = [...this.notesList];

    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.description.toLowerCase().includes(search) ||
          n.user.toLowerCase().includes(search),
      );
    }

    // Reset author filter if the selected author is not in filtered results
    if (this.filterAuthor) {
      const availableAuthors = [...new Set(filtered.map((n) => n.user))];
      if (!availableAuthors.includes(this.filterAuthor)) {
        this.filterAuthor = '';
      } else {
        filtered = filtered.filter((n) => n.user === this.filterAuthor);
      }
    }

    // Sort
    if (this.sortOrder === 'oldest') {
      filtered.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    } else {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    this.filteredNotesList = filtered;
    this.cd.detectChanges();
  }

  private saveNotesToApi(): void {
    const notesJson = JSON.stringify(this.notesList);
    this.cs
      .updateQCNotes(this.projectName || '', this.fileName || '', notesJson)
      .pipe(
        catchError((e) => {
          const errorMessage =
            e?.response?.data?.error?.errorMessage ||
            'Something went wrong when saving QC notes. Please try again later.';
          this.tstr.error(errorMessage, 'Error: Save Notes');
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (res) {
          this.tstr.success('Notes updated successfully.', 'Success');
        } else {
          this.tstr.error('Failed to save notes.', 'Error');
        }
      });
  }

  // ===== QC Methods =====

  async runAllQC(): Promise<void> {
    this.loading = true;

    const jobPromises = this.listQC.map((item) =>
      this.retryFailedItem(item.key),
    );
    await Promise.all(jobPromises);

    this.startAutoRetry();
  }

  async retryFailedItem(key: string): Promise<void> {
    const item = this.listQC.find((i) => i.key === key);
    if (!item) return;

    item.loading = true;
    item.status = 'pending';
    item.retries = (item.retries || 0) + 1;

    try {
      const res = await lastValueFrom(
        this.cs
          .generateQC(this.projectName || '', this.fileName || '', item.key)
          .pipe(
            mergeMap((res) => {
              const images = res?.images || {};
              if (!images[key]) {
                return throwError(() => new Error('Image still not ready'));
              }
              return of(res);
            }),
            retry({ count: 2, delay: 1000 }), // retry with delay
            catchError((e) => {
              const errorMessage =
                item?.retries < this.maxRetries
                  ? 'Retrying'
                  : e?.message || 'Image generation failed after retries.';

              if (item?.retries < this.maxRetries) {
                this.tstr.warning(errorMessage, `Warning: ${key}`);
              } else {
                this.tstr.error(errorMessage, `Error: ${key}`);
              }

              return of({
                images: {
                  [key]: {
                    description: this.handleErrDecription(
                      e?.response?.data?.body?.error_type,
                    ),
                  },
                },
              });
            }),
          ),
      );

      const imageInfo = res.images?.[key];

      if (imageInfo) {
        if (imageInfo.description) {
          item.desc = imageInfo.description;
          item.status = 'error';
        } else {
          item.title = imageInfo.title || item.title;
          item.url = imageInfo.url || '';
          item.status = 'success';
        }
      } else {
        item.status = 'failed';
      }
    } catch (e) {
      item.status = 'failed';
    }

    item.loading = false;
    this.cd.detectChanges();
  }

  startAutoRetry(): void {
    this.autoRetryInterval = setInterval(() => {
      const itemsToRetry = this.listQC.filter(
        (item) =>
          (item.status === 'failed' ||
            item.status === 'error' ||
            item.status === 'pending') &&
          (item.retries || 0) < this.maxRetries &&
          !item.loading,
      );

      if (itemsToRetry.length === 0) {
        clearInterval(this.autoRetryInterval);

        // Only set loading to false when everything is done
        const allDone = this.listQC.every(
          (item) =>
            item.status === 'success' || (item.retries || 0) >= this.maxRetries,
        );

        if (allDone) {
          this.loading = false;
          this.cd.detectChanges();
        }

        return;
      }

      // Retry each failed/pending item
      itemsToRetry.forEach((item) => {
        this.retryFailedItem(item.key);
      });
    }, 2000);
  }

  handleErrDecription(err: string): string {
    const value = err.toLowerCase();
    switch (value) {
      case 'no_data':
        return 'Report failed to generate, missing field on file.';
      case 'vcfstat_failed':
        return 'Vcfstat failed to generate report.';

      default:
        return 'Report failed to generate.';
    }
  }

  backToList() {
    this.router.navigate(['/clinic/clinic-submit'], {});
  }
}
