import { Component, OnInit, ViewChildren } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { instanceGroups, volumeSizes } from './data';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { DportalService } from 'src/app/services/dportal.service';
import { catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';
import { NotebookItemComponent } from './notebook-item/notebook-item.component';
import {
  MatExpansionModule,
  MatExpansionPanel,
} from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';
import { AwsService } from 'src/app/services/aws.service';
import { ToastrService } from 'ngx-toastr';

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
  ],
  templateUrl: './user-notebook-list.component.html',
  styleUrl: './user-notebook-list.component.scss',
})
export class UserNotebookListComponent implements OnInit {
  @ViewChildren('notebook') notebookItems?: NotebookItemComponent[];
  notebooks: InstanceName[] = [];
  instanceGroups = instanceGroups;
  volumeSizes = volumeSizes;
  instanceForm: FormGroup;
  loading = false;
  estimatedPrice: number | null = null;

  constructor(
    fb: FormBuilder,
    private dps: DportalService,
    private tstr: ToastrService,
    private dg: MatDialog,
    private aws: AwsService,
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
  }

  onChangesCalculatePrice() {
    this.instanceForm.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((values) => {
        if (values.instanceType && values.volumeSize) {
          this.aws
            .calculateTotalPricePerMonth(values.instanceType, values.volumeSize)
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

  async keys() {
    const { AccessKeysDialogComponent } = await import(
      './access-keys-dialog/access-keys-dialog.component'
    );

    const dialog = this.dg.open(AccessKeysDialogComponent);

    dialog.afterClosed().subscribe(() => {});
  }

  remove(notebook: InstanceName) {
    this.notebooks = this.notebooks.filter((n) => n !== notebook);
  }

  resetForm() {
    this.estimatedPrice = null;
    this.instanceForm.reset();
  }
}
