import {
  ChangeDetectorRef,
  Component,
  Injectable,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subject, catchError, firstValueFrom, of } from 'rxjs';
import * as _ from 'lodash';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import {
  MatTableModule,
  MatTableDataSource,
} from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { ComponentSpinnerComponent } from 'src/app/components/component-spinner/component-spinner.component';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { bytesToGigabytes, formatBytes } from 'src/app/utils/file';
import { MatIconModule } from '@angular/material/icon';
import { AwsService } from 'src/app/services/aws.service';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class MyCustomPaginatorIntl implements MatPaginatorIntl {
  changes = new Subject<void>();
  firstPageLabel = $localize`First page`;
  itemsPerPageLabel = $localize`Items per page:`;
  lastPageLabel = $localize`Last page`;
  nextPageLabel = 'Next page';
  previousPageLabel = 'Previous page';

  getRangeLabel(page: number, pageSize: number, length: number): string {
    return $localize`Page ${page + 1}`;
  }
}

@Component({
  selector: 'app-admin-users-tab',
  templateUrl: './admin-users-tab.component.html',
  styleUrls: ['./admin-users-tab.component.scss'],
  providers: [
    { provide: MatPaginatorIntl, useClass: MyCustomPaginatorIntl },
    AdminService,
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ComponentSpinnerComponent,
    MatSelectModule,
    MatOptionModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatCardModule,
  ],
})
export class AdminUsersTabComponent implements OnInit {
  protected filterUsersForm: FormGroup;
  protected usersLoading: boolean = false;
  protected usersTableDisplayedColumns: string[] = [
    'First name',
    'Last name',
    'Role',
    'Email',
    'Size Quota/Usage',
    'Query Quota/Usage',
    'Est Cost',
    'Institution Type',
    'Institution Name',
    'Confirmed',
    'MFA Active',
  ];
  protected usersTableDataSource = new MatTableDataSource<any>([]);
  protected pageSize = 5;
  @ViewChild('paginator')
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;
  private pageTokens = new Map<number, string>();

  constructor(
    private adminServ: AdminService,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
    private dg: MatDialog,
    private aws: AwsService,
    private tstr: ToastrService,
  ) {
    this.filterUsersForm = this.fb.group({
      key: [false],
      query: [{ value: '', disabled: true }],
    });

    this.filterUsersForm.controls['key'].valueChanges.subscribe((key) => {
      if (key) {
        this.filterUsersForm.controls['query'].enable();
      } else {
        this.filterUsersForm.controls['query'].disable();
      }
    });
  }

  ngOnInit(): void {
    this.listUsers(0);
    this.usersTableDataSource.paginator = this.paginator;
    this.cd.detectChanges();

    this.paginator.page.subscribe((event: PageEvent) => {
      if (this.pageSize != this.paginator.pageSize) {
        this.resetPagination();
        this.listUsers(0);
      } else {
        this.listUsers(event.pageIndex);
      }
    });
    this.usersTableDataSource.sort = this.sort;
  }

  async userClick(row: any) {
    const { AdminUserClickDialogComponent } = await import(
      'src/app/pages/admin-page/components/admin-user-click-dialog/admin-user-click-dialog.component'
    );

    const dialog = this.dg.open(AdminUserClickDialogComponent, {
      data: {
        mode: 'edit',
        sub: row.Sub,
        name: `${row['First name']} ${row['Last name']}`,
        email: row.Email,
        firstName: `${row['First name']}`,
        lastName: `${row['Last name']}`,
        mfaActive: row['MFA Active'] === 'Yes',
      },
    });

    dialog.componentInstance.updateDataUser = (
      userData: any,
      costEstimation: number | null,
    ) => {
      this.updateData(userData, row.Email, costEstimation);
    };

    dialog.afterClosed().subscribe((data) => {
      if (_.get(data, 'reload', false)) {
        this.resetPagination();
        this.listUsers(0);
      }
    });
  }

  async addNewUser() {
    const { AdminUserClickDialogComponent } = await import(
      'src/app/pages/admin-page/components/admin-user-click-dialog/admin-user-click-dialog.component'
    );
    const dialog = this.dg.open(AdminUserClickDialogComponent, {
      data: { mode: 'create' },
    });
    dialog.afterClosed().subscribe((data) => {
      if (_.get(data, 'reload', false)) {
        this.resetPagination();
        this.listUsers(0);
      }
    });
  }

  resetPagination() {
    this.pageTokens = new Map<number, string>();
    this.paginator.pageIndex = 0;
    this.pageSize = this.paginator.pageSize;
  }

  filterUsers() {
    this.resetPagination();
    this.listUsers(0);
  }

  formatData(quota: number, used: number, isConvert: boolean, isRaw?: boolean) {
    if (isConvert) {
      const valueInGB = formatBytes(used, 2);
      if (isRaw) {
        return `${quota}GB / ${valueInGB}`;
      }
      return `${bytesToGigabytes(quota)}GB / ${valueInGB}`;
    }
    return ` ${quota} Count(s) / ${used} Count(s)`;
  }

  listUsers(page: number) {
    const form = this.filterUsersForm.value;
    let key = null;
    let query = null;

    if (form.key && !_.isEmpty(form.query)) {
      key = form.key;
      query = form.query;
    }

    if (!this.pageTokens.get(page) && page > 0) {
      this.paginator.pageIndex--;
      this.tstr.warning('No more items to show', 'Warning');
      return;
    }

    this.usersLoading = true;
    this.adminServ
      .listUsers(this.pageSize, this.pageTokens.get(page) || null, key, query)
      .pipe(catchError(() => of(null)))
      .subscribe(async (response) => {
        if (!response) {
          this.tstr.error('API request failed', 'Error');
          this.usersTableDataSource.data = [];
        } else {
          if (
            response &&
            response.users.length <= 0 &&
            this.paginator.pageIndex > 0
          ) {
            this.paginator.pageIndex--;
            this.tstr.warning('No more items to show', 'Warning');
            this.usersLoading = false;
            return;
          }

          const users = _.map(_.get(response, 'users', []), (user: any) => {
            const usageCount = user.Usage?.usageCount ?? 0;
            const usageSize = user.Usage?.usageSize ?? 0;
            const userQuotaCount = user.Usage?.quotaQueryCount;
            const userSize = user.Usage?.quotaSize;
            const userInfo = user.UserInfo || {
              institutionType: '',
              institutionName: '',
            };

            return {
              Sub: _.get(_.find(user.Attributes, { Name: 'sub' }), 'Value', ''),
              Email: _.get(
                _.find(user.Attributes, { Name: 'email' }),
                'Value',
                '',
              ),
              'First name': _.get(
                _.find(user.Attributes, { Name: 'given_name' }),
                'Value',
                '',
              ),
              'Last name': _.get(
                _.find(user.Attributes, { Name: 'family_name' }),
                'Value',
                '',
              ),
              'Role': user.Role?.role_name || '-',
              'Size Quota/Usage': this.formatData(
                user.Usage?.quotaSize ?? 0,
                usageSize,
                true,
              ),
              'Query Quota/Usage': this.formatData(
                user.Usage?.quotaQueryCount ?? 0,
                usageCount,
                false,
              ),
              Confirmed:
                _.get(user, 'UserStatus') === 'CONFIRMED' ? 'Yes' : 'No',
              'MFA Active': _.get(user, 'MFA', []).length > 0 ? 'Yes' : 'No',
              'Institution Type': _.capitalize(userInfo.institutionType),
              'Institution Name': userInfo.institutionName,
              usageCount,
              usageSize,
              userQuotaCount,
              userSize,
              'Est Cost': 'Calculating...',
            };
          });

          await Promise.all(
            users.map(async (user) => {
              user['Est Cost'] = await this.getEstimatedCost(
                user.userQuotaCount,
                bytesToGigabytes(user.userSize),
              );
            }),
          );

          this.usersTableDataSource.data = users;
          this.pageTokens.set(page + 1, response.pagination_token);
        }

        this.usersLoading = false;
      });
  }

  updateData(userData: any, userEmail: string, costEstimation: number | null) {
    const indexData = this.usersTableDataSource.data.findIndex(
      (e: any) => e.Email === userEmail,
    );

    if (indexData > -1) {
      this.usersTableDataSource.data[indexData]['Size Quota/Usage'] =
        this.formatData(
          userData.quotaSize ?? 0,
          this.usersTableDataSource.data[indexData].usageSize ?? 0,
          true,
          true,
        );
      this.usersTableDataSource.data[indexData]['Query Quota/Usage'] =
        this.formatData(
          userData.quotaQueryCount ?? 0,
          this.usersTableDataSource.data[indexData].usageCount ?? 0,
          false,
        );
      this.usersTableDataSource.data[indexData]['Est Cost'] =
        `$${costEstimation}`;
      return;
    }
  }

  async getEstimatedCost(
    usageCount: number,
    usageSize: number,
  ): Promise<string> {
    try {
      const res = await firstValueFrom(
        this.aws.calculateQuotaEstimationPerMonth(usageCount, usageSize),
      );
      return `$${res}`;
    } catch (error) {
      console.error('Estimation failed:', error);
      return '$0.00';
    }
  }
}
