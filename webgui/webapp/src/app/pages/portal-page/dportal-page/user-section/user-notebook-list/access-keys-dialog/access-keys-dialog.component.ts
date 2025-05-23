import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import AWS from 'aws-sdk';
import { formatBytes, getTotalStorageSize } from 'src/app/utils/file';
import { Storage } from 'aws-amplify';
import { UserQuotaService } from 'src/app/services/userquota.service';
import { firstValueFrom } from 'rxjs';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';

enum CmdType {
  LINUX = 'Linux',
  CMD = 'CMD',
}

interface CmdTab {
  label: string;
  plain: string;
  html: string;
  tab: CmdType;
}
const filePath = '/your/path/to/file.format';

@Component({
  selector: 'app-access-keys-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    ClipboardModule,
    MatTooltipModule,
    MatIconModule,
    MatTabsModule,
  ],
  templateUrl: './access-keys-dialog.component.html',
  styleUrl: './access-keys-dialog.component.scss',
})
export class AccessKeysDialogComponent {
  script = '';
  scriptHtml = '';
  json = '';
  totalStorageSize = 0;
  expiredsText = '';
  limitSizeText = '';
  cmdTabs: CmdTab[] = [];

  selectedTab: CmdType = CmdType.LINUX;
  fileNameForm: FormGroup;

  constructor(
    private auth: AuthService,
    private uq: UserQuotaService,
  ) {
    this.fileNameForm = new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(30),
        Validators.pattern('^[a-zA-Z0-9-_.]*$'),
      ]),
    });
  }

  async generateTotalSize() {
    const res = await Storage.list(``, {
      pageSize: 'ALL',
      level: 'private',
    });

    const bytesTotal = getTotalStorageSize(res.results);
    return bytesTotal;
  }

  generateUploadScripts(res: any): void {
    // macOS / Linux
    const linux = [
      `curl -X POST ${res.url} \\`,
      ...Object.entries(res.fields).map(
        ([k, v]) => `  -F ${JSON.stringify(k)}=${JSON.stringify(v)} \\`,
      ),
      `  -F "file=@${filePath}"`,
    ];
    const linuxHtml = [
      ...linux.slice(0, -1),
      `  -F "file=@<span class='text-red-500'>${filePath}</span>"`,
    ].join('<br>');

    // Windows CMD
    const cmd = [
      `curl -X POST ${res.url} ^`,
      ...Object.entries(res.fields).map(
        ([k, v]) => `  -F ${JSON.stringify(k)}=${JSON.stringify(v)} ^`,
      ),
      `  -F "file=@${filePath}"`,
    ];
    const cmdHtml = [
      ...cmd.slice(0, -1),
      `  -F "file=@<span class='text-red-500'>${filePath}</span>"`,
    ].join('<br>');

    this.cmdTabs = [
      {
        label: 'macOS / Linux',
        plain: linux.join('\n'),
        html: linuxHtml,
        tab: CmdType.LINUX,
      },
      {
        label: 'Windows CMD',
        plain: cmd.join('\n'),
        html: cmdHtml,
        tab: CmdType.CMD,
      },
    ];
  }

  // This method is to calculate and set the selected index based on `selectedTab`
  get selectedIndex(): number {
    return this.cmdTabs.findIndex((tab) => tab.tab === this.selectedTab);
  }

  set selectedIndex(index: number) {
    this.selectedTab = this.cmdTabs[index]?.tab || 'LINUX'; // Set the selectedTab based on index
  }

  async generateCurlCommand(filename: string): Promise<void> {
    try {
      const { accessKeyId, secretAccessKey, sessionToken, identityId } =
        await this.auth.getKeys();

      const totalStorageSize = await this.generateTotalSize();
      const { quotaSize: totalQuotaSize } = await firstValueFrom(
        this.uq.getCurrentUsage(),
      );

      const limitSizeInBytes = Math.floor(totalQuotaSize - totalStorageSize);
      const expires = 60 * 5; // 5 minutes

      this.expiredsText = `${expires / 60} Minute${
        expires / 60 > 1 ? 's' : ''
      }`;

      this.limitSizeText = formatBytes(limitSizeInBytes, 2);

      const s3 = new AWS.S3({
        region: environment.auth.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        },
      });
      const res = s3.createPresignedPost({
        Bucket: environment.storage.dataPortalBucket,
        Fields: {
          key: `private/${identityId}/${filename}`,
        },
        Expires: expires,
        Conditions: [['content-length-range', 0, limitSizeInBytes]],
      });

      this.generateUploadScripts(res);
    } catch (error) {
      console.error('Error initializing access keys:', error);
    }
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.script).then(() => {
      console.log('Script copied to clipboard!');
    });
  }
}
