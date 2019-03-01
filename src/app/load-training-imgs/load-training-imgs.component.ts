import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UploadEvent, UploadFile, FileSystemFileEntry, FileSystemDirectoryEntry, FileDropModule } from 'ngx-file-drop';
import * as Rx from 'rxjs';
import { any } from '@tensorflow/tfjs';
import { forEach } from '@angular/router/src/utils/collection';
import { delay, mergeMap } from 'rxjs/operators';
import { interceptingHandler } from '@angular/common/http/src/module';


interface ImgLabel {
  img: any;
  label: string;
}

interface Ifl{
  file: FileSystemFileEntry;
  label: string;
  [x: string]: any;
}

@Component({
  selector: 'app-load-training-imgs',
  templateUrl: './load-training-imgs.component.html',
  styleUrls: ['./load-training-imgs.component.less']
})
export class LoadTrainingImgsComponent implements OnInit {
  public files: UploadFile[] = [];

  @ViewChild('miImg') imgPreview: ElementRef;
  public testImgLabel: string;

  constructor() { }

  ngOnInit() {
  }
  public test1() {
    const d = ['a', 'b', 'c', 'd'];
    miObsTest2$(d).subscribe(
      (data) => {
        console.log(data);
      },
      (err) => console.error(err),
      () => console.log('acabose')
    );
  }
  public dropped(event: UploadEvent) {
    this.files = event.files;
    for (const droppedFile of event.files) {
      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

          // Here you can access the real file
          console.log(droppedFile.relativePath, file);

          /*
          // You could upload it like this:
          const formData = new FormData()
          formData.append('logo', file, relativePath)

          // Headers
          const headers = new HttpHeaders({
            'security-token': 'mytoken'
          })

          this.http.post('https://mybackend.com/api/upload/sanitize-and-save-logo', formData, { headers: headers, responseType: 'blob' })
          .subscribe(data => {
            // Sanitized logo returned from backend
          })
          */

        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
  }

  public dropped2(event: UploadEvent) {
    const files = event.files;
    let cc=0;
    imageLabels$(files).subscribe(
      (val) => {
        //console.log(val);
        (this.imgPreview.nativeElement as HTMLImageElement).src=val;
        console.log(cc++);
      },
      (err) => console.error(err),
      () => {
        console.log('acabose');
      }
    );
  }

  public fileOver(event) {
    console.log(event);
  }

  public fileLeave(event) {
    console.log(event);
  }

}

function imageLabels$(files: UploadFile[]): Rx.Observable<any> {
  if (!files) return;
  const files2 = files.filter(file => file.fileEntry.isFile);
  console.log(`Hay ${files2.length} imagenes`);
  const files3: Ifl[]  = files2.map( (file) =>({file: (file.fileEntry as FileSystemFileEntry), label: getFileLabel(file.relativePath)}));
  return Rx.from(files2).pipe(
    mergeMap((val: any) => readFileSFEAsDataURL$(val.fileEntry))
  );
  return Rx.Observable.create(function (observer: Rx.Subscriber<string>) {
    if (!(files) || files.length === 0) {
      observer.complete();
      return;
    }
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {

      };
    }

    observer.next('Hello');
    observer.next('World');
    observer.complete();
  });
}

function readFileAsDataURL$(file: any): Rx.Observable<string> {
  return Rx.Observable.create((observable) => {
    const fileReader = new FileReader();

    fileReader.onload = (() => {
      observable.next(fileReader.result);
      observable.complete();
    });

    fileReader.readAsDataURL(file);
  });
}

function readFileSFEAsDataURL$(file: FileSystemFileEntry): Rx.Observable<string> {
  //console.log('readFileSFEAsDataURL()');
  return Rx.Observable.create((observable) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      observable.next(fileReader.result);
      observable.complete();
    };
    fileReader.onerror = (err) => {
      observable.error(err);
    };
    file.file((f) => {
      fileReader.readAsDataURL(f);
    });
  });
}


function readFileSFEAsDataURL2$(file: FileSystemFileEntry): Rx.Observable<any>{

}

function miObsTest1$(dataIn: string[]): Rx.Observable<string> {
  return Rx.from(dataIn);
}

function miObsTest2$(dataIn: string[]): Rx.Observable<string> {
  return Rx.from(dataIn).pipe(
    delay(4000)
  );
}

/** Devuelve el nombre del directorio justo superior al archivo
 *
 * @param  fullPath - Path del archivo
 * @returns  - Nombre del directorio justo superior
 */
function getFileLabel(fullPath: string): string {
  if (!fullPath) return null;
  const p = fullPath.split('/');
  if (p.length < 2) return null;
  return p[p.length - 2];
  // var filename = nameString.split("/").pop();
}


function sendMessage(message: string, cb: (err: any, res: any) => void) {
  //sendJS.sendMsg(message, cb);
}

function sendMessage2(message: string): Rx.Observable<string> {
  const sendResult = new Rx.Subject<string>();
  sendMessage(message,
          (err: any, res: any) => {
              if (!!err) {
                  sendResult.error(err);
              } else {
                  sendResult.next('Message was sent successfully.' + res);
              }
          }
  );
  return sendResult.asObservable();
}
