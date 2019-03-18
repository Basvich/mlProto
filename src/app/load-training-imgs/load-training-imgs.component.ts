import {Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import {UploadEvent, UploadFile, FileSystemFileEntry, FileSystemDirectoryEntry, FileDropModule} from 'ngx-file-drop';
import * as Rx from 'rxjs';
import {any, Tensor3D, Tensor} from '@tensorflow/tfjs';
import {forEach} from '@angular/router/src/utils/collection';
import {delay, mergeMap, map} from 'rxjs/operators';
import {interceptingHandler} from '@angular/common/http/src/module';
import * as tf from '@tensorflow/tfjs';
import {MlImgClassifier, IImgLabel} from './ml-img-classifier';
import MLClassifier from './index';
import {IArgs} from './types';
import {isArray} from 'util';
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

interface Ifl2 extends Ifl {
  fileReaded: string | ArrayBuffer;
  img?: HTMLImageElement;
  label: string;
}

interface Ifl3 extends Ifl2 {
  data: tf.Tensor;
}




@Component({
  selector: 'app-load-training-imgs',
  templateUrl: './load-training-imgs.component.html',
  styleUrls: ['./load-training-imgs.component.less']
})
export class LoadTrainingImgsComponent implements OnInit {

  constructor() {}

  protected bagClassifier: MlImgClassifier;
  protected mlClassifier: MLClassifier;

  protected provData2;

  public files: UploadFile[] = [];

  @ViewChild('miImg') imgPreview: ElementRef;
  public testImgLabel: string;

  deepDiffMapper = function deepDiffMapper() {
    return {
      VALUE_CREATED: 'created',
      VALUE_UPDATED: 'updated',
      VALUE_DELETED: 'deleted',
      VALUE_UNCHANGED: 'unchanged',
      map(obj1, obj2) {
        if (this.isFunction(obj1) || this.isFunction(obj2)) {
          throw new Error('Invalid argument. Function given, object expected.');
        }
        if (this.isValue(obj1) || this.isValue(obj2)) {
          return {
            type: this.compareValues(obj1, obj2),
            data: (obj1 === undefined) ? obj2 : obj1
          };
        }

        const diff = {};
        for (const key in obj1) {
          if (this.isFunction(obj1[key])) {
            continue;
          }

          let value2;
          if ('undefined' != typeof (obj2[key])) {
            value2 = obj2[key];
          }

          diff[key] = this.map(obj1[key], value2);
        }
        for (const key in obj2) {
          if (this.isFunction(obj2[key]) || ('undefined' != typeof (diff[key]))) {
            continue;
          }

          diff[key] = this.map(undefined, obj2[key]);
        }

        return diff;

      },
      compareValues(value1, value2) {
        if (value1 === value2) {
          return this.VALUE_UNCHANGED;
        }
        if (this.isDate(value1) && this.isDate(value2) && value1.getTime() === value2.getTime()) {
          return this.VALUE_UNCHANGED;
        }
        if ('undefined' == typeof (value1)) {
          return this.VALUE_CREATED;
        }
        if ('undefined' == typeof (value2)) {
          return this.VALUE_DELETED;
        }

        return this.VALUE_UPDATED;
      },
      isFunction(obj) {
        return {}.toString.apply(obj) === '[object Function]';
      },
      isArray(obj) {
        return {}.toString.apply(obj) === '[object Array]';
      },
      isObject(obj) {
        return {}.toString.apply(obj) === '[object Object]';
      },
      isDate(obj) {
        return {}.toString.apply(obj) === '[object Date]';
      },
      isValue(obj) {
        return !this.isObject(obj) && !this.isArray(obj);
      }
    };
  }();

  ngOnInit() {
    this.initClasifier();

    const args: IArgs = {
      onAddDataStart: () => console.log('onAddDataStart'),
      onAddDataComplete: () => console.log('onAddDataComplete'),
      onTrainStart: () => console.log('onTrainStart'),
      onTrainComplete: () => console.log('onTrainComplete')

    };
    this.mlClassifier = new MLClassifier(args);
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

  public test2() {
    const d = ['a', 'b', 'c', 'd'];
    const classes = getClasses(d);
    const indices = [0, 1, 2];
    const depth = 3;
    const res = tf.oneHot(indices, depth);
    console.log(res.toString());
    const classLength = Object.keys(classes).length;
    const labelIndex = classes['b'];
    const res2 = tf.oneHot([1, 2], 2);
    console.log(res2.toString());
  }

  public testTrain() {
    const thats=this;
    this.bagClassifier.train$().subscribe(
      (data: tf.History) => {
        console.log(data);
      },
      (err) => {
        console.error(err);
        console.warn('Diferencia entre modelos preentrenados');
        thats.showModelsDifs(thats.mlClassifier.pretrainedModel, thats.bagClassifier.pretrainedModel);
        console.warn('Diferencia entre modelos');
        thats.showModelsDifs(thats.mlClassifier.lastModel, thats.bagClassifier.lastModel);
        console.log('final de mostrar diferencias');
      },
      () => console.log('done')
    );
  }

  public async testAddDataMlClass() {
    const labels: string[] = this.provData2.map((val: IImgLabel) => val.label);
    const arrImgs: HTMLImageElement[] = this.provData2.map((val: IImgLabel) => (val.img));
    /* this.mlClassifier.addData(arrImgs,labels,'train').then(
      (value) => {
        console.log('add Data finalizado');
        console.log(value);
      },
      (err) => {
        console.log('Hubo un error');
        console.error(err);
      }
    ).catch(
      (rea)=>{
        console.error(rea);
      }
    ); */
    try {
      await this.mlClassifier.addData(arrImgs, labels, 'train');
      console.log('Finish add data');
    } catch (err) {
      console.error(err);
    }
  }

  public testTrainMlClass() {
    this.mlClassifier.train().then(
      (value) => {
        console.log(value);
        this.showModelsDifs(this.mlClassifier.lastModel, this.bagClassifier.lastModel);
      }
    ).catch(
      (rea) => {
        console.error(rea);
      }
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
    const provDataIn = [];
    this.provData2 = [];
    imageLabels$(files).subscribe(
      (val) => {
        // console.log(val);
        // (this.imgPreview.nativeElement as HTMLImageElement).src = val;
        console.log(`img count ${cc++} label: '${val.label}'`);
        provDataIn.push({label: val.label, img: val.data});
        this.provData2.push({label: val.label, img: val.img});
      },
      (err) => console.error(err),
      () => {
        console.log(`acabose, tenemos ${provDataIn.length} items`);
        this.trainData(provDataIn);
      }
    );
  }

  public fileOver(event) {
    console.log(event);
  }

  public fileLeave(event) {
    console.log(event);
  }


  public initClasifier() {
    if (this.bagClassifier) return;
    this.bagClassifier = new MlImgClassifier();
  }

  protected trainData(dataIn: IImgLabel[]) {
    this.bagClassifier.addData(dataIn);
  }

  protected showModelsDifs(base: tf.Model, otro: tf.Model) {
    if (!base || !otro) return;
    const rDiff = getObjDiff(base, otro, 3, ['id', 'name', 'originalName', '__proto__']); //this.deepDiffMapper.map(base, otro);
    
    console.log(rDiff);
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
  const files3: Ifl[] = files2.map((file) => ({file: (file.fileEntry as FileSystemFileEntry), label: getFileLabel(file.relativePath)}));
  return Rx.from(files3).pipe(
    mergeMap((val: Ifl) => readFileSFEAsDataURL2$(val)),
    mergeMap((val: Ifl2) => srcToImg$(val)),
    map((val: Ifl3) => {
      const prov = val.data;
      console.log('Modificando tensor');
      val.data = loadAndProcessImage(prov);
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
      const res: Ifl2 = {...fileNfo, fileReaded: fileReader.result};
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
    img.onload = function () {
      const res: Ifl3 = {...src, img, data: tf.fromPixels(img)};
      console.log('pasada imagen a tensor');
      observable.next(res);
      observable.complete();
    };
    img.onerror = function (err) {
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
 * @param img a recortar
 * @returns un tenbsor recortado
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
  // sendJS.sendMsg(message, cb);
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

/** Convierte un array de strings en un objeto (mapa) con esas labels
 * como  propiedades del objeto, inicializadas a la posición
 */
function getClasses(classes: string[]) {
  return classes.reduce((labels, label) => {
    if (labels[label] !== undefined) {
      return labels;
    }
    return {
      ...labels,
      [label]: Object.keys(labels).length,
    };
  }, {});
}

function getObjDiff(org: any, other: any, level: number, ignore: Array<string>=[]) {
  if(level<0) return null;
  function isEmpty(obj) {
    if(obj===null) return true;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) return false;
    }
    return true;
  }
  function isObject(val) {
    return (typeof val === 'object' && val !== null);
  }
  function isValue(obj: any) {
    return !isObject(obj) && !Array.isArray(obj);
  }

  function isFunction(functionToCheck) {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
  }

  function isFunction2(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  };

  function compareValues(val1, val2): string {
    if (val1 === val2) return null;
    if (typeof (val1) === 'undefined') return 'created';
    if (typeof (val2) === 'undefined') return 'modified';
    return `Values changed "${val1}" != "${val2}"`;
  }

  function compareArrays(arr1: Array<any>, arr2: Array<any>): Array<any> | string{
    const l1=arr1.length;
    const l2=arr2.length;
    let allNulls=true;
    if(l1===l2) {
      if(l1===0) return null;  // Atajo para vacios
      let f=Math.min(l1,l2,6);
      let r=[];
      for(let i=0; i<f; i++){
        let r2=getObjDiff(arr1[i], arr2[i], level-1, ignore);
        if(isEmpty(r2)) r2 = null;
        if (r2!=null) allNulls=false;
        r.push(r2);
      }
      if (!allNulls) return r;
      else return null;
    } else return `Array lenght changed: ${l1} != ${l2}`;
  }

  if (!org || !other) return null;
  const rest = {};
  for (const key in org) {
    if (org.hasOwnProperty(key)) {
      if(ignore.indexOf(key)>=0) continue;

      const val1 = org[key];
      if (isFunction(org[key])) {
        continue;
      }
      const val2 = other[key];
      if (isValue(val1)) {
        const ds = compareValues(val1, val2);
        if (ds != null) rest[key] = ds;
      } else { // Son objectos
        if (isArray(val1)) {
          let r2;
          r2=compareArrays(val1,val2);
          if(r2!=null) rest[key]=r2;
        } else  if (isObject(val1)) {
          let r2;
          if (level > 0) r2 = getObjDiff(val1, val2, level - 1, ignore);
          else r2 = null;
          if (!isEmpty(r2)) rest[key] = r2;
        }
      }
    }
  }
  return rest;
}



