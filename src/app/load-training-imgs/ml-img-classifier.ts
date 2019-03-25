import {Observable, of, from} from 'rxjs';
import * as tf from '@tensorflow/tfjs';
import {map} from 'rxjs/operators';
import {oneHot, Tensor, Rank} from '@tensorflow/tfjs';


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
};


export class MlImgClassifier {
  xs: tf.Tensor;
  ys: tf.Tensor;
  classes: any;
  public lastModel: tf.Sequential;

  constructor() {
    this.init();
  }
  public pretrainedModel: tf.Model;
  /** Devuelve las dimensiones del modelo
   * @param md - Modelo del que obtiene las dimensiones
   */
  private static getInputDims(md: tf.Model): [number, number] {
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
      const y = MlImgClassifier.miOneHot(labelIndex, classLength);
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
   * @param imgs 
   */
  public addData(imgs: IImgLabel[]) {
    console.log('MlImgClassifier.addData()');
    if (!imgs) return;
    const labels: string[] = imgs.map((val: IImgLabel) => val.label);  // Obtenemos un array con solo los labels
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

  public train$(params: IParams = {}): Observable<tf.History> {
    if (!this.ys || !this.xs) throw new Error('incomplete training data');
    const nClasses = Object.keys(this.classes).length;
    const model = this.getModel(this.pretrainedModel, nClasses, params);
    this.lastModel = model;
    console.log(model.summary());
    const batchSize = this.getBatchSize(params.batchSize, this.xs);
    console.log(`model ${model.name}`);
    console.log(`xs ${this.xs.shape}  `);
    console.log(`ys ${this.ys.shape} `);
    return from(model.fit(this.xs, this.ys, {
      ...params,
      batchSize,
      epochs: params.epochs || 20,
    }));
  }

  public predict(img: tf.Tensor){
    if (!this.lastModel) throw new Error('No model');
    if (!(img instanceof tf.Tensor) ) throw new Error('image is not tensor');
    const activatedImg=this.activateImage(img);
    const predictions = this.lastModel.predict(activatedImg);
    console.log(predictions.toString());
    const r1=(predictions as tf.Tensor).as1D().argMax();
    console.log(r1);
    /*const classId = (r1.data())[0];
    const prediction = Object.entries(this.classes).reduce((obj, [ key, val, ]) => ({
      ...obj,
      [val]: key,
    }), {})[classId];*/

    
    
  }

  protected init() {
    this.loadPretrainedModel$().subscribe((md) => {
      const dims = MlImgClassifier.getInputDims(md);
      tf.tidy(() => {
        md.predict(tf.zeros([1, ...dims, 3]));
      });
      this.pretrainedModel = md;
      console.log(this.pretrainedModel.summary());
      console.log('Cargado el modelo base');
    },
      (err) => console.error(err));
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

  protected getModel(pretrainedModel: tf.Model, classes: number, params: IParams) {
    const dl = this.defaultLayers({classes});
    console.log('MlImgClassifier.getModel() layers:');
    console.log(dl);
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
  protected loadPretrainedModel$(pretrainedModel: string | tf.Model = PRETRAINED_MODELS_KEYS.MOBILENET): Observable<tf.Model> {
    if (pretrainedModel instanceof tf.Model) {
      return of(pretrainedModel);
    }
    const config = PRETRAINED_MODELS[pretrainedModel];
    return from(tf.loadModel(config.url)).pipe(
      map((model: tf.Model) => {
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
