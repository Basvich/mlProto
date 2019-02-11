import { Component, OnInit } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import {  Tensor } from '@tensorflow/tfjs';
import * as p5 from 'p5';

@Component({
  selector: 'app-xor-tf',
  templateUrl: './xor-tf.component.html',
  styleUrls: ['./xor-tf.component.less']
})
export class XorTfComponent implements OnInit {
  model: tf.Sequential;
  cols: number;
  rows: number;
  xs: tf.Tensor2D;
  resolution = 20;
  private canvasP5: p5;
  trainXs = tf.tensor2d([
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1]
  ]);
  trainYs = tf.tensor2d([
    [0],
    [1],
    [1],
    [0]
  ]);

  constructor() { }

  ngOnInit() {
  }

  setup() {

    const sketch = (s) => {
      s.preload = () => {
        // preload code
      };
      s.setup = () => {
        const cc = s.createCanvas(400, 400);
        // cc.parent('myContainer');
      };
      // s.draw = () => {
        // s.background(255);
        // s.rect(100, 100, 100, 100);
      // };
    };

    this.canvasP5 = new p5(sketch);  // createCanvas(400, 400);

    this.cols = this.canvasP5.width / this.resolution;
    this.rows = this.canvasP5.height / this.resolution;

    // Create the input data
    const inputs = [];
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const x1 = i / this.cols;
        const x2 = j / this.rows;
        inputs.push([x1, x2]);
      }
    }
    this.xs = tf.tensor2d(inputs);


    this.model = tf.sequential();
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

    setTimeout(this.train, 10);

  }

  train() {
    this.trainModel().then(result => {
      /// console.log(result.history.loss[0]);
      setTimeout(this. train, 10);
    });
  }

  trainModel() {
    return this.model.fit(this.trainXs, this.trainYs, {
      shuffle: true,
      epochs: 1
    });
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
