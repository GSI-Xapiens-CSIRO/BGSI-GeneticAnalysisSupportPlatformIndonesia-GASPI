import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-heart-beat',
  standalone: true,
  imports: [],
  templateUrl: './heart-beat.component.html',
  styleUrl: './heart-beat.component.scss',
})
export class HeartBeatComponent implements OnInit, OnDestroy {
  private intervalId: any;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.startHeartBeat();
  }

  ngOnDestroy(): void {
    this.stopHeartBeat();
  }

  private startHeartBeat(): void {
    this.intervalId = setInterval(() => {
      const then = Date.now();
      this.http
        .get('/assets/images/spinner.gif', {
          responseType: 'blob',
          headers: new HttpHeaders({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          }),
        })
        .subscribe({
          next: (blob) => {
            const now = Date.now();
            const elapsed = now - then;
            const size_kb = blob.size / 1024;
            const speed = size_kb / (elapsed / 1000); // KB/s
            if (speed < 100) {
              this.toastr.warning(
                `Your internet connection seems slow.`,
                'Warning',
              );
            }
          },
          error: (e) => {
            console.error('Heartbeat error:', e);
            this.toastr.warning(
              'Your internet connection seems unstable or down.',
              'Warning',
            );
          },
        });
    }, 30000);
  }

  private stopHeartBeat(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
