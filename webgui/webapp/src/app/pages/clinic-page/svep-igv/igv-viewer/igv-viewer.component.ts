import { Component, ElementRef, Input } from '@angular/core';
declare var igv: any; // Declare IGV

@Component({
  selector: 'app-igv-viewer',
  providers: [],
  standalone: true,
  imports: [],
  templateUrl: './igv-viewer.component.html',
  styleUrl: './igv-viewer.component.scss',
})
export class IgvViewerComponent {
  @Input() data!: {
    projectName: string | null;
    bamURL: string | null;
    bamIndex: string | null;
  } | null;

  private igvBrowser: any = null;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    this.loadScript('https://cdn.jsdelivr.net/npm/igv@3.1.2/dist/igv.min.js')
      .then(() => {
        this.renderIGV();
      })
      .catch((error) => {
        console.error('Error loading IGV script:', error);
      });
  }

  loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;

      script.onload = () => resolve(); // Correctly assign a void function
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });
  }

  async renderIGV() {
    const igvContainer = this.el.nativeElement.querySelector('.igv-container');

    if (!igvContainer) {
      console.error('Error: IGV container not found.');
      return;
    }

    const options = {
      genome: 'hg38',
      locus: '',
      tracks: [
        {
          url: this.data?.bamURL,
          indexURL: this.data?.bamIndex,
          format: 'bam',
        },
      ],
    };

    try {
      this.igvBrowser = await igv.createBrowser(igvContainer, options);
    } catch (error) {
      console.error('Error initializing IGV.js:', error);
    }
  }

  ngOnDestroy(): void {
    if (this.igvBrowser) {
      this.igvBrowser.removeAllTracks();
      this.igvBrowser = null;
    }
  }
}
