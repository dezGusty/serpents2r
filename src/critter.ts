import { SnakeDirection } from "./snake-direction";

export class Critter {
  x: number = 0;
  y: number = 0;
  speed: number = 100;
  direction: SnakeDirection = SnakeDirection.none;
  type: number = 0;

  public delta: number = 0;

  constructor(x: number, y: number, speed: number, direction: SnakeDirection) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.direction = direction;
  }
}