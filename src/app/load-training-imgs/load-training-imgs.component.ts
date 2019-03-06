import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UploadEvent, UploadFile, FileSystemFileEntry, FileSystemDirectoryEntry, FileDropModule } from 'ngx-file-drop';
import * as Rx from 'rxjs';
import { any, Tensor3D } from '@tensorflow/tfjs';
import { forEach } from '@angular/router/src/utils/collection';
import { delay, mergeMap, map } from 'rxjs/operators';
import { interceptingHandler } from '@angular/common/http/src/module';
import * as tf from '@tensorflow/tfjs';
// import { Image } from 'p5';


interface ImgLabel {
  img: any;
  label: string;
}

interface Ifl {
  file: FileSystemFileEntry;
  label: string;
  [x: string]: any;
}

interface Ifl2 extends Ifl{
  fileReaded: string | ArrayBuffer ;
  img?: HTMLImageElement;
  label: string;
}

interface Ifl3 extends Ifl2{
  data: tf.Tensor;
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
        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
  }

  /** Respuesta al evento de soltar los ficheros
   *
   * @param event - Datos con la informacion soltada
   */
  public dropped2(event: UploadEvent) {
    const files = event.files;
    let cc = 0;
    imageLabels$(files).subscribe(
      (val) => {
        // console.log(val);
        // (this.imgPreview.nativeElement as HTMLImageElement).src = val;
        console.log(`img count ${cc++}`);
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

/**
 *
 * @param files - array de datos de imagenes junto con sus labels
 */
function imageLabels$(files: UploadFile[]): Rx.Observable<any> {
  if (!files) return;
  const files2 = files.filter(file => file.fileEntry.isFile);
  console.log(`Hay ${files2.length} imagenes`);
  const files3: Ifl[] = files2.map((file) => ({ file: (file.fileEntry as FileSystemFileEntry), label: getFileLabel(file.relativePath) }));
  return Rx.from(files3).pipe(
    mergeMap((val: Ifl) => readFileSFEAsDataURL2$(val)),
    mergeMap((val: Ifl2) => srcToImg$(val)),
    map((val: Ifl3) => {
      const prov=val.data;
      console.log('Modificando tensor');
      val.data=loadAndProcessImage(prov);
      prov.dispose();
      return val;
    })
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
  // console.log('readFileSFEAsDataURL()');
  return Rx.Observable.create((observable) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      console.log('cargado fichero');
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

function readFileSFEAsDataURL2$(fileNfo: Ifl): Rx.Observable<Ifl2> {
  console.log('readFileSFEAsDataURL2$');
  return Rx.Observable.create((observable) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      console.log('cargado fichero');
      const res: Ifl2 ={...fileNfo, fileReaded:fileReader.result};
      observable.next(res);// observable.next(fileReader.result);
      observable.complete();
    };
    fileReader.onerror = (err) => {
      observable.error(err);
    };
    fileNfo.file.file((f) => {
      console.log(`pidiendo fichero ${f.name}`);
      fileReader.readAsDataURL(f);
    });
  });
}

/** Crea un observable que carga un tensor a partir del fuente de una imagen
 *
 * @param src La fuente de una imagen
 */
function srcToImg$(src: Ifl2): Rx.Observable<Ifl3> {
  return Rx.Observable.create((observable) => {
    const img = new Image();
    img.onload = function() {
      const res: Ifl3 = {...src, data: tf.fromPixels(img)};
      console.log('pasada imagen a tensor');
      observable.next(res);
      observable.complete();
    };
    img.onerror = function(err) {
      observable.error(err);
    };
    img.src = src.fileReaded as any;
  });
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

/** Recorta el tamaño mas largo para convertir la imagen en cuadrada
 * @param {tf.Tensor} img
 * @returns {tf.Tensor}
 */
function cropImage(img: tf.Tensor): tf.Tensor {
  const width = img.shape[0];
  const height = img.shape[1];

  // use the shorter side as the size to which we will crop
  const shorterSide = Math.min(img.shape[0], img.shape[1]);

  // calculate beginning and ending crop points
  const startingHeight = (height - shorterSide) / 2;
  const startingWidth = (width - shorterSide) / 2;
  const endingHeight = startingHeight + shorterSide;
  const endingWidth = startingWidth + shorterSide;

  // return image data cropped to those points
  return img.slice([startingWidth, startingHeight, 0], [endingWidth, endingHeight, 3]);
}

/** Expands our Tensor and translates the integers into floats with
 *
 * @param image
 */
function batchImage(image: tf.Tensor): tf.Tensor {
  // Expand our tensor to have an additional dimension, whose size is 1
  const batchedImage = image.expandDims(0);
  // Turn pixel data into a float between -1 and 1.
  return batchedImage.toFloat().div(tf.scalar(127)).sub(tf.scalar(1));
}

/** Deja la imagen (tensor) con el formato adecuado para su procesamiento
 * @param image - tensor formado a partir de una imagen
 */
function loadAndProcessImage(image: tf.Tensor): tf.Tensor {
  return tf.tidy(() => {
    const croppedImage: tf.Tensor3D = cropImage(image) as tf.Tensor3D;
    const resizedImage = tf.image.resizeBilinear(croppedImage, [224, 224]); // resizeImage(croppedImage);
    const batchedImage = batchImage(resizedImage);
    return batchedImage;
  });
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
