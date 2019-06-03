import {Observable, of, from, Subject} from 'rxjs';
import * as tf from '@tensorflow/tfjs';
import {map} from 'rxjs/operators';
import {oneHot, Tensor, Rank, io} from '@tensorflow/tfjs';
import {TypedArray} from './types';
import {isArray, debug} from 'util';
import {DebugRendererFactory2} from '@angular/core/src/view/services';
import {assert} from '@tensorflow/tfjs-core/dist/util';


const PRETRAINED_MODELS_KEYS = {
  MOBILENET: 'mobilenet_v1_0.25_224'
};

interface CfgLayersModels{
  url: string;
  layer: string;
}

/** Modelos preentrenados estandar */
const StdPretrainedModels: Map<string, CfgLayersModels> = new Map(
  [[PRETRAINED_MODELS_KEYS.MOBILENET, {
    url: 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json',
    layer: 'conv_pw_13_relu',
  }]]
);




/** Tipo de dato que se usa realmente para el entrenamiento. El data es el tensor en el tamaño adecuado
 * a la red.
 */
export interface IImgLabel {
  img: tf.Tensor;
  label: string;
}

export interface IParams {
  [index: string]: any;
  batchSize?: number;
  epochs?: number;
}

/** El resultado de una predicción. La etiqueta y el % de fiabilidad
 */
export interface IResPredict {
  label: string;
  prob: number;
}


/** Clase que encapsula unas cuantas funcionalidades para facilitar el uso de redes para clasificar imagenes */
export class MlImgClassifier {

  xs: tf.Tensor;
  ys: tf.Tensor;
  /** clase que encapsula las etiquetas */
  classes: any;
  labelMap: Array<string> = [];

  public lastModel: tf.Sequential;

  /** Red preentrenada generica que sirve para clasificar imagenes */
  public pretrainedModel: tf.LayersModel;

  constructor() {
    // this.init();
  }

  /** Devuelve las dimensiones del modelo
   * @param md - Modelo del que obtiene las dimensiones
   */
  private static getInputDims(md: tf.LayersModel): [number, number] {
    const {
      inputLayers,
    } = md;
    const {
      batchInputShape,
    } = inputLayers[0];
    return [
      batchInputShape[1],
      batchInputShape[2],
    ];

  }



  /** Crea el conjunto de valores validos Y (destinos) a partir de las labels.
   * Devuelve un array de posibles respuestas para todas las imagenes segun la etiqueta. Estos valores
   * son los que deseamos que la red aprenda. Cada vector del array es en orden la respuesta adecuada a la imagen que
   * tiene la misma posicion
   */
  private static getYvaluesFromLabels(labels: string[]): tf.Tensor2D {
    const classes = getClasses(labels);  // Mapa
    const classLength = Object.keys(classes).length;
    return labels.reduce((data: tf.Tensor2D | undefined, label: string) => {
      const labelIndex = classes[label];
      const y = MlImgClassifier.miOneHot(labelIndex, classLength) as tf.Tensor2D;
      return tf.tidy(() => {
        if (data === undefined) {
          return tf.keep(y);
        }
        const old = data;
        const ys = tf.keep(old.concat(y, 0));
        old.dispose();
        y.dispose();
        return ys;
      });
    }, undefined);
  }



  /**
   * OneHot encoding: https://hackernoon.com/what-is-one-hot-encoding-why-and-when-do-you-have-to-use-it-e3c6186d008f
   *
   */
  static miOneHot = (labelIndex: number, classLength: number) => tf.tidy(() => tf.oneHot(tf.tensor1d([labelIndex]).toInt(), classLength));

  protected static addImgData(tensors: Tensor[]): Tensor {
    console.log(`addImgData: ${tensors.length} tensores. El [0]: ${tensors[0].shape}`);
    const data = tf.keep(tensors[0]);
    return tensors.slice(1).reduce((value: tf.Tensor, tensor: tf.Tensor) => tf.tidy(() => {
      const newData = tf.keep(value.concat(tensor, 0));
      value.dispose();
      return newData;
    }), data);
  }

  /** Deja la imagen (tensor) con el formato adecuado para su procesamiento
   * @param image - tensor formado a partir de una imagen
   */
  public static loadAndProcessImage(image: tf.Tensor): tf.Tensor {
    console.log(`loadAndProcessImage init: ${tf.memory().numTensors} tensors. Creamos uno nuevo modificado`);
    const res = tf.tidy(() => {
      try {
        const croppedImage: tf.Tensor3D = MlImgClassifier.cropImage(image) as tf.Tensor3D;
        const resizedImage = tf.image.resizeBilinear(croppedImage, [224, 224]); // resizeImage(croppedImage);
        const batchedImage = MlImgClassifier.batchImage(resizedImage);
        return batchedImage;
      } catch (e) {
        console.error(e);
      }
      return null;
    });
    console.log(`loadAndProcessImage end: ${tf.memory().numTensors} tensors`);
    return res;
  }

  /** Recorta el tamaño mas largo para convertir la imagen en cuadrada
   * @param img a recortar
   * @returns un tenbsor recortado
   */
  protected static cropImage(img: tf.Tensor): tf.Tensor {
    let width = img.shape[0];
    let height = img.shape[1];
    const isEvent = (n: number) => n % 2 === 0;
    function isEven(n) {
      return n % 2 === 0;
    }
    if (!isEven(width)) width--;
    if (!isEven(height)) height--;

    // use the shorter side as the size to which we will crop
    const shorterSide = Math.min(width, height);

    // calculate beginning and ending crop points
    const startingHeight = (height - shorterSide) / 2;
    const startingWidth = (width - shorterSide) / 2;  // const startingWidth = Math.floor((width - shorterSide) / 2);
    const endingHeight = startingHeight + shorterSide;
    const endingWidth = startingWidth + shorterSide;

    //  console.log(`(${startingWidth}, ${startingHeight}) -> (${endingWidth}, ${endingHeight})`);
    // return image data cropped to those points
    return img.slice([startingWidth, startingHeight, 0], [endingWidth, endingHeight, 3]);
  }

  /** Expands our Tensor and translates the integers into floats with
   *
   * @param image Image in format tensor (3 matrix)
   */
  protected static batchImage(image: tf.Tensor): tf.Tensor {
    // Expand our tensor to have an additional dimension, whose size is 1
    const batchedImage = image.expandDims(0);
    // Turn pixel data into a float between -1 and 1.
    return batchedImage.toFloat().div(tf.scalar(127)).sub(tf.scalar(1));
  }

  public init2(preModel=null): Subject<void> {
    console.log(`init2(${preModel})`);
    const s = new Subject<void>();
    this.loadPretrainedModel$(preModel).subscribe((md) => {
      const dims = MlImgClassifier.getInputDims(md);
      tf.tidy(() => {
        md.predict(tf.zeros([1, ...dims, 3]));
      });
      this.pretrainedModel = md;
      // console.log(this.pretrainedModel.summary());
      console.log('init2() Cargado el modelo base');
      // s.next();
    },
      (err) => {
        console.error(err);
        s.error(err);
      },
      () => {
        console.log('ilImgClass inited');
        s.next();
      }
    );
    return s;
  }

  /** Se añade todos los datos que se van a usar para clasificar.
   * cada dato es un tensor correctamente dimensionado, que representa una imagen
   * @param imgs Array de imagenes con sus etiquetas a añadir
   */
  public addData(imgs: IImgLabel[]) {
    console.log('MlImgClassifier.addData()');
    if (!imgs) return;
    const labels: string[] = imgs.map((val: IImgLabel) => val.label);  // Obtenemos un array con solo los labels (hay repes)
    this.getIndexLabel(labels);
    const y = MlImgClassifier.getYvaluesFromLabels(labels);

    console.log(y.toString());
    console.log(`Tenemos YS tensor de dimensiones: ${y.shape}`);
    const arrImgs: Tensor[] = imgs.map((val: IImgLabel) => this.activateImage(val.img));  // Obtenemos un array con solo las imgsns
    const x = MlImgClassifier.addImgData(arrImgs);
    console.log(`Tenemos XS tensor de dimensiones: ${x.shape}`);
    this.classes = getClasses(labels);
    this.ys = y;
    this.xs = x;
  }

  /** Libera la memoria ocupada por los datos de entrada */
  public freeData() {
    if (this.ys) {
      this.ys.dispose();
      this.ys = null;
    }
    if (this.xs) {
      this.xs.dispose();
      this.xs = null;
    }
  }

  /**
   * @param params Opciones
   */
  public train$(params: IParams = {}): Observable<tf.History> {
    if (!this.ys || !this.xs) throw new Error('incomplete training data');
    const nClasses = Object.keys(this.classes).length;
    const model = this.getModel(this.pretrainedModel, nClasses, params);
    this.lastModel = model;
    // console.log(model.summary());
    const batchSize = this.getBatchSize(params.batchSize, this.xs);
    return from(model.fit(this.xs, this.ys, {
      ...params,
      batchSize,
      epochs: params.epochs || 20,
    }));
  }


  /**
   * Devuelve una predicción sobre el tipo de imagen que es.
   * @param img Imagen a analizar
   */
  public predict(img: tf.Tensor): IResPredict {
    if (!this.lastModel) throw new Error('No model');
    if (!(img instanceof tf.Tensor)) throw new Error('image is not tensor');
    const predictions = tf.tidy(() => {
      const activatedImg = this.activateImage(img);
      const r = this.lastModel.predict(activatedImg);
      activatedImg.dispose();
      return r;
    });
    // console.log(predictions.toString());
    console.log(`predict().1: ${tf.memory().numTensors}`);
    const dsPred: TypedArray = (predictions as Tensor).dataSync();
    // const r1 = (predictions as tf.Tensor).as1D().argMax();  // Devuelve el indice del mayor
    let iMin = {v: 0, i: 0};

    for (let i = 0; i < dsPred.length; i++) {
      if (dsPred[i] > iMin.v) iMin = {v: dsPred[i], i};
    }
    (predictions as tf.Tensor).dispose(); // el resultado es un tensor
    console.log(`predict().2: ${tf.memory().numTensors}`);
    // console.log(r1);
    // console.log(iMin);
    /*const classId = (r1.data())[0];*/
    const clsi = Object.entries(this.classes);
    const clsii = clsi.find(
      (a) =>
        a[1] === iMin.i
    );
    const label2=this.labelMap[iMin.i];
    tf.util.assert(clsii[0]===label2, () => 'no esta bien el label map');
    // console.log(clsii);
    const res: IResPredict = {
      label: clsii[0],
      prob: iMin.v
    };
    return res;
  }

  /** TEST
   * 
   * @param img 
   */
  public predict2(img: tf.Tensor): IResPredict {
    if (!this.lastModel) throw new Error('No model');
    if (!(img instanceof tf.Tensor)) throw new Error('image is not tensor');
    const predictions = this.lastModel.predict(img);
    // console.log(predictions.toString());
    const dsPred: TypedArray = (predictions as Tensor).dataSync();
    const r1 = (predictions as tf.Tensor).as1D().argMax();  // Devuelve el indice del mayor
    let iMin = {v: 0, i: 0};

    for (let i = 0; i < dsPred.length; i++) {
      if (dsPred[i] > iMin.v) iMin = {v: dsPred[i], i};
    }
    // console.log(r1);
    // console.log(iMin);
    /*const classId = (r1.data())[0];*/
    const clsi = Object.entries(this.classes);
    const clsii = clsi.find(
      (a) =>
        a[1] === iMin.i
    );
    // console.log(clsii);
    const res: IResPredict = {
      label: clsii[0],
      prob: iMin.v
    };
    return res;
  }

  protected init() {
    this.loadPretrainedModel$().subscribe((md) => {
      const dims = MlImgClassifier.getInputDims(md);
      console.log(`init() dims:${dims}`);
      tf.tidy(() => {
        md.predict(tf.zeros([1, ...dims, 3]));
      });
      this.pretrainedModel = md;
      // console.log(this.pretrainedModel.summary());
      console.log('Cargado el modelo base');
    },
      (err) => console.error(err),
      () => console.log('ilImgClass inited')
    );
  }



  public save$(handlerOrURL: io.IOHandler | string, config?: io.SaveConfig) {
    return from(this.lastModel.save(handlerOrURL));
  }

  public load$(handlerOrURL: io.IOHandler | string, config?: io.SaveConfig) {
    const thats = this;
    console.log(`MlImgClassifier.load$(${handlerOrURL})`);
    return from(tf.loadLayersModel(handlerOrURL)).pipe(
      map((mod) => {
        console.log('cargado modelo');
        if (thats.lastModel) {
          thats.lastModel.dispose();
        }
        thats.lastModel = mod as tf.Sequential;
        return thats;
      })
    );
  }

  public load() {
    //this.lastModel.loadWeights()
  }

  defaultLayers = ({classes}: {classes: number}) => {
    return [
      tf.layers.flatten({inputShape: [7, 7, 256]}),
      tf.layers.dense({
        units: 100,
        activation: 'relu',
        kernelInitializer: 'varianceScaling',
        useBias: true
      }),
      tf.layers.dense({
        units: classes,
        kernelInitializer: 'varianceScaling',
        useBias: false,
        activation: 'softmax'
      })
    ];
  }

  getBatchSize = (batchSize?: number, xs?: tf.Tensor) => {
    if (batchSize) {
      return batchSize;
    }
    if (xs !== undefined) {
      return Math.floor(xs.shape[0] * 0.4) || 1;
    }
    return undefined;
  }

  protected getModel(pretrainedModel: tf.LayersModel, classes: number, params: IParams) {
    const dl = this.defaultLayers({classes});
    // console.log('MlImgClassifier.getModel() layers:');
    // console.log(dl);
    const model = tf.sequential({
      layers: dl,
    });
    const optimizer = tf.train.adam(0.0001);
    model.compile({
      optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });
    return model;
  }

  /** Devuelve un modelo preconfigurado para la labor de clasificar imagenes
   *
   * @param [pretrainedModel=PRETRAINED_MODELS_KEYS.MOBILENET] - nombre del modelo
   * @returns  - El nombre del modelo
   */
  protected loadPretrainedModel$(pretrainedModel: string | tf.LayersModel = PRETRAINED_MODELS_KEYS.MOBILENET): Observable<tf.LayersModel> {
    if (pretrainedModel instanceof tf.LayersModel) {
      return of(pretrainedModel);
    }
    let config=null;
    if (pretrainedModel==null){
       config = StdPretrainedModels.get(PRETRAINED_MODELS_KEYS.MOBILENET);
    }else{
      if (typeof(pretrainedModel)==='string'){
         config=StdPretrainedModels[pretrainedModel];
      } else {
        config = pretrainedModel;
      }
    }
    console.log(`loadPretrainedModel$() url:'${config.url}'`);
    return from(tf.loadLayersModel(config.url)).pipe(
      map((model: tf.LayersModel) => {
        const layer = model.getLayer(config.layer);
        return tf.model({
          inputs: [model.inputs[0]],
          outputs: layer.output,
        });
      })
    );
  }

  /** La red preentrenada realiza un primer procesado de la imagen */
  protected activateImage(processedImage: Tensor): any {
    const pred = this.pretrainedModel.predict(processedImage);
    return pred;
  }

  /** 
   * @param s texto o array de textos para obtener los indices
   */
  protected getIndexLabel(s: string | Array<string>): number | Array<number> {
    if (Array.isArray(s)) {
      const res=[];
      (s as Array<string>).forEach(label => {
        res.push(this.getIndexLabel(label));
      });
      return res;
    } else {
      let res = this.labelMap.indexOf(s);
      if (res < 0) res = this.labelMap.push(s) - 1;
      return res;
    }
  }
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
