import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import {
  ChangeDetectorRef,
  Component,
  Injectable,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, catchError, of } from 'rxjs';
import { DportalService } from 'src/app/services/dportal.service';
import * as _ from 'lodash';

interface Project {
  name: string;
  description: string;
  files: string[];
  expanded: boolean;
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
  selector: 'app-user-projects-list',
  providers: [{ provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl }],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    ClipboardModule,
    MatTableModule,
    MatPaginatorModule,
  ],
  templateUrl: './user-projects-list.component.html',
  styleUrl: './user-projects-list.component.scss',
})
export class UserProjectsListComponent implements OnInit {
  myProjects: Project[] = [];
  dataSource = new MatTableDataSource<Project>();
  displayedColumns: string[] = ['name'];

  protected pageSize = 5;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  private pageTokens = new Map<number, string>();

  constructor(
    private dps: DportalService,
    private sb: MatSnackBar,
    private cb: Clipboard,
    private cd: ChangeDetectorRef,
  ) {
    // first page token
    this.pageTokens.set(0, '');
  }

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

  list(page: number) {
    this.dps
      .getMyProjectsPagination(this.pageSize, this.pageTokens.get(page))
      .pipe(catchError(() => of(null)))
      .subscribe((data: any) => {
        if (!data) {
          this.sb.open('API request failed', 'Okay', { duration: 60000 });
          this.dataSource.data = [];
        } else {
          //handle if there no data on next page (set page index and last page to prev value)
          if (data && data.data.length <= 0 && this.paginator.pageIndex > 0) {
            this.paginator.pageIndex--;
            this.sb.open('No more items to show', 'Okay', { duration: 60000 });
            return;
          }

          this.dataSource.data = data.data.map((project: Project) => ({
            name: project.name,
            description: project.description,
            files: project.files,
            expanded: false,
          }));

          // set next page token
          this.pageTokens.set(page + 1, data.last_evaluated_key);
        }
      });
  }

  resetPagination() {
    this.pageTokens = new Map<number, string>();
    this.paginator.pageIndex = 0;
    this.pageSize = this.paginator.pageSize;
  }

  copy(project: string, prefix: string) {
    return this.dps
      .getMyProjectFile(project, prefix)
      .pipe(catchError(() => of(null)))
      .subscribe((url: string | null) => {
        if (!url) {
          this.sb.open('Unable to sign file.', 'Close', {
            duration: 60000,
          });
        } else {
          const pending = this.cb.beginCopy(url);
          let remainingAttempts = 3;
          const attempt = () => {
            const result = pending.copy();
            if (!result && --remainingAttempts) {
              setTimeout(attempt);
            } else {
              pending.destroy();
            }
          };
          attempt();
        }
      });
  }

  refresh() {
    try {
      this.resetPagination();
      this.list(0);
    } catch (error) {
      console.log(error);
    }
  }
}
