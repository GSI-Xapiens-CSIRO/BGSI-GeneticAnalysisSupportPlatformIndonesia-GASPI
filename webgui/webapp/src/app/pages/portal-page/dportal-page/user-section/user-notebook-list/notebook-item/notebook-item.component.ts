import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DportalService } from 'src/app/services/dportal.service';
import { InstanceName } from '../user-notebook-list.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { catchError, of } from 'rxjs';
import { AwsService } from 'src/app/services/aws.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HasPermissionDirective } from 'src/app/directives/has-permission.directive';

export enum Status {
  PENDING = 'Pending',
  IN_SERVICE = 'InService',
  STOPPING = 'Stopping',
  STOPPED = 'Stopped',
  FAILED = 'Failed',
  DELETING = 'Deleting',
  UPDATING = 'Updating',
}

export interface InstanceDetails {
  status: Status;
  volumeSize: number;
  instanceType: string;
}

export interface SignedNotebookUrl {
  AuthorizedUrl: string;
}

@Component({
  selector: 'app-notebook-item',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    HasPermissionDirective,
  ],
  templateUrl: './notebook-item.component.html',
  styleUrl: './notebook-item.component.scss',
})
export class NotebookItemComponent implements OnInit {
  @Input({ required: true }) notebook!: InstanceName;
  @Output() deleted = new EventEmitter<void>();
  status: InstanceDetails | null = null;
  costEstimation: number | null = null;
  Status = Status;

  constructor(
    private dps: DportalService,
    private dg: MatDialog,
    private aws: AwsService,
  ) { }

  ngOnInit(): void {
    this.getStatus();
  }

  public getStatus() {
    this.dps.getMyNotebookStatus(this.notebook).subscribe((res) => {
      this.status = res;
      this.constructListWithCostEstimation();
    });
  }

  constructListWithCostEstimation() {
    if (!this.status) return;

    this.aws
      .calculateTotalPricePerMonth(
        this.status.instanceType,
        this.status.volumeSize,
        this.status.status,
      )
      .subscribe((costEstimation) => {
        this.costEstimation = costEstimation;
      });
  }

  async stop() {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Stop Notebook',
        message: 'Are you sure you want to stop this notebook?',
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.dps.stopMyNotebook(this.notebook).subscribe(() => {
          this.getStatus();
        });
      }
    });
  }

  async start() {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Start Notebook',
        message: 'Are you sure you want to start this notebook?',
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.dps.startMyNotebook(this.notebook).subscribe(() => {
          this.getStatus();
        });
      }
    });
  }

  async delete() {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete Notebook',
        message: 'Are you sure you want to delete this notebook?',
      },
    });
    dialog.afterClosed().subscribe((result) => {
      if (result) {
        this.dps
          .deleteMyNotebook(this.notebook)
          .pipe(catchError(() => of(null)))
          .subscribe(() => {
            this.deleted.emit();
          });
      }
    });
  }

  url() {
    this.dps
      .getMyNotebookUrl(this.notebook)
      .subscribe((nbUrlObj: SignedNotebookUrl) => {
        const url = nbUrlObj.AuthorizedUrl;
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.click();
      });
  }

  showTooltip(message: string) {
    const urlMap: Record<string, string> = {
      Pending: `Notebook is being created`,
      Stopped: `Notebook cannot be opened unless it is restarted and then opened again.`,
      Stopping: `Notebook is being stopped`,
    };

    const url = urlMap[message] || ``;
    return url;
  }

  getStatusColor(status: string): string {
    if (status === Status.STOPPED) return 'red';
    if (status === Status.PENDING || status === Status.STOPPING)
      return 'goldenrod';
    return 'inherit';
  }
}
