import {
  Component,
  ViewChild,
  Injectable,
  ChangeDetectorRef,
} from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { catchError, lastValueFrom, of, Subject } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { isEmpty } from 'lodash';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';

import { IgvViewerComponent } from './igv-viewer/igv-viewer.component';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';

import { DportalService } from 'src/app/services/dportal.service';
import { ToastrService } from 'ngx-toastr';

interface ProjectFile {
  filename: string;
  hasindex: boolean;
}

interface Project {
  name: string;
  description: string;
  files: ProjectFile[];
  indexed: boolean;
}

export interface IIGVData {
  projectName: string | null;
  bamURL: string | null;
  bamIndex: string | null;
  filename?: string | null;
}

@Injectable()
export class MyCustomPaginatorIntl implements MatPaginatorIntl {
  changes = new Subject<void>();

  // For internationalization, the `$localize` function from
  // the `@angular/localize` package can be used.
  firstPageLabel = $localize`First page`;
  itemsPerPageLabel = $localize`Items per page:`;
  lastPageLabel = $localize`Last page`;

  // You can set labels to an arbitrary string too, or dynamically compute
  // it through other third-party internationalization libraries.
  nextPageLabel = 'Next page';
  previousPageLabel = 'Previous page';

  getRangeLabel(page: number, pageSize: number, length: number): string {
    return $localize`Page ${page + 1}`;
  }
}

@Component({
  selector: 'app-igv-page',
  providers: [{ provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl }],
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTooltip,
    ComponentSpinnerComponent,
    MatCardModule,
    IgvViewerComponent,
  ],
  templateUrl: './clinic-igv.component.html',
  styleUrl: './clinic-igv.component.scss',
})
export class ClinicIGVComponent {
  loading = true;
  dataSource = new MatTableDataSource<Project>();
  displayedColumns: string[] = ['name', 'description', 'files'];

  protected pageSize = 5;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  private pageTokens = new Map<number, string>();
  protected igvData: IIGVData | null = null;

  constructor(
    private dps: DportalService,
    private tstr: ToastrService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.list(0);
    this.cd.detectChanges();

    this.paginator.page.subscribe((event: PageEvent) => {
      if (this.pageSize != this.paginator.pageSize) {
        this.resetPagination();
        this.refresh();
      } else {
        this.list(event.pageIndex);
      }
    });
  }

  async handleSelectDataIGV(projectName: any, fileName: any) {
    const bamURL = await this.handleGetPrefixURL(projectName, fileName);
    const bamIndex = await this.handleGetPrefixURL(
      projectName,
      fileName + '.bai',
    );
    this.igvData = {
      projectName: projectName || '',
      bamURL: bamURL || '',
      bamIndex: bamIndex || '',
      filename: fileName,
    };
  }

  async handleGetPrefixURL(
    project: string,
    prefix: string,
  ): Promise<string | null> {
    try {
      const url: string | null = await lastValueFrom(
        this.dps
          .getMyProjectFile(project, prefix)
          .pipe(catchError(() => of(null))),
      );

      if (!url) {
        this.tstr.error('Unable to sign file.', 'Error');
        return null;
      }

      let remainingAttempts = 3;

      while (remainingAttempts > 0) {
        if (url) return url; //return value
        remainingAttempts--;
        await new Promise((resolve) => setTimeout(resolve, 1000)); //add delay
      }

      return null;
    } catch (error) {
      console.error('Error fetching URL:', error);
      this.tstr.error('Error while signing file.', 'Error');
      return null;
    }
  }

  list(page: number) {
    // not the first page but the page token is not set
    if (!this.pageTokens.get(page) && page > 0) {
      this.paginator.pageIndex--;
      this.tstr.warning('No more items to show', 'Warning');
      return;
    }

    this.loading = true;
    this.dps
      .getMyProjects(this.pageSize, this.pageTokens.get(page))
      .pipe(
        catchError((error) => {
          console.error('Error fetching projects:', error); // Log the error
          return of(null); // Return null to continue the stream
        }),
      )
      .subscribe((response: any) => {
        if (!response) {
          this.tstr.error('API request failed', 'Error');
          this.dataSource.data = [];
        } else {
          // handle if there no data on next page (set page index and last page to prev value)
          if (
            response &&
            response.data.length <= 0 &&
            this.paginator.pageIndex > 0
          ) {
            this.paginator.pageIndex--;
            this.tstr.warning('No more items to show', 'Warning');
            this.loading = false;
            return;
          }

          this.dataSource.data = response.data.map((project: any) => {
            const vcfFiles = project.files.filter((file: string) =>
              file.endsWith('.bam'),
            );
            const filesWithStatus = vcfFiles.map((file: string) => {
              const hasIndex = project.files.includes(`${file}.bai`);
              return {
                filename: file,
                disabled: !hasIndex,
              };
            });

            return {
              name: project.name,
              description: project.description,
              files: filesWithStatus,
              indexed: false,
            };
          });

          // set next page token
          this.pageTokens.set(page + 1, response.last_evaluated_key);
        }
        this.loading = false;
      });
  }

  resetPagination() {
    this.pageTokens = new Map<number, string>();
    this.paginator.pageIndex = 0;
    this.pageSize = this.paginator.pageSize;
  }

  refresh() {
    try {
      this.resetPagination();
      this.list(0);
    } catch (error) {
      console.log(error);
    }
  }

  tooltipMessage(status: boolean) {
    if (status) {
      return `Can't display to IGV, because no index of bam/sam files`;
    }
    return 'View to IGV';
  }

  handleBackToFiles() {
    this.igvData = null;
  }
}
