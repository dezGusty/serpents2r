import { Application, Sprite, Assets, Text, TextStyle, BitmapText, Spritesheet, AnimatedSprite, Texture, Container } from 'pixi.js';
import { GameMap } from './gamemap';
import { KeyboardController, KeyboardControllerMode } from './keyboard-controller';
import { Snake } from './snake';
import { Game } from './game';
import { GamepadController } from './gamepad-controller';
import { Maybe } from './maybe';
import { Bonus } from './bonus';
import { Obstacle } from './obstacle';
import { Critter } from './critter';
import { SnakeDirection } from './snake-direction';
import { sound } from '@pixi/sound';

export enum GameState {
  InMenu,
  InGame,
  PostGameGameOver
}

export class SerpentsApp {
  // The application will create a renderer using WebGL, if possible,
  // with a fallback to a canvas render. It will also setup the ticker
  // and the root stage PIXI.Container

  private currentGameState: GameState = GameState.InMenu;

  private terrainTextureNames: string[] = [];
  private snakeTextureNames: string[] = [];
  private bonusTextureNames: string[] = [];
  private crittersTextureNames: string[] = [];
  private obstaclesTextureNames: string[] = [];

  private terrainSheet: Maybe<Spritesheet> = Maybe.None();
  private snakeSheet: Maybe<Spritesheet> = Maybe.None();
  private bonusSheet: Maybe<Spritesheet> = Maybe.None();
  private crittersSheet: Maybe<Spritesheet> = Maybe.None();
  private obstaclesSheet: Maybe<Spritesheet> = Maybe.None();

  private bonusSprites: Sprite[] = [];
  private crittersSprites: Sprite[] = [];
  private obstaclesSprites: Sprite[] = [];

  private touchTexture?: Texture = undefined;
  private touchSprite: Sprite = new Sprite();
  private displayOnScreenTouchControls: boolean = false;

  private fpsText: Maybe<BitmapText> = Maybe.None();
  private gameSpeedText?: BitmapText;
  private gameOverText?: BitmapText;
  private instructionsText?: Text;
  private messagesText?: Text;

  private keyboardController: KeyboardController;
  private gamepadController: GamepadController;

  // Add render groups for layering
  private terrainRenderGroup: Container = new Container({isRenderGroup: true});
  private mainRenderGroup: Container = new Container({isRenderGroup: true});
  private uiRenderGroup: Container = new Container({isRenderGroup: true});

  private game: Game;

  constructor(public app: Application) {
    // this.app = new Application();
    this.currentGameState = GameState.InMenu;

    this.keyboardController = new KeyboardController(KeyboardControllerMode.Manual);
    this.gamepadController = new GamepadController();

    let gameMap: GameMap = new GameMap(25, 10);
    this.game = new Game(gameMap, this.keyboardController, this.gamepadController);
  }

  public async initialize() {
    const bodyElement: Maybe<HTMLElement> = new Maybe<HTMLElement>(document.querySelector('body'));

    // Wait for the Renderer to be available
    await this.app.init({ background: '#102229', resizeTo: bodyElement.value() });

    console.log('App started, size: ' + this.app.screen.width + 'x' + this.app.screen.height);

    // The application will create a canvas element for you that you
    // can then insert into the DOM
    document.body.appendChild(this.app.canvas);

    this.app.stage.addChild(this.terrainRenderGroup);
    this.app.stage.addChild(this.mainRenderGroup);
    this.app.stage.addChild(this.uiRenderGroup);

    await this.loadAssets();
    await this.loadSounds();

    this.initializeMapAndGame();
    await this.initializeTexts();

    this.setupMainLoop();
    this.setupInputHandlers();
  }

  public async loadAssets() {
    this.terrainSheet = new Maybe(await Assets.load('terrainspritesheet.json'));
    if (!this.terrainSheet.hasData()) {
      console.error('Failed to load the terrain spritesheet');
    }

    // Store a dictionary of indices (1-5) to texture names (E.g. terrain_01.png)
    this.terrainTextureNames = [];
    // The texture names are taken from object key properties in sheet.textures
    for (let key in this.terrainSheet.value().textures) {
      this.terrainTextureNames.push(key);
    }

    this.snakeSheet = new Maybe(await Assets.load('snakesspritesheet.json'));
    if (!this.snakeSheet.hasData()) {
      console.error('Failed to load the snake spritesheet');
    }
    this.snakeTextureNames = [];
    for (let key in this.snakeSheet.value().textures) {
      this.snakeTextureNames.push(key);
    }

    this.bonusSheet = new Maybe(await Assets.load('bonusspritesheet.json'));

    for (let key in this.bonusSheet.value().textures) {
      this.bonusTextureNames.push(key);
    }

    this.crittersSheet = new Maybe(await Assets.load('crittersspritesheet.json'));

    for (let key in this.crittersSheet.value().textures) {
      this.crittersTextureNames.push(key);
    }

    this.obstaclesSheet = new Maybe(await Assets.load('obstaclesspritesheet.json'));

    for (let key in this.obstaclesSheet.value().textures) {
      this.obstaclesTextureNames.push(key);
    }

    this.touchTexture = await Assets.load('touch/touch_area.png');
    this.touchSprite = new Sprite(this.touchTexture);
    this.touchSprite.x = 30;
    this.touchSprite.y = 150;
  }

  public async initializeTexts() {
    await Assets.load('./GustysSerpentsFontL.xml');

    this.fpsText = new Maybe(new BitmapText({
      text: 'FPS: 0', style: { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left', },
    }));

    this.gameSpeedText = new BitmapText({
      text: 'Speed: 1', style: { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left', },
    });

    const style = new TextStyle({ fontFamily: 'Arial', fontSize: 18, fill: { color: '#ffffff', alpha: 1 }, stroke: { color: '#4a1850', width: 5, join: 'round' }, });

    this.gameOverText = new BitmapText({
      text: 'Game Over!', style: { fontFamily: 'GustysSerpents', fontSize: 72, align: 'center', },
    });

    this.fpsText.value().x = 10;
    this.fpsText.value().y = 10;
    this.uiRenderGroup.addChild(this.fpsText.value());

    this.gameSpeedText.x = 10;
    this.gameSpeedText.y = 35;
    this.uiRenderGroup.addChild(this.gameSpeedText);

    this.gameOverText.x = 100;
    this.gameOverText.y = 200;

    this.instructionsText = new Text({
      text: 'Press ENTER to start the game. Use the gamepad direction stick (or keyb. WASD) to move the snake',
      style,
    });
    this.instructionsText.x = 280;
    this.instructionsText.y = 10;
    this.uiRenderGroup.addChild(this.instructionsText);

    this.messagesText = new Text({
      text: '',
      style,
    });
    this.messagesText.x = 10;
    this.messagesText.y = 60;
    this.uiRenderGroup.addChild(this.messagesText);
  }

  public async loadSounds() {
    // Add sounds
    console.log('Loading sounds...');
    await sound.add('game-over', 'game_over.ogg');
    await sound.add('eat-bonus', 'drop_004.ogg');
    await sound.add('start-game', 'ready.ogg');
    await sound.add('snake-dead', 'error_008.ogg');
    await sound.add('eat-critter', 'sfx_powerup.wav');

    console.log('Loaded sounds...');

  }

  public initializeMapAndGame(): void {
    // Generate the terrain map (randomly)
    const maxTerrainCount = this.terrainTextureNames.length;

    for (let i = 0; i < this.game.gameMap.width; i++) {
      for (let j = 0; j < this.game.gameMap.height; j++) {
        this.game.gameMap.tiles[i][j] = Math.floor(Math.random() * maxTerrainCount);
        let gameSprite = new Sprite(this.terrainSheet.value().textures[this.terrainTextureNames[this.game.gameMap.tiles[i][j]]]);

        gameSprite.x = i * 32;
        gameSprite.y = j * 32;

        this.terrainRenderGroup.addChild(gameSprite);
      }
    }

    this.game.onSnakeCollisionWithItself = () => {
      sound.play('snake-dead');
    };
    this.game.onSnakeCollisionWithObstacle = () => {
      sound.play('snake-dead');
    };
    this.game.onSnakePickupBonus = () => {
      sound.play('eat-bonus');
    };
    this.game.onSnakePickupCritter = () => {
      sound.play('eat-critter');
    };
  }

  public setupMainLoop(): void {
    this.app.ticker.maxFPS = 60;

    // Listen for frame updates
    this.app.ticker.add((ticker) => {

      if (this.fpsText.hasData()) {
        this.fpsText.value().text = `FPS: ${Math.round(ticker.FPS)}`;
      }

      if (this.currentGameState === GameState.InGame) {
        if (this.game.update(ticker.deltaMS)) {
          this.updateSnakeInStage(this.game.snake);
          this.updateBonusesInStage(this.game.bonuses);
          this.updateObstaclesInStage(this.game.obstacles);
          this.updateCrittersInStage(this.game.critters);
        }

        if (!this.game.snake.alive) {
          this.currentGameState = GameState.PostGameGameOver;
          if (this.gameOverText) {
            this.uiRenderGroup.addChild(this.gameOverText);
          }
          sound.play('game-over');
        }
      }

      if (this.gameSpeedText) {
        this.gameSpeedText.text = `Speed: ${this.game.snake.speed().toFixed(1)}, Length: ${this.game.snake.body.length}`;
      }
    });
  }

  public setupInputHandlers(): void {

    window.addEventListener("gamepadconnected", (e) => {
      let message: string = `Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}. ${e.gamepad.buttons.length} buttons, ${e.gamepad.axes.length} axes.`;
      console.log(message);
      if (this.messagesText) {
        this.messagesText.text = message;
      }
    });

    window.addEventListener("gamepaddisconnected", (e) => {
      let message: string = `Gamepad disconnected from index ${e.gamepad.index}: ${e.gamepad.id}`;
      console.log(message);
      if (this.messagesText) {
        this.messagesText.text = message;
      }
    });

    document.addEventListener('keydown', (event) => {
      if (this.currentGameState === GameState.InGame) {
        // handled inside the Game class
        this.keyboardController.keydownHandler(event);
      } else if (this.currentGameState === GameState.InMenu) {
        if (event.code === 'Enter') {
          this.startGame();
        }
      } else if (this.currentGameState === GameState.PostGameGameOver) {
        // Any key => move to the menu
        this.cleanupGame();
        this.currentGameState = GameState.InMenu;
      }
    });

    document.addEventListener('keyup', (event) => {
      if (this.currentGameState === GameState.InGame) {
        // handled inside the Game class
        this.keyboardController.keyupHandler(event);
      }
    });

    globalThis.addEventListener("touchstart", (event) => {
      if (!this.displayOnScreenTouchControls) {
        console.log('Adding on-screen touch controls');
        this.displayOnScreenTouchControls = true;
        this.uiRenderGroup.addChild(this.touchSprite);
        return;
      }

      if (this.currentGameState === GameState.InMenu) {
        this.startGame();
      }

      if (this.currentGameState === GameState.InGame) {
        // handled inside the Game class
        // this.keyboardController.keyupHandler(event);
        if (event.touches.length > 0) {
          console.log(`Touch start: ${event.touches.item(0)?.clientX}, ${event.touches.item(0)?.clientY}`);
          const touchX = event.touches.item(0)?.clientX;
          const touchY = event.touches.item(0)?.clientY;
          const squareRadius = 29;

          if (touchX && touchY) {
            // set the direction based on the touch position, if around the following positions:
            // 109, 171 => up
            if ((109 - squareRadius < touchX) && (touchX < 109 + squareRadius)
              && (171 - squareRadius < touchY) && (touchY < 171 + squareRadius)) {
              this.game.onKeyDown('up');
            } else if (109 - squareRadius < touchX && touchX < 109 + squareRadius
              && 292 - squareRadius < touchY && touchY < 292 + squareRadius) {
              // 109, 292 => down
              this.game.onKeyDown('down');
            } else if (50 - squareRadius < touchX && touchX < 50 + squareRadius
              && 232 - squareRadius < touchY && touchY < 232 + squareRadius) {
              // 50, 232 => left 
              this.game.onKeyDown('left');
            } else if (169 - squareRadius < touchX && touchX < 169 + squareRadius
              && 232 - squareRadius < touchY && touchY < 232 + squareRadius) {
              // 169, 232 => right
              this.game.onKeyDown('right');
            }
          }

        }
      }

      else if (this.currentGameState === GameState.PostGameGameOver) {
        // Any key => move to the menu
        this.cleanupGame();
        this.currentGameState = GameState.InMenu;
      }
    }, false);
  }


  private startGame() {
    this.currentGameState = GameState.InGame;
    sound.play('start-game');
    this.game.start();
  }

  private cleanupGame() {
    // clean-up the stage
    // clean-up for the snake
    const sprites = this.game.snake.sprites();
    for (let i = 0; i < sprites.length; i++) {
      this.mainRenderGroup.removeChild(sprites[i]);
    }

    // clean-up for the bonuses
    for (let i = 0; i < this.bonusSprites.length; i++) {
      this.mainRenderGroup.removeChild(this.bonusSprites[i]);
    }

    // clean-up for the obstacles
    for (let i = 0; i < this.obstaclesSprites.length; i++) {
      this.mainRenderGroup.removeChild(this.obstaclesSprites[i]);
    }

    // clean-up for the critters
    for (let i = 0; i < this.crittersSprites.length; i++) {
      this.mainRenderGroup.removeChild(this.crittersSprites[i]);
    }

    if (this.gameOverText) {
      this.mainRenderGroup.removeChild(this.gameOverText);
    }
  }

  private updateSnakeSprites(snake: Snake): Sprite[] {
    let sprites: Sprite[] = [];
    for (let i = 0; i < snake.body.length; i++) {
      let snakeSprite = new Sprite(this.snakeSheet.value().textures[this.snakeTextureNames[snake.body[i].type]]);
      snakeSprite.x = snake.body[i].x * 32;
      snakeSprite.y = snake.body[i].y * 32;
      sprites.push(snakeSprite);
      snake.body[i].sprite = Maybe.Some(snakeSprite);
    }
    return sprites;
  }

  private updateSnakeInStage(snake: Snake) {
    const oldSprites = snake.sprites();
    for (let i = 0; i < oldSprites.length; i++) {
      this.mainRenderGroup.removeChild(oldSprites[i]);
    }
    const snakeSprites = this.updateSnakeSprites(snake);
    for (let i = 0; i < snakeSprites.length; i++) {
      this.mainRenderGroup.addChild(snakeSprites[i]);
    }
  }

  private updateBonusesInStage(bonuses: Bonus[]) {
    for (let i = 0; i < this.bonusSprites.length; i++) {
      this.mainRenderGroup.removeChild(this.bonusSprites[i]);
    }

    this.bonusSprites = [];
    for (let i = 0; i < bonuses.length; i++) {
      const typeIndex = bonuses[i].type;
      if (typeIndex < this.bonusTextureNames.length) {
        let bonusSprite;
        if (bonuses[i].remainingLifetime < Bonus.WARNING_DURATION) {
          // Use AnimatedSprite if remaining lifetime is less than 2 seconds
          const textureName = "anim_" + this.bonusTextureNames[typeIndex];
          const textures = this.bonusSheet.value().animations[textureName];
          if (textures) {
            bonusSprite = new AnimatedSprite(textures);
            bonusSprite.animationSpeed = 2.0; // Adjust the animation speed as needed
            bonusSprite.play();
          } else {
            console.log(`No animation found for texture: ${textureName}`);
            bonusSprite = new Sprite(this.bonusSheet.value().textures[textureName]);
          }
        } else {
          // Use regular Sprite if remaining lifetime is 2 seconds or more
          bonusSprite = new Sprite(this.bonusSheet.value().textures[this.bonusTextureNames[typeIndex]]);
        }
        bonusSprite.x = bonuses[i].x * 32;
        bonusSprite.y = bonuses[i].y * 32;
        this.bonusSprites.push(bonusSprite);
      } else {
        console.log(`Invalid bonus type index: ${typeIndex}`);
      }
    }

    for (let i = 0; i < this.bonusSprites.length; i++) {
      this.mainRenderGroup.addChild(this.bonusSprites[i]);
    }
  }

  private updateObstaclesInStage(obstacles: Obstacle[]) {

    for (let i = 0; i < this.obstaclesSprites.length; i++) {
      this.mainRenderGroup.removeChild(this.obstaclesSprites[i]);
    }

    this.obstaclesSprites = [];
    for (let i = 0; i < obstacles.length; i++) {
      const typeIndex = obstacles[i].type;
      if (typeIndex < this.obstaclesTextureNames.length) {
        let obstacleSprite = new Sprite(this.obstaclesSheet.value().textures[this.obstaclesTextureNames[typeIndex]]);
        obstacleSprite.x = obstacles[i].x * 32;
        obstacleSprite.y = obstacles[i].y * 32;
        this.obstaclesSprites.push(obstacleSprite);
      } else {
        console.log(`Invalid obstacle type index: ${typeIndex}`);
      }
    }

    for (let i = 0; i < this.obstaclesSprites.length; i++) {
      this.mainRenderGroup.addChild(this.obstaclesSprites[i]);
    }
  }

  private updateCrittersInStage(critters: Critter[]) {
    for (let i = 0; i < this.crittersSprites.length; i++) {
      this.mainRenderGroup.removeChild(this.crittersSprites[i]);
    }

    this.crittersSprites = [];
    for (let i = 0; i < critters.length; i++) {
      const typeIndex = critters[i].type;
      if (typeIndex < this.crittersTextureNames.length) {
        // Get the base name of the texture based on the type
        let textureName = "";
        switch (typeIndex) {
          case 0:
            textureName = "critter1_" + SnakeDirection.toString(critters[i].direction);
            break;
          case 1:
            textureName = "critter2_" + SnakeDirection.toString(critters[i].direction);
            break;
          case 2:
            textureName = "critter3_" + SnakeDirection.toString(critters[i].direction);
            break;
          default:  // No texture for other types
            console.log(`Invalid critter type index: ${typeIndex}`);
            break;
        }

        if (textureName.length > 0) {
          let critterSprite = new Sprite(this.crittersSheet.value().textures[textureName]);
          critterSprite.x = critters[i].x * 32;
          critterSprite.y = critters[i].y * 32;
          this.crittersSprites.push(critterSprite);
        }
      } else {
        console.log(`Invalid critter type index: ${typeIndex}`);
      }
    }

    for (let i = 0; i < this.crittersSprites.length; i++) {
      this.mainRenderGroup.addChild(this.crittersSprites[i]);
    }
  }
};


