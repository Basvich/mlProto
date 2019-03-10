import { Observable, of, from } from 'rxjs';
import * as tf from '@tensorflow/tfjs';
import { map } from 'rxjs/operators';
import { oneHot } from '@tensorflow/tfjs';


const PRETRAINED_MODELS_KEYS = {
  MOBILENET: 'mobilenet_v1_0.25_224',
};

const PRETRAINED_MODELS = {
  [PRETRAINED_MODELS_KEYS.MOBILENET]: {
    url: 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json',
    layer: 'conv_pw_13_relu',
  },
};

export interface IImgLabel{
  img: tf.Tensor;
  label: string;
}


export class MlImgClassifier{

  constructor(){
    this.init();
  }
  private pretrainedModel: tf.Model;
  /** Devuelve las dimensiones del modelo
   * @param md - Modelo del que obtiene las dimensiones
   */
  private static getInputDims(md: tf.Model): [number,number]{
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

  /** Crea el conjunto de valores validos Y (destinos) a partir de las labels */
  private static getYvaluesFromLabels(labels: string[]): tf.Tensor2D{
    const classes=getClasses(labels);  // Mapa
    const classLength = Object.keys(classes).length;
    return labels.reduce((data: tf.Tensor2D | undefined, label: string) => {
      const labelIndex = classes[label];
      const y = oneHot(labelIndex, classLength);
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


  public addData(imgs: IImgLabel[]){
    if (!imgs) return;
    const labels: string[] = imgs.map((val: IImgLabel)=>val.label);
    const y= MlImgClassifier.getYvaluesFromLabels(labels);

  }

  protected init(){
    this.loadPretrainedModel$().subscribe( (md) => {
      const dims = MlImgClassifier.getInputDims(md);
      tf.tidy(() => {
        md.predict(tf.zeros([1, ...dims, 3]));
      });
      this.pretrainedModel=md;
      console.log('Cargado el modelo base');
    },
    (err)=> console.error(err));

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
      map((model: tf.Model)=> {
        const layer= model.getLayer(config.layer);
        return tf.model({
          inputs: [model.inputs[0]],
          outputs: layer.output,
        });
      })
    );
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
