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

  private mappedBonusTexNames: string[] = [];
  private bonusSprites: Sprite[] = [];
  private crittersSprites: Sprite[] = [];
  private obstaclesSprites: Sprite[] = [];

  private touchTexture?: Texture = undefined;
  private touchSpriteLeft: Sprite = new Sprite();
  private touchSpriteRight: Sprite = new Sprite();
  private displayOnScreenTouchControls: boolean = false;

  private fpsText: Maybe<BitmapText> = Maybe.None();
  private gameScoreText?: BitmapText;
  private gameOverText?: BitmapText;
  private instructionsText?: Text;
  private messagesText?: Text;

  private keyboardController: KeyboardController;
  private gamepadController: GamepadController;

  // Add render groups for layering
  private terrainRenderGroup: Container = new Container({ isRenderGroup: true });
  private mainRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiRenderGroup: Container = new Container({ isRenderGroup: true });
  private renderContainer: Container = new Container();

  private renderContainerOffset: { x: number, y: number } = { x: 0, y: 0 };

  private game: Game;

  private tempMessage = '';

  constructor(public app: Application) {
    this.currentGameState = GameState.InMenu;

    this.keyboardController = new KeyboardController(KeyboardControllerMode.Manual);
    this.gamepadController = new GamepadController();

    let gameMap: GameMap = new GameMap(25, 10);
    this.game = new Game(gameMap, this.keyboardController, this.gamepadController);
  }

  public async initialize() {
    const containingElement: Maybe<HTMLElement> = new Maybe(document.querySelector('body'));

    // Wait for the Renderer to be available
    await this.app.init({
      background: '#102229',
      width: 800,
      height: 320,
      resizeTo: containingElement.value()
    });

    console.log('App started, size: ' + this.app.screen.width + 'x' + this.app.screen.height);
    this.tempMessage = 'App started, size: ' + this.app.screen.width + 'x' + this.app.screen.height;
    this.setScalingForSize(this.app.screen.width, this.app.screen.height);

    // The application will create a canvas element for you that you
    // can then insert into the DOM
    // document.body.appendChild(this.app.canvas);
    containingElement.value().appendChild(this.app.canvas);

    // Add the stage to the canvas
    this.app.stage.addChild(this.renderContainer);

    this.renderContainer.addChild(this.terrainRenderGroup);
    this.renderContainer.addChild(this.mainRenderGroup);
    this.renderContainer.addChild(this.uiRenderGroup);

    await this.loadAssets();
    await this.loadSounds();

    this.initializeMapAndGame();
    await this.initializeTexts();

    this.setupMainLoop();
    this.setupInputHandlers();

    // set-up a resize event listener
    this.app.renderer.on('resize', (width, height) => {
      this.setScalingForSize(width, height);
    });
  }

  private setScalingForSize(width: number, height: number) {
    if (this.instructionsText) {
      this.instructionsText.text += "\nResized to: " + width + 'x' + height;
      console.log('Resized to: ' + width + 'x' + height);
    }
    const herizontalScale = width / 800;
    const verticalScale = height / 320;
    // keep the aspect ratio
    const minScale = Math.min(herizontalScale, verticalScale);
    this.renderContainer.scale.set(minScale, minScale);
    this.renderContainerOffset = { x: (width - 800 * minScale) / 2, y: (height - 320 * minScale) / 2 };
    this.renderContainer.position.set(this.renderContainerOffset.x, this.renderContainerOffset.y);
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
    this.touchSpriteLeft = new Sprite(this.touchTexture);
    this.touchSpriteLeft.x = 30;
    this.touchSpriteLeft.y = 150;
    this.touchSpriteRight = new Sprite(this.touchTexture);
    this.touchSpriteRight.x = 630;
    this.touchSpriteRight.y = 150;
  }

  public async initializeTexts() {
    await Assets.load('./GustysSerpentsFontL.xml');

    this.fpsText = new Maybe(new BitmapText({
      text: 'FPS: 0', style: { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left', },
    }));

    this.gameScoreText = new BitmapText({
      text: 'Pts.: 0', style: { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left', },
    });

    const style = new TextStyle({ fontFamily: 'Arial', fontSize: 18, fill: { color: '#ffffff', alpha: 1 }, stroke: { color: '#4a1850', width: 5, join: 'round' }, });

    this.gameOverText = new BitmapText({
      text: 'Game Over!', style: { fontFamily: 'GustysSerpents', fontSize: 72, align: 'center', },
    });

    this.fpsText.value().x = 10;
    this.fpsText.value().y = 10;
    this.uiRenderGroup.addChild(this.fpsText.value());

    this.gameScoreText.x = 10;
    this.gameScoreText.y = 35;

    this.gameOverText.x = 200;
    this.gameOverText.y = 100;

    this.instructionsText = new Text({
      text: `Press ENTER to start the game. 

Snake movement:
- gamepad direction stick
- keyb. WASD or dir keys
- touch screen to enable on-screen controls
`
        + "\n" + this.tempMessage,
      style,
    });
    this.instructionsText.x = 240;
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
    this.game.onBonusExpiredOrPicked = (bonus: Bonus) => {
      this.onBonusExpiredOrPicked(bonus);
    }
    this.game.onBonusSpawned = (bonus: Bonus) => {
      this.onBonusSpawned(bonus);
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
          if (this.gameOverText != undefined) {
            this.uiRenderGroup.addChild(this.gameOverText);
          }
          // sound.play('game-over');
        }
      }

      if (this.gameScoreText) {
        this.gameScoreText.text = `Pts.: ${this.game.snake.score.toFixed(0)}`;
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
        if (event.code === 'KeyP') {
          //debug information
          this.bonusSprites.forEach((sprite, index) => {
            console.log(`Bonus sprite tex ${index}: ${sprite.texture}`);
          });
          this.mappedBonusTexNames.forEach((textureName, index) => {
            console.log(`Mapped bonus texture ${index}: ${textureName}`);
          });
          this.mainRenderGroup.children.forEach((container, index) => {
            console.log(`Main RG container ${index}: ${container.name}, ${container.getBounds().x}, ${container.getBounds().y}`);
          });
        }
      } else if (this.currentGameState === GameState.InMenu) {
        if (event.code === 'Enter') {
          this.startGame();
        }
      } else if (this.currentGameState === GameState.PostGameGameOver) {
        // Any key => move to the menu
        this.cleanupGame();
        this.showMenu();
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
        this.uiRenderGroup.addChild(this.touchSpriteLeft);
        this.uiRenderGroup.addChild(this.touchSpriteRight);
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

          if (touchX && touchY) {
            this.reactToTouchInput(touchX, touchY);
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

  private reactToTouchInput(touchX: number, touchY: number) {
    const squareRadius = 29;

    // Also take scaling into account
    touchX = touchX / this.renderContainer.scale.x;
    touchY = touchY / this.renderContainer.scale.y;

    // Store the touch zones for the directions and actions
    const touchZoneActions: { x: number, y: number, action: string }[] = [
      { x: 109, y: 171, action: 'up' },
      { x: 109, y: 292, action: 'down' },
      { x: 50, y: 232, action: 'left' },
      { x: 169, y: 232, action: 'right' },
      { x: 706, y: 171, action: 'up' },
      { x: 706, y: 292, action: 'down' },
      { x: 671, y: 232, action: 'left' },
      { x: 746, y: 232, action: 'right' }
    ];

    touchZoneActions.forEach(element => {
      if ((element.x - squareRadius + this.renderContainerOffset.x < touchX) && (touchX < element.x + squareRadius + this.renderContainerOffset.x)
        && (element.y - squareRadius + this.renderContainerOffset.y < touchY) && (touchY < element.y + squareRadius + this.renderContainerOffset.y)) {
        this.game.onKeyDown(element.action);
      }
    });
  }

  private startGame() {
    this.cleanupMenu();
    if (this.gameScoreText) this.uiRenderGroup.addChild(this.gameScoreText);
    this.currentGameState = GameState.InGame;
    sound.play('start-game');
    this.game.start();
  }

  private cleanupMenu() {
    if (this.instructionsText) this.uiRenderGroup.removeChild(this.instructionsText);
  }

  private showMenu() {
    if (this.instructionsText) {
      this.uiRenderGroup.addChild(this.instructionsText);
    }
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

    this.bonusSprites = [];

    // clean-up for the obstacles
    for (let i = 0; i < this.obstaclesSprites.length; i++) {
      this.mainRenderGroup.removeChild(this.obstaclesSprites[i]);
    }

    this.obstaclesSprites = [];

    // clean-up for the critters
    for (let i = 0; i < this.crittersSprites.length; i++) {
      this.mainRenderGroup.removeChild(this.crittersSprites[i]);
    }

    this.crittersSprites = [];

    if (this.gameOverText) {
      this.uiRenderGroup.removeChild(this.gameOverText);
    }

    if (this.gameScoreText) this.uiRenderGroup.removeChild(this.gameScoreText);
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

  private onBonusExpiredOrPicked(bonus: Bonus) {
    // Find the index
    let bonusIdx = this.game.bonuses.findIndex(b => b === bonus);
    this.mainRenderGroup.removeChild(this.bonusSprites[bonusIdx]);
    console.log(`Bonus of type ${bonus.type} expired or picked at index ${bonusIdx}`);

    // remove the sprite from the list
    if (bonusIdx >= 0 && bonusIdx < this.bonusSprites.length && bonusIdx < this.mappedBonusTexNames.length) {
      this.bonusSprites.splice(bonusIdx, 1);
      this.mappedBonusTexNames.splice(bonusIdx, 1);
    } else if (this.bonusSprites.length != this.mappedBonusTexNames.length) {
      console.log(`Error: Bonus sprites and mapped textures are out of sync`);
    }
  }

  private onBonusSpawned(bonus: Bonus) {
    const typeIndex = bonus.type;
    const textureName = this.bonusTextureNames[typeIndex];
    let bonusSprite = new Sprite(this.bonusSheet.value().textures[textureName]);
    this.bonusSprites.push(bonusSprite);
    this.mappedBonusTexNames.push(textureName);
    this.mainRenderGroup.addChild(bonusSprite);
    bonusSprite.x = bonus.x * 32;
    bonusSprite.y = bonus.y * 32;
    console.log(`Bonus of type ${bonus.type} spawned at ${bonus.x}, ${bonus.y}`);
  }

  private updateBonusesInStage(bonuses: Bonus[]) {
    for (let i = 0; i < bonuses.length; i++) {
      const typeIndex = bonuses[i].type;
      if (typeIndex < this.bonusTextureNames.length) {
        let bonusSprite;
        if (bonuses[i].remainingLifetime < Bonus.WARNING_DURATION) {
          // Use AnimatedSprite if remaining lifetime very low
          const textureName = "anim_" + this.bonusTextureNames[typeIndex];

          if (textureName != this.mappedBonusTexNames[i]) {
            this.mainRenderGroup.removeChild(this.bonusSprites[i]);
            this.mappedBonusTexNames[i] = textureName;
            const textures = this.bonusSheet.value().animations[textureName];
            if (textures) {
              bonusSprite = new AnimatedSprite(textures);
              bonusSprite.animationSpeed = 0.1; // Adjust the animation speed as needed
              bonusSprite.play();
            } else {
              console.log(`No animation found for texture: ${textureName}`);
              bonusSprite = new Sprite(this.bonusSheet.value().textures[textureName]);
            }
            this.bonusSprites[i] = bonusSprite;
            this.mainRenderGroup.addChild(this.bonusSprites[i]);
          }
        }
        if (bonusSprite) {
          bonusSprite.x = bonuses[i].x * 32;
          bonusSprite.y = bonuses[i].y * 32;
        }
      } else {
        console.log(`Invalid bonus type index: ${typeIndex}`);
      }
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


