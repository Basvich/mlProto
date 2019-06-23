import { Component, OnInit } from '@angular/core';
import * as p5 from 'p5';
import {Bola, Carro} from './gobjects';



interface IDataIn{
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
  enableRecord=false;
  recordedDin: Array<IDataIn>=[];
  recordedDout: Array<number>=[];
  recordedCount=0;
  cycleCount=0;

  constructor() { }

  ngOnInit() {
  }

  setup() {
    this.setupP5();
    this.setupGObjects();
  }

  /** Accion que se ejecuta en cada ciclo */
  cycle(){
    this.bola.applyForce(this.gravity);
    this.carro.applyForce(this.horForz);
    this.bola.update();
    this.carro.update();
    this.checkLimits();
    this.canvasP5.redraw();
    this.bola.checkEdges();
    if (this.enableRecord){
       if (this.cycleCount%10===0) this.recordSample();
    }
    this.cycleCount++;
  }

  /** Comprueba si el carro se sale de los limites, en cuyo caso lo rebota */
  checkLimits() {
    if (this.carro.position.x<=20){
      this.carro.applyForce(this.canvasP5.createVector((20-this.carro.position.x)*0.2));
    } else if (this.carro.position.x>580){
      this.carro.applyForce(this.canvasP5.createVector((580-this.carro.position.x)*0.2));
    }
  }

  start(){
    if (this.timer) return;
    this.timer=setInterval(()=>this.cycle(), 100);
  }

  stop(){
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer=null;

  }

  startRecord(){
    this.enableRecord=true;
  }

  stopRecord(){
    this.enableRecord=false;
  }
  /** Pone el carro en posicion y velocidad aleatoria */
  offsetize(){
    
    this.carro.velocity.x=Math.random()*4-2;
    this.carro.position.x=this.rndNext(250,450);
  }

  /**
   * Guarda un registro del estado actual
   */
  recordSample(){
    if (this.recordedCount>1000){
      this.enableRecord=false;
    }
    const din={pos:this.carro.position.x-300, vel:this.carro.velocity.x, acc:this.carro.acceleration.x};
    const dout=this.horForz.x;
    this.recordedDin.push(din);
    this.recordedDout.push(dout);
    this.recordedCount++;

  }

  changeForce(f: number){
    console.log(f);
  }

  /** Respuesta al  evento de cambio del slider */
  changeForce2(f: number){
    console.log('->'+f);
    this.horForz.x=f/10;
  }

  /** Configuracion del p5 */
  protected setupP5(){
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
  protected setupGObjects(){
    this.bola=new Bola(this.canvasP5, 50, 100);
    this.carro=new Carro(this.canvasP5, 300, 350 );
    this.gravity = this.canvasP5.createVector(0, 0.1*8);
    this.horForz =this.canvasP5.createVector(0, 0);
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

  rndNext(max: number, min: number): number {
    if (!min)min=0;
    const r=Math.trunc(Math.random() * (max-min))+min;
    return r;
  }

}
