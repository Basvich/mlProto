import { Component, OnInit } from '@angular/core';
import * as p5 from 'p5';
import {Bola} from './gobjects';

@Component({
  selector: 'app-inv-pend',
  templateUrl: './inv-pend.component.html',
  styleUrls: ['./inv-pend.component.less']
})
export class InvPendComponent implements OnInit {
  private canvasP5: p5;

  bola: Bola;
  gravity: p5.Vector;
  
  constructor() { }

  ngOnInit() {
  }

  setup() {
    this.setupP5();
    this.setupGObjects();
  }

  cycle(){
    this.bola.applyForce(this.gravity);
    this.bola.update();
    this.canvasP5.redraw();
    this.bola.checkEdges();
  }

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

  protected setupGObjects(){
    this.bola=new Bola(this.canvasP5, 50, 100);
    this.gravity = this.canvasP5.createVector(0, 0.1*8);
  }

  protected draw() {
    this.canvasP5.background(127);
    this.bola.display();
  }

}
