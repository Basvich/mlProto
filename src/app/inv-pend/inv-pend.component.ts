import {Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import * as p5 from 'p5';
import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';
import {Bola, Carro} from './gobjects';
import {Sequential, Tensor3D} from '@tensorflow/tfjs';
import {map} from 'rxjs/operators';



interface IDataIn {
  pos: number;
  vel: number;
  acc: number;
}

interface IRange {
  min: Array<number>;
  max: Array<number>;
  dif?: Array<number>;
}

@Component({
  selector: 'app-inv-pend',
  templateUrl: './inv-pend.component.html',
  styleUrls: ['./inv-pend.component.less']
})
export class InvPendComponent implements OnInit {
  private canvasP5: p5;
  private timer;
  bola: Bola;
  carro: Carro;
  gravity: p5.Vector;
  horForz: p5.Vector;
  fricForz: p5.Vector;
  carroX = 0;
  carroVX = 0;
  centerPos = 300;
  enableRecord = false;
  recordedDin: Array<IDataIn> = [];
  recordedDout: Array<number> = [];
  recordedCount = 0;
  cycleCount = 0;
  iaOn = false;
  rangeIn: IRange = null;
  rangeOut: IRange = null;

  model: Sequential;

  @ViewChild('refForce', {static: false}) rangeForce: ElementRef;

  constructor() {}

  ngOnInit() {
  }

  setup() {
    this.setupP5();
    this.setupGObjects();
    this.initializeTF();
  }

  /** Accion que se ejecuta en cada ciclo */
  cycle() {
    if (this.iaOn) this.makePrediction();
    let mx = this.canvasP5.mouseX;
    const my = this.canvasP5.mouseY;
    if (!this.iaOn) {
      if (mx > 0 && mx < 600 && my < 400) {
        mx -= this.centerPos;
        this.horForz.x = mx * 0.002;
      } else {
        this.horForz.x = 0;
      }
    }
    this.fricForz.x = -this.carro.velocity.x * 0.05;
    this.bola.applyForce(this.gravity);
    this.carro.applyForce(p5.Vector.add(this.fricForz, this.horForz));
    this.bola.update();
    this.carro.update();
    this.checkLimits();
    this.canvasP5.redraw();
    this.bola.checkEdges();
    if (this.enableRecord) {
      if (this.cycleCount % 4 === 0) this.recordSample();
    }
    this.cycleCount++;
  }

  /** Comprueba si el carro se sale de los limites, en cuyo caso lo rebota */
  checkLimits() {
    if (this.carro.position.x <= 20) {
      this.carro.applyForce(this.canvasP5.createVector((20 - this.carro.position.x) * 0.2));
    } else if (this.carro.position.x > 580) {
      this.carro.applyForce(this.canvasP5.createVector((580 - this.carro.position.x) * 0.2));
    }
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.cycle(), 100);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;

  }

  startRecord() {
    this.enableRecord = true;
  }

  stopRecord() {
    this.enableRecord = false;
    localStorage.setItem('dataIn', JSON.stringify(this.recordedDin));
    localStorage.setItem('dataOut', JSON.stringify(this.recordedDout));
  }

  loadRecord() {
    const sdin = localStorage.getItem('dataIn');
    if (!sdin) return;
    const sdout = localStorage.getItem('dataOut');
    this.recordedDin = JSON.parse(sdin);
    this.recordedDout = JSON.parse(sdout);
  }

  train() {
    this.stopRecord();
    const tdata = this.createTensorsFrom(this.recordedDin, this.recordedDout);
    this.rangeIn = tdata.din.range;
    this.rangeOut = tdata.dout.range;
    this.rangeIn.dif = this.rangeIn.max.map((num, idx) => num - this.rangeIn.min[idx]);
    this.rangeOut.dif = this.rangeOut.max.map((num, idx) => num - this.rangeOut.min[idx]);
    this.rangeOut = tdata.dout.range;
    this.trainModel(this.model, tdata.din.data, tdata.dout.data).then(
      (value: any) => {
        console.log(value);
        tdata.din.data.dispose();
        tdata.din.data = null;
        tdata.dout.data.dispose();
        tdata.dout.data = null;
      }
    );
  }

  makePrediction() {
    this.carroX = this.carro.position.x - 300;
    this.carroVX = this.carro.velocity.x;
    tf.tidy(() => {
      const dIn = [this.carroX, this.carroVX = this.carro.velocity.x, this.carro.acceleration.x];
      const tIn = tf.tensor(dIn, [1, 3]); // tf.tensor3d(dIn);
      // tIn.print();
      const tIn2 = tIn.sub(this.rangeIn.min).div(this.rangeIn.dif);
      // tIn2.print();
      const preds = this.model.predict(tIn2) as tf.Tensor;
      if (preds) {
        // (preds as tf.Tensor).print();
        const unNormPreds = preds.mul(this.rangeOut.dif).add(this.rangeOut.min);
        const d = unNormPreds.dataSync()[0];
        this.horForz.x = d;
      }
    });
  }

  showVisor() {
    const visorInstance = tfvis.visor();
    if (!visorInstance.isOpen()) {
      visorInstance.toggle();
    }
  }

  showModel() {
    const surface = {
      name: 'Model Summary',
      tab: 'Model'
    };
    tfvis.show.modelSummary(surface, this.model);
  }

  showDataIn(velFilter: number) {
    // Load and plot the original input data that we are going to train on.
    const d1 = this.recordedDin.map((d, i) => ({
      pos: d.pos,
      vel: d.vel,
      f: this.recordedDout[i]
    }));
    const d2 = d1.filter((d) => Math.abs(d.vel - velFilter) < 0.2);
    const values = d2.map((d, i: number) => ({
      x: d.pos,
      y: d.f
    }));



    tfvis.render.scatterplot(
      {name: 'Posicion v Acc'},
      {values},
      {
        xLabel: 'Pos',
        yLabel: 'Acc',
        height: 300
      }
    );
  }

  startStopIA() {
    this.iaOn = !this.iaOn;
  }

  async trainModel(model, inputs, labels) {
    // Prepare the model for training.
    model.compile({
      optimizer: tf.train.adam(),
      loss: tf.losses.meanSquaredError,
      metrics: ['mse'],
    });
    const batchSize = 28;
    const epochs = 50;

    return await model.fit(inputs, labels, {
      batchSize,
      epochs,
      shuffle: true,
      callbacks: tfvis.show.fitCallbacks(
        {name: 'Training Performance'},
        ['loss', 'mse'],
        {height: 200, callbacks: ['onEpochEnd']}
      )
    });
  }


  test() {
    const d = [[1, 2, 3], [2, 3, 1], [4, 1, 0], [0, 2, 1]]; // [1,2,3,4]; // 
    const dt = tf.tensor(d);
    dt.print();
    const tdt = dt.transpose();
    tdt.print();
    const axis = dt.rank - 1;
    const min = tdt.min(axis, true);
    const max = tdt.max(axis, true);
    const amin = min.dataSync();
    const arrmin = Array.from(amin);
    min.print();
    max.print();
    const rang = max.sub(min);
    const tdt2 = tdt.sub(min).div(rang);
    tdt2.print();
    const tdt3 = tdt2.transpose();
    tdt3.print();
    // const mm=this.minMax(dt);
  }
  /** Pone el carro en posicion y velocidad aleatoria */
  offsetize() {
    this.carro.velocity.x = Math.random() * 10 - 5;
    this.carro.position.x = this.rndNext(50, 550);
    this.rangeForce.nativeElement.focus();
  }

  /**
   * Guarda un registro del estado actual
   */
  recordSample() {
    if (this.recordedCount > 1000) {
      this.enableRecord = false;
    }
    this.carroX = this.carro.position.x - this.centerPos;
    this.carroVX = this.carro.velocity.x;
    const din = {pos: this.carroX, vel: this.carroVX, acc: this.carro.acceleration.x};
    const dout = this.horForz.x;
    this.recordedDin.push(din);
    this.recordedDout.push(dout);
    this.recordedCount++;

  }

  changeForce(f: number) {
    console.log('changeForce:' + f);
  }

  /** Respuesta al  evento de cambio del slider */
  changeForce2(f: string) {
    return;
    console.log('changeForce2:' + f);
    this.horForz.x = Number.parseFloat(f);
  }

  /** Configuracion del p5 */
  protected setupP5() {
    const sketch = (s) => {
      s.preload = () => {
        // preload code
      };
      s.setup = () => {
        const cc = s.createCanvas(600, 400);
        cc.parent('myContainer');
      };
    };
    this.canvasP5 = new p5(sketch);
    this.canvasP5.noLoop();  // Se desactiva el bucle sobre la funcion draw
    this.canvasP5.draw = () => {
      this.draw();
    };
  }

  /** Inicialización de los objectos gráficos */
  protected setupGObjects() {
    this.bola = new Bola(this.canvasP5, 50, 100);
    this.carro = new Carro(this.canvasP5, this.centerPos, 350);
    this.gravity = this.canvasP5.createVector(0, 0.1 * 8);
    this.horForz = this.canvasP5.createVector(0, 0);
    this.fricForz = this.canvasP5.createVector(0, 0);
  }

  /** Pintado que se ejecuta cuando se hace el redraw() */
  protected draw() {
    this.canvasP5.background(127);
    this.canvasP5.stroke(153);
    this.canvasP5.line(this.centerPos, 0, this.centerPos, 400);
    this.canvasP5.line(0, 350, 600, 350);
    this.bola.display();
    this.carro.display();
  }

  /** Desordena las muestras */
  protected suffleSamples() {
    const f = this.recordedCount / 2;
    for (let i = 0; i < f; i++) {
      const i1 = this.rndNext(this.recordedCount - 1);
      const i2 = this.rndNext(this.recordedCount - 1);
      const t1 = this.recordedDin[i1];
      this.recordedDin[i1] = this.recordedDin[i2];
      this.recordedDin[i2] = t1;
      const t2 = this.recordedDout[i1];
      this.recordedDout[i1] = this.recordedDout[i2];
      this.recordedDout[i2] = t2;
    }
  }

  rndNext(max: number, min?: number): number {
    if (!min) min = 0;
    const r = Math.trunc(Math.random() * (max - min)) + min;
    return r;
  }

  protected initializeTF() {
    this.model = this.createModel();
  }

  /** Crea el modelo de redNeuronal para este ejemplo */
  protected createModel(): Sequential {
    // Create a sequential model
    const model = tf.sequential();
    // Add a single hidden layer. La capa oculta ya incluye las entradas
    // 3 entradas, 16 neuronas
    model.add(tf.layers.dense({
      inputShape: [3], units: 16
    }));
    // Add an output layer
    model.add(tf.layers.dense({
      units: 1
    }));
    return model;
  }

  /**
   * Crea los tensores necesarios para el entrenamiento a partir de los samples
   * @param dIn Datos de entrada
   * @param dOut Datos de salida (labels)
   */
  protected createTensorsFrom(dIn: Array<IDataIn>, dOut: Array<number>) {
    const res = tf.tidy(() => {
      // Los datos ya vienen mezclados, no hace falta usar el suffle
      // Conversion a tensor
      const inputs = dIn.map(d => [d.pos, d.vel, d.acc]);
      const inputTensor = tf.tensor(inputs, [inputs.length, 3]);
      const labelTensor = tf.tensor2d(dOut, [dOut.length, 1]);
      // Normalización de todos los datos al rango 0-1
      const din = this.normalize(inputTensor);
      const dout = this.normalize(labelTensor);
      return {din, dout};
    });
    return res;
  }

  /** Normaliza un tensor, devolviendo tambien los valores max min actuales 
   * @param d Tensor de entrada
   */
  protected normalize(d: tf.Tensor) {
    const r = tf.tidy(() => {
      const td = d.transpose(); // Para normalizar las columnas
      const axis = td.rank - 1; // Se generaliza el concepto de max min
      const min = td.min(axis, true);
      const max = td.max(axis, true);
      const range = max.sub(min);
      const td2 = td.sub(min).div(range);
      const res = td2.transpose();  // Volvemos al orden inicial
      const amin = Array.from(min.dataSync());
      const amax = Array.from(max.dataSync());
      return {
        data: res,
        range: {min: amin, max: amax}
      };
    });
    return r;
  }

}
