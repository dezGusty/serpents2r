import { areDirectionsOpposites, Snake, SnakeBodyPart, SnakeBodyPartType } from "./snake";
import { KeyboardController } from "./keyboard-controller";
import { GameMap } from "./gamemap";
import { GamepadController, GamepadInput4x } from "./gamepad-controller";
import { Critter } from "./critter";
import { Bonus } from "./bonus";
import { Obstacle } from "./obstacle";
import { SnakeDirection } from "./snake-direction";

export class Game {

  public snake: Snake;

  private gameDelta: number = 0;
  private MAX_DELTA_MS = 500;
  private MIN_DELTA_MS = 33;
  private MAX_GAME_SPEED = 200;
  private MIN_GAME_SPEED = 1;

  private MIN_BONUSES = 1;
  private MAX_BONUSES = 3;

  private MIN_CRITTERS = 0;
  private MAX_CRITTERS = 2;

  private BONUS_CHANCE_TO_SPAWN = 0.21; // 20% chance to spawn a bonus per second
  private BONUS_CHANCE_TO_TRANSFORM_TO_OBSTACLE = 0.58;

  private CRITTER_CHANCE_TO_CHANGE_DIR = 0.2;
  private CRITTER_CHANCE_TO_SPAWN = 0.14;
  private SNAKE_SPEED_INCREASE_PER_SECOND = 0.8;

  private solidBorders = false;
  private gamePaused = false;

  public critters: Critter[] = [];
  public bonuses: Bonus[] = [];
  public bonusTypesCount = 4;

  // Add a new property for obstacles
  public obstacles: Obstacle[] = [];

  constructor(
    public gameMap: GameMap,
    private keyboardController: KeyboardController,
    private gamepadController: GamepadController
  ) {
    this.snake = new Snake();
    this.snake.body.push({ x: 0, y: 0, type: SnakeBodyPartType.head_up, direction: SnakeDirection.up, spawned: true } as SnakeBodyPart);
    this.keyboardController.onKeyDown = (key: string) => { this.onKeyDown(key) };
  }

  public start() {
    console.log('Game started');
    this.snake = new Snake();
    this.snake.alive = true;
    this.snake.direction = SnakeDirection.up;
    this.snake.cachedDirection = SnakeDirection.none;
    this.snake.nextDirection = SnakeDirection.none;
    this.snake.snakeSpeed = (this.MAX_GAME_SPEED - this.MIN_GAME_SPEED) * 0.7 + this.MIN_GAME_SPEED;

    this.snake.body.push({ x: 10, y: 8, type: SnakeBodyPartType.head_up, direction: SnakeDirection.up, spawned: true } as SnakeBodyPart);
    this.snake.body.push({ x: 10, y: 8, type: SnakeBodyPartType.body_straight_up, direction: SnakeDirection.up, spawned: false } as SnakeBodyPart);
    this.snake.body.push({ x: 10, y: 8, type: SnakeBodyPartType.body_straight_up, direction: SnakeDirection.up, spawned: false } as SnakeBodyPart);
    this.snake.body.push({ x: 10, y: 8, type: SnakeBodyPartType.body_straight_up, direction: SnakeDirection.up, spawned: false } as SnakeBodyPart);
    this.snake.body.push({ x: 10, y: 8, type: SnakeBodyPartType.tail_up, direction: SnakeDirection.up, spawned: false } as SnakeBodyPart);

    // Reset the obstacles
    this.obstacles = [];

    // Reset the bonuses
    this.bonuses = [];
    this.critters = [];

    // Initialize critters
    this.initializeCritters();
  }

  private initializeCritters() {
    for (let i = 0; i < this.MIN_CRITTERS; i++) {
      const x = Math.floor(Math.random() * this.gameMap.width);
      const y = Math.floor(Math.random() * this.gameMap.height);
      const speed = Math.random() * 2 + 1; // Random speed between 1 and 3
      const direction = Math.floor(Math.random() * 4); // Random initial direction
      this.critters.push(new Critter(x, y, speed, direction));
    }
  }

  public moveSnake() {
    switch (this.snake.direction) {
      case SnakeDirection.up:
        this.snake.pullUp();
        break;
      case SnakeDirection.down:
        this.snake.pullDown();
        break;
      case SnakeDirection.left:
        this.snake.pullLeft();
        break;
      case SnakeDirection.right:
        this.snake.pullRight();
        break;
    }
  }

  public checkCollision() {
    if (this.solidBorders) {
      if (this.snake.body[0].x < 0 || this.snake.body[0].x >= this.gameMap.width || this.snake.body[0].y < 0 || this.snake.body[0].y >= this.gameMap.height) {
        this.snake.alive = false;
        return;
      }
    } else {
      if (this.snake.body[0].x < 0) {
        this.snake.body[0].x = this.gameMap.width - 1;
      }
      if (this.snake.body[0].x >= this.gameMap.width) {
        this.snake.body[0].x = 0;
      }
      if (this.snake.body[0].y < 0) {
        this.snake.body[0].y = this.gameMap.height - 1;
      }
      if (this.snake.body[0].y >= this.gameMap.height) {
        this.snake.body[0].y = 0;
      }
    }

    for (let i = 1; i < this.snake.body.length; i++) {
      if (this.snake.body[0].x === this.snake.body[i].x && this.snake.body[0].y === this.snake.body[i].y) {
        this.snake.alive = false;
        this.onSnakeCollisionWithItself();
        return;
      }
    }

    // Check for collision with obstacles
    for (let i = 0; i < this.obstacles.length; i++) {
      if (this.snake.body[0].x === this.obstacles[i].x && this.snake.body[0].y === this.obstacles[i].y) {
        this.snake.alive = false;
        this.onSnakeCollisionWithObstacle();
        return;
      }
    }
  }

  onSnakeCollisionWithObstacle() {
    console.log('Snake collided with an obstacle');
  }

  onSnakeCollisionWithItself() {
    console.log('Snake collided with itself');
  }

  onSnakePickupBonus(bonus: Bonus) {
    console.log(`Snake picked up a bonus of type ${bonus.type}`);
  }

  onSnakePickupCritter(critter: Critter) {
    console.log(`Snake picked up a critter of type ${critter.type}`);
  }

  onBonusExpiredOrPicked(bonus: Bonus) {
    console.log(`Bonus of type ${bonus.type} expired or was picked`);
  }

  onBonusToObstacle(bonus: Bonus) {
    console.log(`Bonus of type ${bonus.type} transformed to obstacle`);
  }

  onBonusSpawned(bonus: Bonus) {
    console.log(`Bonus of type ${bonus.type} spawned`);
  }

  onCritterSpawned(critter: Critter) {
    console.log(`Critter of type ${critter.type} spawned`);
  }

  /**
   * Try to cache the direction to be used in the next update.
   * @param direction Direction to cache.
   */
  private tryToCacheDirection(direction: SnakeDirection) {
    if (this.snake.cachedDirection === SnakeDirection.none) {
      // nothing cached, store the new direction, but only valid
      // cannot go in the opposite direction and cannot cache the same direction
      if (this.snake.direction !== SnakeDirection.opposite(direction)
        && this.snake.direction !== direction) {
        this.snake.cachedDirection = direction;
      }
    } else {
      // a direction is already cached, store a new direction to enable the user to
      // quickly queue the next direction
      this.snake.nextDirection = direction;
    }
  }

  public onKeyDown(key: string) {
    if (key === 'up') {
      this.tryToCacheDirection(SnakeDirection.up);
    } else if (key == 'down') {
      this.tryToCacheDirection(SnakeDirection.down);
    } else if (key == 'left') {
      this.tryToCacheDirection(SnakeDirection.left);
    } else if (key == 'right') {
      this.tryToCacheDirection(SnakeDirection.right);
    } else if (key == 'space') {
      this.gamePaused = !this.gamePaused;
      console.log(`Game paused: ${this.gamePaused}`);
    }
  }

  private handleInput() {
    // Keyboard controller actions.
    if (//this.keyboardController.keys.up.pressed || 
      this.gamepadController.isDirectionPressed(GamepadInput4x.AxisUp)) {
      this.tryToCacheDirection(SnakeDirection.up);
    }

    if (//this.keyboardController.keys.down.pressed || 
      this.gamepadController.isDirectionPressed(GamepadInput4x.AxisDown)) {
      this.tryToCacheDirection(SnakeDirection.down);
    }


    if (//this.keyboardController.keys.left.pressed || 
      this.gamepadController.isDirectionPressed(GamepadInput4x.AxisLeft)) {
      this.tryToCacheDirection(SnakeDirection.left);
    }

    if (//this.keyboardController.keys.right.pressed || 
      this.gamepadController.isDirectionPressed(GamepadInput4x.AxisRight)) {
      this.tryToCacheDirection(SnakeDirection.right);
    }
  }

  public update(delta: number): boolean {
    let somethingChanged = false;

    if (this.gamePaused) {
      return somethingChanged;
    }

    if (!this.snake.alive) {
      return somethingChanged;
    }

    this.handleInput();

    // Increase snake speed over time
    this.snake.increaseSpeed(this.SNAKE_SPEED_INCREASE_PER_SECOND * (delta / 1000));

    const speedRatio = this.snake.snakeSpeed / (this.MAX_GAME_SPEED - this.MIN_GAME_SPEED);
    const targetSnakeDelta = this.MAX_DELTA_MS - (this.MAX_DELTA_MS - this.MIN_DELTA_MS) * speedRatio;

    this.gameDelta += delta;
    if (this.gameDelta >= targetSnakeDelta) {
      // move the snake according to the cached direction
      if (this.snake.cachedDirection !== SnakeDirection.none
        && !areDirectionsOpposites(this.snake.direction, this.snake.cachedDirection)) {
        this.snake.direction = this.snake.cachedDirection;
      }
      this.snake.cachedDirection = this.snake.nextDirection;
      this.snake.nextDirection = SnakeDirection.none;

      this.gameDelta = 0;
      this.moveSnake();
      this.checkCollision();

      somethingChanged = true;
    }

    // Move critters
    somethingChanged = this.moveCritters(delta) || somethingChanged;
    let needToSpawnCritters = false;

    // Ensure at least MIN_CRITTERS critters are present
    if (this.critters.length < this.MIN_CRITTERS) {
      needToSpawnCritters = true;
    }


    // Spawn additional critters with a small chance per second if less than MAX_CRITTERS
    if (this.critters.length < this.MAX_CRITTERS
      && Math.random() < this.CRITTER_CHANCE_TO_SPAWN * (delta / 1000)) {
      needToSpawnCritters = true;
    }


    if (needToSpawnCritters) {

      this.gameMap.clearCollisionMap();
      this.gameMap.addSnakeToCollisionMap(this.snake);
      this.gameMap.addBonusesToCollisionMap(this.bonuses);
      this.gameMap.addObstaclesToCollisionMap(this.obstacles);
      this.gameMap.addCrittersToCollisionMap(this.critters);

      let maybeEmptySpot = this.gameMap.findEmptySpotInCollisionMap();
      if (maybeEmptySpot.hasData()) {
        const speed = Math.random() * 2 + 1; // Random speed between 1 and 3
        const direction = Math.floor(Math.random() * 4); // Random initial direction
        const newCritter = new Critter(maybeEmptySpot.value().x, maybeEmptySpot.value().y, speed, direction);
        this.critters.push(newCritter);
        this.onCritterSpawned(newCritter);
        somethingChanged = true;
      }

    }

    // Check if the snake has eaten a bonus
    for (let i = 0; i < this.bonuses.length; i++) {
      if (this.snake.body[0].x === this.bonuses[i].x && this.snake.body[0].y === this.bonuses[i].y) {
        this.bonuses[i].apply(this.snake);
        this.bonuses[i].picked = true;
        somethingChanged = true;
        this.onSnakePickupBonus(this.bonuses[i]);
      }
    }

    // Check if the snake has eaten a critter
    for (let i = 0; i < this.critters.length; i++) {
      if (this.snake.body[0].x === this.critters[i].x && this.snake.body[0].y === this.critters[i].y) {
        this.snake.grow();
        this.snake.score += 10;
        this.snake.decreaseSpeed(2); // Decrease speed by 2 units when the snake eats a critter
        this.critters.splice(i, 1);
        somethingChanged = true;
        this.onSnakePickupCritter(this.critters[i]);
      }
    }


    // Update the bonuses
    for (let i = 0; i < this.bonuses.length; i++) {
      somethingChanged = somethingChanged || this.bonuses[i].update(delta);
    }

    // Handle expired bonuses and spawn obstacles
    for (let i = 0; i < this.bonuses.length; i++) {
      if (this.bonuses[i].remainingLifetime <= 0) {
        // some chance (e.g. 20%) to spawn an obstacle
        if (Math.random() < this.BONUS_CHANCE_TO_TRANSFORM_TO_OBSTACLE) {
          this.onBonusToObstacle(this.bonuses[i]);
          // set a random obstacle type between 0 and 3
          let obstacleType = Math.floor(Math.random() * 4);
          this.obstacles.push(new Obstacle(this.bonuses[i].x, this.bonuses[i].y, obstacleType));
        }
        somethingChanged = true;
      }
    }

    // Remove expired bonuses, allow listeners to react.
    this.bonuses.filter(bonus => bonus.remainingLifetime <= 0 || bonus.picked).forEach(bonus => {
      this.onBonusExpiredOrPicked(bonus);
    });

    // Keep only the bonuses that are still active
    this.bonuses = this.bonuses.filter(
      bonus => bonus.remainingLifetime > 0 && bonus.picked === false);

    let needMoreBonuses = false;
    // Check if new bonuses need to be added.
    if (this.bonuses.length < this.MAX_BONUSES) {
      if (this.bonuses.length < this.MIN_BONUSES) {
        // Guarantee that there is at least one bonus.
        needMoreBonuses = true;
      } else {
        // 1 in 10 chance of adding a new bonus.
        needMoreBonuses = Math.random() < 0.1;
        needMoreBonuses = Math.random() < this.BONUS_CHANCE_TO_SPAWN * (delta / 1000);
      }
    }

    if (needMoreBonuses) {
      this.gameMap.clearCollisionMap();
      this.gameMap.addSnakeToCollisionMap(this.snake);
      this.gameMap.addBonusesToCollisionMap(this.bonuses);
      this.gameMap.addObstaclesToCollisionMap(this.obstacles);
      this.gameMap.addCrittersToCollisionMap(this.critters);

      let maybeEmptySpot = this.gameMap.findEmptySpotInCollisionMap();
      if (maybeEmptySpot.hasData()) {
        this.spawnBonus(maybeEmptySpot.value());
        somethingChanged = true;
      }
    }
    return somethingChanged;
  }

  private spawnBonus(cell: { x: number, y: number }) {
    const bonusType = Math.floor(Math.random() * this.bonusTypesCount);
    // Add a variation of 4000 milliseconds
    const variation = Math.random() * 3000;
    let newBonus = new Bonus(cell.x, cell.y, 8500 + variation, bonusType);
    this.bonuses.push(newBonus);
    this.onBonusSpawned(newBonus);
  }

  private tryToMoveCritter(critter: Critter) {

    // Randomly change direction
    if (Math.random() < this.CRITTER_CHANCE_TO_CHANGE_DIR) {
      critter.direction = Math.floor(Math.random() * 4);
    }

    // Get the map coordinates for the cell in which the critter should move
    let targetCell = this.gameMap.tryToGetCellInDirection(critter.x, critter.y, critter.direction, !this.solidBorders);
    if (this.gameMap.collisionMap[targetCell.x][targetCell.y] === 0) {
      // cell is available to move into.
      critter.x = targetCell.x;
      critter.y = targetCell.y;
    }
  }

  private moveCritters(delta: number): boolean {
    let somethingChanged = false;
    for (let critter of this.critters) {

      // Game speed control.
      if (critter.speed > this.MAX_GAME_SPEED) {
        critter.speed = this.MAX_GAME_SPEED;
      }
      if (critter.speed < this.MIN_GAME_SPEED) {
        critter.speed = this.MIN_GAME_SPEED;
      }

      const speedRatio = critter.speed / (this.MAX_GAME_SPEED - this.MIN_GAME_SPEED);
      const targetCritterDelta = this.MAX_DELTA_MS - (this.MAX_DELTA_MS - this.MIN_DELTA_MS) * speedRatio;

      critter.delta += delta;

      if (critter.delta >= targetCritterDelta) {

        // TODO: optimize
        this.gameMap.clearCollisionMap();
        this.gameMap.addSnakeToCollisionMap(this.snake);
        this.gameMap.addBonusesToCollisionMap(this.bonuses);
        this.gameMap.addObstaclesToCollisionMap(this.obstacles);
        this.gameMap.addCrittersToCollisionMap(this.critters);

        this.tryToMoveCritter(critter);

        critter.delta -= targetCritterDelta;
        somethingChanged = true;
      }
    }
    return somethingChanged;
  }
}
