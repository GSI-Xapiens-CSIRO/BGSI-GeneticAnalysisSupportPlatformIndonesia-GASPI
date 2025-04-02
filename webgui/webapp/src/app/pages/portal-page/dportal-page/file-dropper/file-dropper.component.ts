import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-file-dropper',
  standalone: true,
  imports: [],
  templateUrl: './file-dropper.component.html',
  styleUrl: './file-dropper.component.scss',
})
export class FileDropperComponent {
  @ViewChild('dropzone') dropzone!: ElementRef;
  @ViewChild('input') input!: ElementRef;
  @Input() disabled: boolean = false;
  @Input() files: string[] = [];
  @Output() dropped = new EventEmitter<FileList>();

  constructor(private toastr: ToastrService) {}

  highlight(e: Event) {
    this.preventDefaults(e);
    if (this.disabled) {
      return;
    }
    if (this.dropzone) {
      this.dropzone.nativeElement.classList.add('bui-dropper-active');
    }
  }

  unhighlight(e: Event) {
    this.preventDefaults(e);
    if (this.disabled) {
      return;
    }
    if (this.dropzone) {
      this.dropzone.nativeElement.classList.remove('bui-dropper-active');
    }
  }

  handleDrop(e: DragEvent) {
    this.preventDefaults(e);
    if (this.disabled) {
      return;
    }
    const files: FileList = e.dataTransfer?.files ?? new FileList();
    this.handleFiles(files);
  }

  handlePick(e: Event) {
    const files = (e.target as HTMLInputElement).files ?? new FileList();
    this.handleFiles(files);
  }

  handleFiles(files: FileList) {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].name.length <= 32) {
        validFiles.push(files[i]);
      } else {
        this.toastr.warning(
          `File name ${files[i].name} is too long. Max length is 32 characters. This file has not been added to uploads.`,
          'Warning',
        );
      }
    }
    const validFileList = new DataTransfer();
    validFiles.forEach((file) => validFileList.items.add(file));
    this.dropped.emit(validFileList.files);
    this.input.nativeElement.value = '';
  }

  preventDefaults(e: Event) {
    e.preventDefault();
    e.stopPropagation();
  }
}
