import { Component, OnInit } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
// import {  Tensor } from '@tensorflow/tfjs';
import * as p5 from 'p5';
// import 'p5/lib/addons/p5.sound';
// import 'p5/lib/addons/p5.dom';
import * as Rx from 'rxjs';
// import { timingSafeEqual } from 'crypto';
import * as netUtils from '../../utils/neutils';

@Component({
  selector: 'app-xor-tf',
  templateUrl: './xor-tf.component.html',
  styleUrls: ['./xor-tf.component.less']
})
export class XorTfComponent implements OnInit {
  private model: tf.Sequential;
  private cols: number;
  private rows: number;
  /** Tensor 2d de matriz de entrada con los valores entre [0,1] */
  private xs: tf.Tensor2D;
  private resolution = 20;
  private canvasP5: p5;
  /** Variables de entrada de valores conocidos. 2 Variables. Solo los extremos */
  private trainXs = tf.tensor2d([
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1]
  ]);
  /** Valores de laas variables de entrada  */
  private trainYs = tf.tensor2d([
    [0],
    [1],
    [1],
    [0]
  ]);

  public currentError = 0.0;

  constructor() { }

  ngOnInit() {
  }

  setup() {
    const thats = this;
    const sketch = (s) => {
      s.preload = () => {
        // preload code
      };
      s.setup = () => {
        const cc = s.createCanvas(400, 400);
        // ccc.parent('myContainer');
      };
    };

    this.canvasP5 = new p5(sketch);  // createCanvas(400, 400);
    this.canvasP5.noLoop();  // Se desactiva el bucle sobre la funcion draw
    this.cols = this.canvasP5.width / this.resolution;
    this.rows = this.canvasP5.height / this.resolution;

    this.canvasP5.draw = () => {
      this.draw();
    };


    // Create the input data
    const inputs = [];
    // Una matriz con las filas y columnas, con los valores entre [0,1]
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const x1 = i / this.cols;
        const x2 = j / this.rows;
        inputs.push([x1, x2]);
      }
    }
    // Creamos el tensor 2d a partir de las entradas
    this.xs = tf.tensor2d(inputs);
    this.model = tf.sequential();
    /** La capa oculta intermedia, con 16 unidades, y conectada a 2 entradas . Dense es todos con todos entre capas*/
    const hidden = tf.layers.dense({
      inputShape: [2],
      units: 16,
      activation: 'sigmoid'
    });
    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    });
    this.model.add(hidden);
    this.model.add(output);

    const optimizer = tf.train.adam(0.2);
    this.model.compile({
      optimizer,
      loss: 'meanSquaredError'
    });

    setTimeout(thats.train.call(thats), 10);

  }

  train() {
    const thats = this;
    this.trainModel().then(result => {
      //console.log(result.history.loss[0]);
      this.currentError=result.history.loss[0] as number;
      setTimeout(this.train.call(thats), 10);
    });
  }

  trainModel() {
    return this.model.fit(this.trainXs, this.trainYs, {
      shuffle: true,
      epochs: 1
    });
  }

  trainModel$(): Rx.Observable<tf.History>{
    return Rx.from(
      this.model.fit(this.trainXs, this.trainYs, {
        shuffle: true,
        epochs: 1
    }));
  }


  draw() {
    this.canvasP5.background(0);
    tf.tidy(() => {
      // Get the predictions
      const ys: tf.Tensor = this.model.predict(this.xs) as tf.Tensor;
      const yValues = ys.dataSync();

      // Draw the results
      let index = 0;
      for (let i = 0; i < this.cols; i++) {
        for (let j = 0; j < this.rows; j++) {
          const br = yValues[index] * 255;
          this.canvasP5.fill(br);
          this.canvasP5.rect(i * this.resolution, j * this.resolution, this.resolution, this.resolution);
          this.canvasP5.fill(255 - br);
          this.canvasP5.textSize(8);
          this.canvasP5.textAlign(this.canvasP5.CENTER, this.canvasP5.CENTER);
          this.canvasP5.text(this.canvasP5.nf(yValues[index], 1, 2),
            i * this.resolution + this.resolution / 2, j * this.resolution + this.resolution / 2);
          index++;
        }
      }
    });
  }

}
