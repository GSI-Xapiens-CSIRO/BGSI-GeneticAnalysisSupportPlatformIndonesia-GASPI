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
import { timer } from 'rxjs';

@Component({
  selector: 'app-user-file-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    CommonModule,
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
  totalSizeRemainingText: string = '';

  loadingUsage: boolean = false;

  constructor(
    private dg: MatDialog,
    private uq: UserQuotaService,
  ) {}

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

  generateTotalSize(files: any[], quotaSize: number = 0) {
    const bytesTotal = getTotalStorageSize(files);

    this.totalSize = bytesTotal;
    this.totalSizeFormatted = formatBytes(bytesTotal, 2);

    this.totalSizeRemainingText = formatBytes(
      Math.floor(quotaSize - this.totalSize),
      2,
    );
  }

  async currentUsage(files: any[]) {
    this.loadingUsage = true;

    const { quotaSize, costEstimation } = await firstValueFrom(
      this.uq.getCurrentUsage(),
    );

    this.generateTotalSize(files, quotaSize);

    this.quotaSizeFormatted = formatBytes(quotaSize, 2);
    this.costEstimation = costEstimation;

    this.loadingUsage = false;

    return { quotaSize };
  }

  async copy(file: any) {
    const url = await Storage.get(file.key, {
      expires: 3600,
      level: 'private',
    });

    navigator.clipboard
      .writeText(url)
      .then(() => {
        console.log('URL copied to clipboard');
      })
      .catch((err) => {
        console.error('Could not copy URL: ', err);
      });
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
