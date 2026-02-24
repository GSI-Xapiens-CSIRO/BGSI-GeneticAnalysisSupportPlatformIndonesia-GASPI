import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Storage } from 'aws-amplify';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { formatBytes, getTotalStorageSize } from 'src/app/utils/file';
import { UserQuotaService } from 'src/app/services/userquota.service';
import { HasPermissionDirective } from 'src/app/directives/has-permission.directive';

@Component({
  selector: 'app-user-file-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ClipboardModule,
    MatDialogModule,
    CommonModule,
    HasPermissionDirective,
  ],
  templateUrl: './user-file-list.component.html',
  styleUrl: './user-file-list.component.scss',
})
export class UserFileListComponent implements OnInit {
  myFiles: any[] = [];

  quotaSize: number = 0;
  quotaSizeFormatted: string = '';
  costEstimation: number = 0;
  totalSize: number = 0;
  totalSizeFormatted: string = '';
  totalSizeRemainingText: string = '0 B';

  loadingUsage: boolean = false;

  constructor(
    private dg: MatDialog,
    private uq: UserQuotaService,
    private cb: Clipboard,
  ) { }

  async ngOnInit(): Promise<void> {
    this.loadList();
  }

  loadList() {
    this.list();
  }

  async list() {
    const res = await Storage.list(``, {
      pageSize: 'ALL',
      level: 'private',
    });

    this.myFiles = res.results;
    this.currentUsage(this.myFiles);
  }

  generateTotalSize(files: any[], quotaSize?: number) {
    const bytesTotal = getTotalStorageSize(files);

    this.totalSize = bytesTotal;
    this.totalSizeFormatted = formatBytes(bytesTotal, 2);

    // Use provided quotaSize or fall back to the stored quotaSize
    const effectiveQuotaSize =
      quotaSize !== undefined ? quotaSize : this.quotaSize;

    // Calculate remaining, ensure it's not negative
    const remaining = Math.max(0, effectiveQuotaSize - this.totalSize);

    this.totalSizeRemainingText = formatBytes(remaining, 2);
  }

  async currentUsage(files: any[]) {
    this.loadingUsage = true;

    const { quotaSize, costEstimation, usageSize } = await firstValueFrom(
      this.uq.getCurrentUsage(),
    );

    // Store quotaSize for later use (e.g., after delete)
    this.quotaSize = quotaSize;

    // Use usageSize from backend instead of calculating from files
    this.totalSize = usageSize;
    this.totalSizeFormatted = formatBytes(usageSize, 2);

    // Calculate remaining based on backend usageSize
    const remaining = Math.max(0, quotaSize - usageSize);
    this.totalSizeRemainingText = formatBytes(remaining, 2);

    this.quotaSizeFormatted = formatBytes(quotaSize, 2);
    this.costEstimation = costEstimation;

    this.loadingUsage = false;

    return { quotaSize };
  }

  copy(file: any) {
    const command = `gaspifs download -f "${file.key}" -d files`;
    const pending = this.cb.beginCopy(command);

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

  async delete(file: any) {
    const { ActionConfirmationDialogComponent } = await import(
      '../../../../../components/action-confirmation-dialog/action-confirmation-dialog.component'
    );

    const dialog = this.dg.open(ActionConfirmationDialogComponent, {
      data: {
        title: 'Delete File',
        message: 'Are you sure you want to delete this file?',
      },
    });
    dialog.afterClosed().subscribe(async (result) => {
      if (result) {
        await Storage.remove(file.key, { level: 'private' });

        this.myFiles = this.myFiles.filter((f) => f.key !== file.key);

        // Update total size
        this.generateTotalSize(this.myFiles);
      }
    });
  }

  getFilename(str: string | null) {
    const match = str?.match(/\/([^\/]+)/);
    return match ? match[1] : '-';
  }
}
