import { Sprite } from "pixi.js";
import { Maybe } from "./maybe";
import { SnakeDirection } from "./snake-direction";

export enum SnakeBodyPartType {
  head_up = 0,
  head_left = 1,
  head_down = 2,
  head_right = 3,
  body_straight_up = 4,
  body_straight_left = 5,
  body_straight_down = 6,
  body_straight_right = 7,
  body_turn_up_left = 8,
  body_turn_up_right = 9,
  body_turn_down_left = 10,
  body_turn_down_right = 11,
  tail_up = 12,
  tail_left = 13,
  tail_down = 14,
  tail_right = 15
}

export function areDirectionsOpposites(dir1: SnakeDirection, dir2: SnakeDirection): boolean {
  return (dir1 == SnakeDirection.up && dir2 == SnakeDirection.down) ||
    (dir1 == SnakeDirection.down && dir2 == SnakeDirection.up) ||
    (dir1 == SnakeDirection.left && dir2 == SnakeDirection.right) ||
    (dir1 == SnakeDirection.right && dir2 == SnakeDirection.left);
}

export class SnakeBodyPart {
  x: number = 0;
  y: number = 0;
  direction: SnakeDirection = SnakeDirection.up;
  type: SnakeBodyPartType = SnakeBodyPartType.head_up;
  sprite: Maybe<Sprite> = Maybe.None<Sprite>();
  public spawned: boolean = false;
  constructor(x: number, y: number, type: SnakeBodyPartType) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.sprite = Maybe.None<Sprite>();
    this.spawned = false;
    this.direction = SnakeDirection.none;
  }
}

export class Snake {

  public alive: boolean = true;
  public body: SnakeBodyPart[] = [];

  public direction: SnakeDirection = SnakeDirection.up;
  public cachedDirection: SnakeDirection = SnakeDirection.up;
  public nextDirection: SnakeDirection = SnakeDirection.up;

  public snakeSpeed: number = 50;
  public score: number = 0;

  constructor() {
    console.log('Snake created');
  }

  public speed() { return this.snakeSpeed; }

  protected shiftSnakeBody() {
    for (let i = this.body.length - 1; i > 0; i--) {
      this.body[i].x = this.body[i - 1].x;
      this.body[i].y = this.body[i - 1].y;
      this.body[i].type = this.body[i - 1].type;
      this.body[i].direction = this.body[i - 1].direction;
    }

    this.updateTailBodyPart();
  }

  public sprites(): Sprite[] {
    let sprites: Sprite[] = [];
    for (let i = 0; i < this.body.length; i++) {
      if (this.body[i].sprite?.hasData()) {
        sprites.push(this.body[i].sprite.value());
      }
      this.body[i].sprite = Maybe.None<Sprite>();
    }
    return sprites;
  }

  // TODO: move this outside of the class
  // public updateSprites(): Sprite[] {
  //   let sprites: Sprite[] = [];
  //   for (let i = 0; i < this.body.length; i++) {
  //     let snakeSprite = new Sprite(this.snakeSheet.textures[this.snakeTextureNames[this.body[i].type]]);
  //     snakeSprite.x = this.body[i].x * 32;
  //     snakeSprite.y = this.body[i].y * 32;
  //     sprites.push(snakeSprite);
  //     this.body[i].sprite = Maybe.Some(snakeSprite);
  //   }
  //   return sprites;
  // }

  protected updateTailBodyPart() {
    if (this.body.length <= 1) {
      return;
    }

    let tail = this.body[this.body.length - 1];
    let direction = this.body[this.body.length - 2].direction;
    if (direction == SnakeDirection.up) {
      tail.type = SnakeBodyPartType.tail_up;
    } else if (direction == SnakeDirection.left) {
      tail.type = SnakeBodyPartType.tail_left;
    } else if (direction == SnakeDirection.down) {
      tail.type = SnakeBodyPartType.tail_down;
    } else {
      tail.type = SnakeBodyPartType.tail_right;
    }
  }

  public grow() {
    if (this.body.length <= 0) {
      return;
    }
    // add an unspawned body part to the end of the snake
    let last = this.body[this.body.length - 1];
    let newPart = new SnakeBodyPart(last.x, last.y, last.type);
    newPart.spawned = false;
    this.body.push(newPart);
  }

  public pullUp() {
    if (this.body.length <= 0) {
      return;
    }

    if (this.body[0].direction == SnakeDirection.down) {
      // disallowed
      return;
    }

    // Update the snake's future "neck" part based on the head's direction (old and new)
    if (this.body[0].direction == SnakeDirection.left) {
      this.body[0].type = SnakeBodyPartType.body_turn_up_right;
    } else if (this.body[0].direction == SnakeDirection.right) {
      this.body[0].type = SnakeBodyPartType.body_turn_up_left;
    } else {
      this.body[0].type = SnakeBodyPartType.body_straight_up;
    }

    this.shiftSnakeBody();

    this.body[0].type = SnakeBodyPartType.head_up;
    this.body[0].direction = SnakeDirection.up;
    this.body[0].y -= 1;
  }

  public pullDown() {
    if (this.body.length <= 0) {
      return;
    }

    if (this.body[0].direction == SnakeDirection.up) {
      // disallowed
      return;
    }

    // Update the snake's future "neck" part based on the head's direction (old and new)
    if (this.body[0].direction == SnakeDirection.left) {
      this.body[0].type = SnakeBodyPartType.body_turn_down_right;
    } else if (this.body[0].direction == SnakeDirection.right) {
      this.body[0].type = SnakeBodyPartType.body_turn_down_left;
    } else {
      this.body[0].type = SnakeBodyPartType.body_straight_down;
    }

    this.shiftSnakeBody();

    this.body[0].type = SnakeBodyPartType.head_down;
    this.body[0].direction = SnakeDirection.down;
    this.body[0].y += 1;
  }

  public pullLeft() {
    if (this.body.length <= 0) {
      return;
    }

    if (this.body[0].direction == SnakeDirection.right) {
      // disallowed
      return;
    }

    if (this.body[0].direction == SnakeDirection.up) {
      this.body[0].type = SnakeBodyPartType.body_turn_down_left;
    } else if (this.body[0].direction == SnakeDirection.down) {
      this.body[0].type = SnakeBodyPartType.body_turn_up_left;
    } else {
      this.body[0].type = SnakeBodyPartType.body_straight_left;
    }

    this.shiftSnakeBody();

    this.body[0].type = SnakeBodyPartType.head_left;
    this.body[0].direction = SnakeDirection.left;
    this.body[0].x -= 1;
  }

  public pullRight() {
    if (this.body.length <= 0) {
      return;
    }

    if (this.body[0].direction == SnakeDirection.left) {
      // disallowed
      return;
    }

    if (this.body[0].direction == SnakeDirection.up) {
      this.body[0].type = SnakeBodyPartType.body_turn_down_right;
    } else if (this.body[0].direction == SnakeDirection.down) {
      this.body[0].type = SnakeBodyPartType.body_turn_up_right;
    } else {
      this.body[0].type = SnakeBodyPartType.body_straight_right;
    }

    this.shiftSnakeBody();

    this.body[0].type = SnakeBodyPartType.head_right;
    this.body[0].direction = SnakeDirection.right;
    this.body[0].x += 1;
  }

  protected logSnake() {
    // Log the entire snake
    // console.log('Snake:');
    for (let i = 0; i < this.body.length; i++) {
      console.log(`Part ${i}: x=${this.body[i].x}, y=${this.body[i].y}, type=${this.body[i].type}, direction=${this.body[i].direction}`);
    }
  }
}