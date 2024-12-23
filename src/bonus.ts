import { Snake } from "./snake";

export class Bonus {
  x: number = 0;
  y: number = 0;
  remainingLifetime: number = 0;

  type: number = 0;
  static readonly WARNING_DURATION = 3000;
  public picked: boolean = false;
  private startingLifetime: number = 0;
  public initialDuration(): number { return this.startingLifetime; }

  constructor(x: number, y: number, lifetime: number, type: number) {
    this.x = x;
    this.y = y;
    this.startingLifetime = lifetime;
    this.remainingLifetime = lifetime;
    this.type = type;
  }

  public update(delta: number): boolean {
    this.remainingLifetime -= delta;
    if (this.remainingLifetime < 0) {
      return true;
    }

    if (this.remainingLifetime < Bonus.WARNING_DURATION && this.remainingLifetime + delta >= Bonus.WARNING_DURATION) {
      console.log(`Bonus of type ${this.type} is about to expire`);
      return true;
    }

    if (this.picked) {
      return true;
    }

    return false;
  }

  public apply(snake: Snake) {
    console.log(`Applying bonus of type ${this.type} to snake`);
    switch (this.type) {
      case 0:
        snake.grow();
        snake.score += 2;
        break;
      case 1:
        snake.grow();
        snake.grow();
        snake.score += 1;
        break;
      case 2:
        snake.grow();
        snake.score += 2;
        break;
      case 3:
        snake.grow();
        snake.score += 3;
        break;
    }
    snake.decreaseSpeed(1); // Decrease speed by 1 unit when a bonus is applied
  }

}