import { Component, OnInit, ViewChildren } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import {
  cpuInstanceTypes,
  gpuInstanceTypes,
  InstanceGroups,
  instanceGroups,
  VolumeSizes,
  volumeSizes,
} from './data';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { DportalService } from 'src/app/services/dportal.service';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  of,
  timer,
} from 'rxjs';
import { NotebookItemComponent } from './notebook-item/notebook-item.component';
import {
  MatExpansionModule,
  MatExpansionPanel,
} from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';
import { AwsService } from 'src/app/services/aws.service';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService } from 'src/app/services/spinner.service';
import { HasPermissionDirective, DisableIfNoPermissionDirective } from 'src/app/directives/permission.directive';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { UserQuotaService } from 'src/app/services/userquota.service';
import { NotebookRole } from 'src/app/pages/admin-page/components/enums';
import { Router, NavigationEnd } from '@angular/router';
import { MatTooltip } from '@angular/material/tooltip';

export type InstanceName = string;

export interface InstanceStartInfo {
  instanceName: string;
  instanceType: string;
  volumeSize: number;
}

@Component({
  selector: 'app-user-notebook-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    NotebookItemComponent,
    MatExpansionModule,
    MatTooltip,
    HasPermissionDirective,
    DisableIfNoPermissionDirective,
  ],
  templateUrl: './user-notebook-list.component.html',
  styleUrl: './user-notebook-list.component.scss',
})
export class UserNotebookListComponent implements OnInit {
  @ViewChildren('notebook') notebookItems?: NotebookItemComponent[];
  notebooks: InstanceName[] = [];
  instanceGroups: InstanceGroups = instanceGroups;
  volumeSizes: VolumeSizes = volumeSizes;
  instanceForm: FormGroup;
  loading = false;
  estimatedPrice: number | null = null;

  constructor(
    fb: FormBuilder,
    private dps: DportalService,
    private tstr: ToastrService,
    private dg: MatDialog,
    private aws: AwsService,
    private uq: UserQuotaService,
    private router: Router,
  ) {
    this.instanceForm = fb.group({
      instanceName: fb.control('', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(30),
        Validators.pattern('^[a-zA-Z0-9-]+$'),
      ]),
      instanceType: fb.control('', [Validators.required]),
      volumeSize: fb.control('', [Validators.required]),
    });
  }

  ngOnInit(): void {
    this.list();

    this.onChangesCalculatePrice();

    timer(500).subscribe(() => this.generateInstanceName());
  }

  refresh() {
    this.list();
    timer(500).subscribe(() => this.generateInstanceName());
  }

  // Generate instance name based on the current role
  async generateInstanceName() {
    const { notebookRole } = await firstValueFrom(this.uq.getCurrentUsage());
    const isBasicRole = notebookRole === NotebookRole.BASIC;

    if (isBasicRole) {
      const basicRoleCpu = cpuInstanceTypes.filter((i) => {
        if (isBasicRole) {
          return i.name === 'ml.t3.medium';
        }

        // Advanced roles can use any CPU instance
        return true; // For other roles, include all CPU instances
      });

      this.instanceGroups = [
        { name: 'CPU Generic', instances: basicRoleCpu, gpu: false },
      ];

      this.volumeSizes = volumeSizes.filter((v) => v.size === 5);

      this.instanceForm.patchValue({
        instanceType: this.instanceGroups[0].instances[0].name,
        volumeSize: this.volumeSizes[0].size,
      });
    }
  }

  onChangesCalculatePrice() {
    this.instanceForm.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((values) => {
        if (values.instanceType && values.volumeSize) {
          this.aws
            .calculateTotalPricePerMonth(
              values.instanceType,
              values.volumeSize,
              '',
            )
            .pipe(catchError(() => of(null)))
            .subscribe((price) => {
              this.estimatedPrice = price;
            });
        }
      });
  }

  list() {
    this.notebookItems?.map((n) => n.getStatus());
    this.loading = true;
    this.dps
      .getMyNotebooks()
      .pipe(catchError(() => of(null)))
      .subscribe((notebooks: InstanceName[]) => {
        if (notebooks) {
          this.notebooks = notebooks;
        }
        this.loading = false;
      });
  }

  create(info: InstanceStartInfo, panel: MatExpansionPanel) {
    this.dps
      .createMyNotebookInstance(
        info.instanceName,
        info.instanceType,
        info.volumeSize,
      )
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) {
          this.tstr.error('Failed to create notebook', 'Error');
        }
        this.list();
        this.resetForm();
        panel.close();
      });
  }

  async cliHelp() {
    const { CliHelpModalComponent } = await import(
      './cli-help-modal/cli-help-modal.component'
    );

    const dialog = this.dg.open(CliHelpModalComponent, {
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });

    dialog.afterClosed().subscribe(() => { });
  }

  remove(notebook: InstanceName) {
    this.notebooks = this.notebooks.filter((n) => n !== notebook);
  }

  resetForm() {
    this.estimatedPrice = null;
    this.instanceForm.reset();
  }
}
