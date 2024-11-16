// Define a class for the game map
// The game map is a 2D array of tiles

import { Sprite } from "pixi.js";
import { Maybe } from "./maybe";
import { Snake } from "./snake";
import { Bonus } from "./bonus";
import { Obstacle } from "./obstacle";
import { Critter } from "./critter";
import { SnakeDirection } from "./snake-direction";

export class GameMap {
  public tiles: number[][] = [];
  public sprites: Maybe<Sprite>[][] = [];
  public collisionMap: number[][] = [];
  public obstacles: Obstacle[] = [];

  public get width(): number { return this._width; }

  public get height(): number { return this._height; }

  constructor(private _width: number, private _height: number) {
    this.initializeToSize(_width, _height);
  }

  public initializeToSize(mapWidth: number, mapHeight: number) {
    for (let i = 0; i < mapWidth; i++) {
      this.tiles[i] = [];
      this.collisionMap[i] = [];
      this.sprites[i] = [];
      for (let j = 0; j < mapHeight; j++) {
        this.tiles[i][j] = 0;
        this.collisionMap[i][j] = 0;
        this.sprites[i][j] = Maybe.None<Sprite>();
      }
    }
  }

  public addSnakeToCollisionMap(snake: Snake) {
    for (let i = 0; i < snake.body.length; i++) {
      this.collisionMap[snake.body[i].x][snake.body[i].y] = 1;
    }
  }

  public addBonusesToCollisionMap(bonuses: Bonus[]) {
    for (let i = 0; i < bonuses.length; i++) {
      this.collisionMap[bonuses[i].x][bonuses[i].y] = 3;
    }
  }

  public addObstaclesToCollisionMap(obstacles: Obstacle[]) {
    for (let i = 0; i < obstacles.length; i++) {
      this.collisionMap[obstacles[i].x][obstacles[i].y] = 4;
    }
  }

  public addCrittersToCollisionMap(critters: Critter[]) {
    for (let i = 0; i < critters.length; i++) {
      this.collisionMap[critters[i].x][critters[i].y] = 5;
    }
  }

  public clearCollisionMap() {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.collisionMap[i][j] = 0;
      }
    }
  }

  /**
   * Get the cell which would match the direction.
   * Note that this function does not check if the cell is within the bounds of the map.
   * @param x 
   * @param y 
   * @param direction 
   * @returns 
   */
  public tryToGetCellInDirection(x: number, y: number, direction: SnakeDirection, borderless: boolean): { x: number, y: number } {
    let result = {
      x: x + SnakeDirection.deltaX(direction),
      y: y + SnakeDirection.deltaY(direction)
    };

    if (borderless) {
      if (result.x < 0) {
        result.x = this.width - 1;
      } else if (result.x >= this.width) {
        result.x = 0;
      }

      if (result.y < 0) {
        result.y = this.height - 1;
      } else if (result.y >= this.height) {
        result.y = 0;
      }
    }
    
    return result;
  }

  public findEmptySpotInCollisionMap(): { x: number, y: number } {
    // Go through the entire matrix and move the available cells to an array
    let availableCells: { x: number, y: number }[] = [];
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        if (this.collisionMap[i][j] === 0) {
          availableCells.push({ x: i, y: j });
        }
      }
    }

    let randomIndex = Math.floor(Math.random() * availableCells.length);
    return availableCells[randomIndex];
  }

};