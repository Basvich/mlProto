import {Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import * as p5 from 'p5';
import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';
import {Bola, Carro} from './gobjects';
import {Sequential} from '@tensorflow/tfjs';



interface IDataIn {
  pos: number;
  vel: number;
  acc: number;
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
  enableRecord = false;
  recordedDin: Array<IDataIn> = [];
  recordedDout: Array<number> = [];
  recordedCount = 0;
  cycleCount = 0;

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
    this.fricForz.x=-this.carro.velocity.x*0.05;
    this.bola.applyForce(this.gravity);    
    this.carro.applyForce(p5.Vector.add(this.fricForz, this.horForz));
    this.bola.update();
    this.carro.update();
    this.checkLimits();
    this.canvasP5.redraw();
    this.bola.checkEdges();
    if (this.enableRecord) {
      if (this.cycleCount % 10 === 0) this.recordSample();
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
  }

  train(){
    this.stopRecord();
    const tdata=this.createTensorsFrom(this.recordedDin, this.recordedDout);
    this.trainModel(this.model, tdata.din.data, tdata.dout.data).then(
      (value: any) => { 
        console.log(value);
      }
    );
  }

  showVisor(){
    const visorInstance = tfvis.visor();
    if (!visorInstance.isOpen()) {
      visorInstance.toggle();
    }
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
      shuffle: true
    });
  }


  test(){
    const d=[[1,2,3],[2,3,1],[4,1,0],[0,2,1]]; // [1,2,3,4]; // 
    const dt=tf.tensor(d);
    dt.print();
    const tdt=dt.transpose();
    tdt.print();
    const axis=dt.rank-1;
    const min=tdt.min(axis, true);
    const max=tdt.max(axis, true);
    const amin=min.dataSync();
    const arrmin=Array.from(amin);
    min.print();
    max.print();
    const rang=max.sub(min);
    const tdt2=tdt.sub(min).div(rang);
    tdt2.print();
    const tdt3=tdt2.transpose();
    tdt3.print();
    //const mm=this.minMax(dt);
    
  }
  /** Pone el carro en posicion y velocidad aleatoria */
  offsetize() {
    this.carro.velocity.x = Math.random() * 5 - 2.5;
    this.carro.position.x = this.rndNext(100, 550);
    this.rangeForce.nativeElement.focus();
  }

  /**
   * Guarda un registro del estado actual
   */
  recordSample() {
    if (this.recordedCount > 1000) {
      this.enableRecord = false;
    }
    const din = {pos: this.carro.position.x - 300, vel: this.carro.velocity.x, acc: this.carro.acceleration.x};
    const dout = this.horForz.x;
    this.recordedDin.push(din);
    this.recordedDout.push(dout);
    this.recordedCount++;

  }

  changeForce(f: number) {
    console.log(f);
  }

  /** Respuesta al  evento de cambio del slider */
  changeForce2(f: number) {
    console.log('->' + f);
    this.horForz.x = f / 10;
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
    this.carro = new Carro(this.canvasP5, 300, 350);
    this.gravity = this.canvasP5.createVector(0, 0.1 * 8);
    this.horForz = this.canvasP5.createVector(0, 0);
    this.fricForz=this.canvasP5.createVector(0,0);
  }

  /** Pintado que se ejecuta cuando se hace el redraw() */
  protected draw() {
    this.canvasP5.background(127);
    this.canvasP5.stroke(153);
    this.canvasP5.line(300, 0, 300, 400);
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
      const inputTensor = tf.tensor2d(inputs);
      const labelTensor = tf.tensor2d(dOut, [dOut.length, 1]);
      // Normalización de todos los datos al rango 0-1
      const din=this.normalize(inputTensor);
      const dout=this.normalize(labelTensor);
      return {din, dout};
    });
    return res;
  }

  /** Normaliza un tensor, devolviendo tambien los valores max min actuales 
   * @param d Tensor de entrada
   */
  protected normalize(d: tf.Tensor) {
    const r=tf.tidy(()=>{
      const td=d.transpose(); // Para normalizar las columnas
      const axis=td.rank-1; //Se generaliza el concepto de max min
      const min=td.min(axis, true);
      const max=td.max(axis, true);
      const range=max.sub(min);
      const td2=td.sub(min).div(range);
      const res=td2.transpose();  // Volvemos al orden inicial
      const amin=Array.from(min.dataSync());
      const amax=Array.from(max.dataSync());
      return {data:res, min:amin, max:amax};
    });
    return r;
  }

}
