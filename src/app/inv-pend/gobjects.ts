import * as p5 from 'p5';

export class OGPhys {
  mass = 1;
  position: p5.Vector;
  velocity: p5.Vector;
  acceleration: p5.Vector;
  

  constructor(protected canvas: p5, x: number, y: number) {
    this.position = canvas.createVector(x, y);
    this.velocity = canvas.createVector(0, 0);
    this.acceleration = canvas.createVector(0, 0);
  }

  applyForce(force: p5.Vector): void {
    const f = p5.Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  update() {
    // La velocidad es cambiada según la aceleración
    this.velocity.add(this.acceleration);
    // La posición es cambiada según la velocidad
    this.position.add(this.velocity);
    // Borrar aceleración en cada cuadro
    this.acceleration.mult(0);
  }

}

export class Bola extends OGPhys {
  maxY = 380;

  constructor(canvas: p5, x: number, y: number) {
    super(canvas, x, y);
  }

  display(): void {
    this.canvas.stroke(0);
    this.canvas.strokeWeight(2);
    this.canvas.fill(255, 127);
    this.canvas.ellipse(this.position.x, this.position.y, this.mass * 16, this.mass * 16);
  }

  applyForce(force: p5.Vector): void {
    const f = p5.Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  


  checkEdges() {
    if (this.position.y > (this.maxY)) {
      // Un poco de amortiguamiento al rebotar contra el fondo
      this.velocity.y *= -0.9;
      this.position.y = (this.maxY);
    }
  }
}

export class Carro extends OGPhys {
  constructor(canvas: p5, x: number, y: number) {
    super(canvas, x, y);
  }

  display(): void {
    this.canvas.stroke(0);
    this.canvas.strokeWeight(2);
    this.canvas.fill(255, 127);
    this.canvas.rect(this.position.x-20, this.position.y-15, 40, 30);
  }
}
