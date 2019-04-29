import {Observable, of, from, Subject} from 'rxjs';
import * as tf from '@tensorflow/tfjs';
import {map} from 'rxjs/operators';
import {oneHot, Tensor, Rank, io} from '@tensorflow/tfjs';
import {TypedArray} from './types';


const PRETRAINED_MODELS_KEYS = {
  MOBILENET: 'mobilenet_v1_0.25_224',
};

const PRETRAINED_MODELS = {
  [PRETRAINED_MODELS_KEYS.MOBILENET]: {
    url: 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json',
    layer: 'conv_pw_13_relu',
  },
};

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

export interface IResPredict {
  label: string;
  prob: number;
}


export class MlImgClassifier {
  xs: tf.Tensor;
  ys: tf.Tensor;
  classes: any;
  public lastModel: tf.Sequential;

  constructor() {
    // this.init();
  }

  public pretrainedModel: tf.LayersModel;


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


  /** Se añade todos los datos que se van a usar para clasificar.
   * cada dato es un tensor correctamente dimensionado, que representa una imagen
   * @param imgs Array de imagenes con sus etiquetas a añadir
   */
  public addData(imgs: IImgLabel[]) {
    console.log('MlImgClassifier.addData()');
    if (!imgs) return;
    const labels: string[] = imgs.map((val: IImgLabel) => val.label);  // Obtenemos un array con solo los labels (hay repes)
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
  public freeData(){
    if (this.ys){
      this.ys.dispose();
      this.ys=null;
    }
    if (this.xs){
      this.xs.dispose();
      this.xs=null;
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
    // console.log(`model ${model.name}`);
    // console.log(`xs ${this.xs.shape}  `);
    // console.log(`ys ${this.ys.shape} `);
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
      const r=this.lastModel.predict(activatedImg);
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
    // console.log(clsii);
    const res: IResPredict = {
      label: clsii[0],
      prob: iMin.v
    };
    return res;
  }

  public predict2(img: tf.Tensor): IResPredict {
    if (!this.lastModel) throw new Error('No model');
    if (!(img instanceof tf.Tensor)) throw new Error('image is not tensor');
    const predictions=this.lastModel.predict(img);
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

  public init2(): Subject<void> {
    const s = new Subject<void>();
    this.loadPretrainedModel$().subscribe((md) => {
      const dims = MlImgClassifier.getInputDims(md);
      tf.tidy(() => {
        md.predict(tf.zeros([1, ...dims, 3]));
      });
      this.pretrainedModel = md;
      // console.log(this.pretrainedModel.summary());
      console.log('Cargado el modelo base');
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

  public save$(handlerOrURL: io.IOHandler | string, config?: io.SaveConfig) {
    return from(this.lastModel.save(handlerOrURL));
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
    const config = PRETRAINED_MODELS[pretrainedModel];
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

  /** Gran icognita de momento saber para que hay que hacer esto */
  protected activateImage(processedImage: Tensor): any {
    // const pred=processedImage;
    // TODO: averiguar para que sirve
    const pred = this.pretrainedModel.predict(processedImage);
    return pred;
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
