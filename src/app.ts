import { Application, Sprite, Assets, Text, TextStyle, BitmapText, Spritesheet, AnimatedSprite, Texture, Container, TextStyleOptions, NineSliceSprite } from 'pixi.js';
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
import { FancyButton, Input } from '@pixi/ui';
import { Highscores, Score } from './highscores';
import pkg from './../package.json';

export enum GameState {
  InMenu,
  ViewHighscores,
  InGame,
  PostGameGameOver,
  PostGameEnterHighscore
}

export class SerpentsApp {

  private currentGameState: GameState = GameState.InMenu;
  private version: string = pkg.version;

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
  private uiSheet: Maybe<Spritesheet> = Maybe.None();

  private mappedBonusTexNames: string[] = [];
  private bonusSprites: Sprite[] = [];
  private crittersSprites: Sprite[] = [];
  private obstaclesSprites: Sprite[] = [];

  private touchTexture?: Texture = undefined;
  private touchSpriteLeft: Sprite = new Sprite();
  private touchSpriteRight: Sprite = new Sprite();
  private displayOnScreenTouchControls: boolean = false;

  private fpsText: Maybe<BitmapText> = Maybe.None();
  private gameTitleText?: BitmapText;
  private gameSubtitleText?: BitmapText;
  private gameScoreText?: BitmapText;
  private snakeSpeedText?: BitmapText;
  private gameOverText?: BitmapText;
  private highscoresText?: BitmapText;
  private instructionsText?: Text;
  private messagesText?: Text;

  private newHighscoreNameInput?: Input = undefined;
  private playerName: string = 'Player 1';

  private keyboardController: KeyboardController;
  private gamepadController: GamepadController;

  // Add render groups for layering
  private terrainRenderGroup: Container = new Container({ isRenderGroup: true });
  private mainRenderGroup: Container = new Container({ isRenderGroup: true });
  private uiRenderGroup: Container = new Container({ isRenderGroup: true });
  private renderContainer: Container = new Container();

  private renderContainerOffset: { x: number, y: number } = { x: 0, y: 0 };

  private DEFAULT_FONT_STYLE: TextStyle | TextStyleOptions = { fontFamily: 'GustysSerpents', fontSize: 18, align: 'left' };
  private CELL_SIZE = 32;

  private startGameButton?: FancyButton;
  private viewHighscoresButton?: FancyButton;
  private goBackToMenuButton?: FancyButton;

  private game: Game;
  private highscores: Highscores = new Highscores();

  // Store the touch zones for the directions and actions
  private touchZoneActions: { x: number, y: number, action: string }[] = [
    { x: 109, y: 171, action: 'up' },
    { x: 109, y: 292, action: 'down' },
    { x: 50, y: 232, action: 'left' },
    { x: 169, y: 232, action: 'right' },

    { x: 689, y: 171, action: 'up' },
    { x: 689, y: 292, action: 'down' },
    { x: 630, y: 232, action: 'left' },
    { x: 749, y: 232, action: 'right' }
  ];

  private tempMessage = "";
  private needToAddHighscore: boolean = false;

  constructor(public app: Application) {
    this.currentGameState = GameState.InMenu;

    this.keyboardController = new KeyboardController(KeyboardControllerMode.Manual);
    this.gamepadController = new GamepadController();

    let gameMap: GameMap = new GameMap(25, 10);
    this.game = new Game(gameMap, this.keyboardController, this.gamepadController);
  }

  /**
   * Initializes the application. 
   * This method should be called ONCE after the application is created.
   */
  public async initialize() {
    const containingElement: Maybe<HTMLElement> = new Maybe(document.getElementById('game'));

    // Wait for the Renderer to be available
    await this.app.init({
      background: '#102229',
      width: this.CELL_SIZE * 25,
      height: this.CELL_SIZE * 10,
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

    this.startGameButton = new FancyButton({
      defaultView: 'btn1_normal.png',
      hoverView: 'btn1_hover.png',
      pressedView: 'btn1_pressed.png',
      text: new BitmapText({
        text: 'Start', style: this.DEFAULT_FONT_STYLE,
      }),
      nineSliceSprite: [13, 13, 13, 13]
    });
    this.goBackToMenuButton = new FancyButton({
      defaultView: 'btn1_normal.png',
      hoverView: 'btn1_hover.png',
      pressedView: 'btn1_pressed.png',
      text: new BitmapText({
        text: 'Ok', style: this.DEFAULT_FONT_STYLE,
      }),
      nineSliceSprite: [13, 13, 13, 13]
    });

    this.viewHighscoresButton = new FancyButton({
      defaultView: 'btn1_normal.png',
      hoverView: 'btn1_hover.png',
      pressedView: 'btn1_pressed.png',
      text: new BitmapText({
        text: 'Highscores', style: this.DEFAULT_FONT_STYLE,
      }),
      nineSliceSprite: [13, 13, 13, 13]
    });


    // this.touchZoneActions.forEach(element => {
    //   const squareRadius = 29;

    //   this.touchDebugGraphics.rect(element.x - squareRadius + this.renderContainerOffset.x
    //     , element.y - squareRadius + this.renderContainerOffset.y, squareRadius * 2, squareRadius * 2);
    //   this.touchDebugGraphics.fill(0xde3249);
    // });
    // this.uiRenderGroup.addChild(this.touchDebugGraphics);

    if (this.startGameButton) {
      this.startGameButton.x = 10;
      this.startGameButton.y = 70;
      this.startGameButton.width = 150;
      this.startGameButton.height = 50;
      this.uiRenderGroup.addChild(this.startGameButton);
      this.startGameButton.onPress.connect(() => {
        console.log('Start game button pressed');
        this.startGame();
      });
    }

    if (this.goBackToMenuButton) {
      this.goBackToMenuButton.x = 290;
      this.goBackToMenuButton.y = 190;
      this.goBackToMenuButton.width = 150;
      this.goBackToMenuButton.height = 50;
      this.goBackToMenuButton.onPress.connect(() => {
        console.log('Go back to menu button pressed');
        this.goToMenuFromPostGame();
      });
    }

    if (this.viewHighscoresButton) {
      this.viewHighscoresButton.x = 10;
      this.viewHighscoresButton.y = 130;
      this.viewHighscoresButton.width = 150;
      this.viewHighscoresButton.height = 50;
      this.viewHighscoresButton.onPress.connect(() => {
        console.log('View highscores button pressed');
        this.showHighscores();
      });
      this.uiRenderGroup.addChild(this.viewHighscoresButton);
    }

    this.newHighscoreNameInput = new Input({
      bg: 'input_bg.png',
      placeholder: 'Enter your name',
      value: this.playerName,
      cleanOnFocus: true,
      padding: [3, 3, 3, 3],
      nineSliceSprite: [4, 4, 4, 4],
      textStyle: this.DEFAULT_FONT_STYLE
    });

    if (this.newHighscoreNameInput) {
      this.newHighscoreNameInput.x = 10;
      this.newHighscoreNameInput.y = 190;
      this.newHighscoreNameInput.width = 150;
      this.newHighscoreNameInput.height = 50;
      this.newHighscoreNameInput.onChange.connect(value => {
        this.playerName = value;
      });
    }

    let auxSprite =
      new NineSliceSprite({
        texture: this.uiSheet.value().textures['stylized_border.png'],
        leftWidth: 41,
        rightWidth: 41,
        topHeight: 41,
        bottomHeight: 41
      }
      );
    auxSprite.width = this.CELL_SIZE * 25;
    auxSprite.height = this.CELL_SIZE * 10;
    this.uiRenderGroup.addChild(auxSprite);
  }

  private setScalingForSize(width: number, height: number) {
    if (this.instructionsText) {
      this.instructionsText.text = this.tempMessage + "\nResized to: " + width + 'x' + height;
      console.log('Resized to: ' + width + 'x' + height);
    }
    const originalWindowSize = { width: this.CELL_SIZE * 25, height: this.CELL_SIZE * 10 };
    // keep the aspect ratio
    const scaling = { x: width / originalWindowSize.width, y: height / originalWindowSize.height };
    const minScale = Math.min(scaling.x, scaling.y);
    this.renderContainer.scale.set(minScale, minScale);

    // Set-up an offset for the render container.
    // It should be in the middle horizontally and about 30 pixels up from the middle vertically
    this.renderContainerOffset = {
      x: (width - originalWindowSize.width * minScale) / 2,
      y: Math.max((height - originalWindowSize.height * minScale) / 2 - 30, 0)
    };

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

    this.uiSheet = new Maybe(await Assets.load('ui/uispritesheet.json'));
    if (!this.uiSheet.hasData()) {
      console.error('Failed to load the UI spritesheet');
    }

    this.touchTexture = await Assets.load('touch/touch_area.png');
    this.touchSpriteLeft = new Sprite(this.touchTexture);
    this.touchSpriteLeft.x = 30;
    this.touchSpriteLeft.y = 150;
    this.touchSpriteRight = new Sprite(this.touchTexture);
    this.touchSpriteRight.x = 610;
    this.touchSpriteRight.y = 150;
  }

  public async initializeTexts() {
    await Assets.load('./GustysSerpentsFontL.xml');

    this.fpsText = new Maybe(new BitmapText({ text: 'FPS: 0', style: this.DEFAULT_FONT_STYLE, }));
    this.fpsText.value().x = 10;
    this.fpsText.value().y = 10;
    this.fpsText.value().alpha = 0.7;

    this.gameScoreText = new BitmapText({ text: 'Score: 0', style: this.DEFAULT_FONT_STYLE, });
    this.gameScoreText.x = 10;
    this.gameScoreText.y = 35;
    this.gameScoreText.alpha = 0.7;

    this.snakeSpeedText = new BitmapText({ text: 'Speed: 1', style: this.DEFAULT_FONT_STYLE });
    this.snakeSpeedText.x = 10;
    this.snakeSpeedText.y = 60;
    this.snakeSpeedText.alpha = 0.7;


    this.gameOverText = new BitmapText({ text: 'Game Over!', style: { fontFamily: 'GustysSerpents', fontSize: 72, align: 'center' }, });
    this.gameOverText.position = { x: 200, y: 100 };

    this.gameTitleText = new BitmapText({ text: 'Serpents 2 Respawned', style: { ...this.DEFAULT_FONT_STYLE, fontSize: 48 } });
    this.gameTitleText.position = { x: 260, y: 10 };
    this.uiRenderGroup.addChild(this.gameTitleText);

    this.gameSubtitleText = new BitmapText({ text: `v. ${this.version}, by Gusty`, style: { ...this.DEFAULT_FONT_STYLE, fontSize: 24 } });
    this.gameSubtitleText.position = { x: 530, y: 60 };
    this.uiRenderGroup.addChild(this.gameSubtitleText);

    this.highscoresText = new BitmapText({ text: 'Highscores:', style: { ...this.DEFAULT_FONT_STYLE, fontSize: 24 } });
    this.highscoresText.position = { x: 260, y: 10 };

    this.uiRenderGroup.addChild(this.fpsText.value());




    const style = new TextStyle({ fontFamily: 'Arial', fontSize: 18, fill: { color: '#ffffff', alpha: 1 }, stroke: { color: '#4a1850', width: 5, join: 'round' }, });
    this.tempMessage = `Snake movement:
- gamepad direction stick, keyb. (WASD/dir keys)
- touch screen to enable on-screen controls

Your speed increases constantly.
Pick up bonuses and creeps to slow down 
before it's no longer possible to control.
Bonuses you don't pick up could turn into obstacles.
`
      + "\n" + this.tempMessage;
    this.instructionsText = new Text({
      text: this.tempMessage,
      style,
    });
    this.instructionsText.x = 230;
    this.instructionsText.y = 90;
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
    await sound.add('spawn-bonus', 'audio/drop_004.ogg');
    await sound.add('eat-bonus', 'audio/drop_003.ogg');
    await sound.add('start-game', 'audio/jingles_PIZZI10.ogg');
    await sound.add('snake-dead', 'audio/error_008.ogg');
    await sound.add('eat-critter', 'audio/sfx_powerup.wav');
    await sound.add('spawn-critter', 'audio/bong_001.ogg');
    await sound.add('bonus-becomes-obstacle', 'audio/switch_007.ogg');

    console.log('Loaded sounds...');

  }

  public initializeMapAndGame(): void {
    // Generate the terrain map (randomly)
    const maxTerrainCount = this.terrainTextureNames.length;

    for (let i = 0; i < this.game.gameMap.width; i++) {
      for (let j = 0; j < this.game.gameMap.height; j++) {
        this.game.gameMap.tiles[i][j] = Math.floor(Math.random() * maxTerrainCount);
        let gameSprite = new Sprite(this.terrainSheet.value().textures[this.terrainTextureNames[this.game.gameMap.tiles[i][j]]]);

        gameSprite.x = i * this.CELL_SIZE;
        gameSprite.y = j * this.CELL_SIZE;

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
      sound.play('spawn-bonus');
      this.onBonusSpawned(bonus);
    };
    this.game.onBonusToObstacle = (_bonus: Bonus) => {
      sound.play('bonus-becomes-obstacle');
    };
    this.game.onCritterSpawned = (_critter: Critter) => {
      sound.play('spawn-critter');
      //this.onCritterSpawned(critter);
    }
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
          if (this.gameOverText) this.uiRenderGroup.addChild(this.gameOverText);
          if (this.goBackToMenuButton) this.uiRenderGroup.addChild(this.goBackToMenuButton);

          let latestScore = this.game.snake.score;
          // If the last entry in the highscores is less than the latest score, add it
          let highscores = this.highscores.get();
          if (highscores.length < 5 || (highscores.length > 0 && highscores[highscores.length - 1].score < latestScore)) {
            this.currentGameState = GameState.PostGameEnterHighscore;
            if (this.newHighscoreNameInput) {
              this.uiRenderGroup.addChild(this.newHighscoreNameInput);
              this.needToAddHighscore = true;
            }
          }
        }
      }

      if (this.gameScoreText) {
        this.gameScoreText.text = `Score: ${this.game.snake.score.toFixed(0)}`;
      }

      if (this.snakeSpeedText) {
        this.snakeSpeedText.text = `Speed: ${this.game.snake.speed().toFixed(0)}`;
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
      } else if (this.currentGameState === GameState.PostGameGameOver || this.currentGameState === GameState.PostGameEnterHighscore) {
        if (event.code === 'Enter') {
          this.goToMenuFromPostGame();
        }
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

      if (this.currentGameState === GameState.InGame) {
        if (event.touches.length > 0) {
          console.log(`Touch start: ${event.touches.item(0)?.clientX}, ${event.touches.item(0)?.clientY}`);
          const touchX = event.touches.item(0)?.clientX;
          const touchY = event.touches.item(0)?.clientY;

          if (touchX && touchY) {
            this.reactToTouchInput(touchX, touchY);
          }
        }
      }
    }, false);
  }

  private reactToTouchInput(touchX: number, touchY: number) {
    const squareRadius = 29;

    // Also take scaling into account
    touchX = touchX / this.renderContainer.scale.x;
    touchY = touchY / this.renderContainer.scale.y;

    this.touchZoneActions.forEach(element => {
      if ((element.x - squareRadius + this.renderContainerOffset.x < touchX) && (touchX < element.x + squareRadius + this.renderContainerOffset.x)
        && (element.y - squareRadius + this.renderContainerOffset.y < touchY) && (touchY < element.y + squareRadius + this.renderContainerOffset.y)) {
        this.game.onKeyDown(element.action);
      }
    });
  }

  private startGame() {
    this.cleanupMenu();
    if (this.gameScoreText) this.uiRenderGroup.addChild(this.gameScoreText);
    if (this.snakeSpeedText) this.uiRenderGroup.addChild(this.snakeSpeedText);
    this.currentGameState = GameState.InGame;
    sound.play('start-game');
    this.game.start();
  }

  private goToMenuFromPostGame() {
    if (this.needToAddHighscore) {
      let latestScore = this.game.snake.score;
      let highscores = this.highscores.get();
      if (highscores.length < 5 || (highscores.length > 0 && highscores[highscores.length - 1].score < latestScore)) {
        let newScore = new Score(latestScore, this.playerName);
        this.highscores.add(newScore);
      }
      this.needToAddHighscore = false;
    }

    this.cleanupHighscores();
    this.cleanupGame();
    this.showMenu();
    this.currentGameState = GameState.InMenu;
  }

  private cleanupMenu() {
    if (this.instructionsText) this.uiRenderGroup.removeChild(this.instructionsText);
    if (this.startGameButton) this.uiRenderGroup.removeChild(this.startGameButton);
    if (this.gameTitleText) this.uiRenderGroup.removeChild(this.gameTitleText);
    if (this.gameSubtitleText) this.uiRenderGroup.removeChild(this.gameSubtitleText);
    if (this.viewHighscoresButton) this.uiRenderGroup.removeChild(this.viewHighscoresButton);
  }

  private showMenu() {
    if (this.instructionsText) this.uiRenderGroup.addChild(this.instructionsText);
    if (this.startGameButton) this.uiRenderGroup.addChild(this.startGameButton);
    if (this.goBackToMenuButton) this.uiRenderGroup.removeChild(this.goBackToMenuButton);
    if (this.gameTitleText) this.uiRenderGroup.addChild(this.gameTitleText);
    if (this.gameSubtitleText) this.uiRenderGroup.addChild(this.gameSubtitleText);
    if (this.viewHighscoresButton) this.uiRenderGroup.addChild(this.viewHighscoresButton);
  }

  private showHighscores() {
    this.currentGameState = GameState.ViewHighscores;
    let highscores = this.highscores.get();
    let highscoresText = 'Highscores:\n';
    highscores.forEach((score, index) => {
      highscoresText += `${index + 1}. ${score.name}: ${score.score}\n`;
    });

    if (this.highscoresText) {
      this.highscoresText.text = highscoresText;
    }

    if (this.goBackToMenuButton) this.uiRenderGroup.addChild(this.goBackToMenuButton);
    if (this.highscoresText) this.uiRenderGroup.addChild(this.highscoresText);

    this.cleanupMenu();
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
    if (this.snakeSpeedText) this.uiRenderGroup.removeChild(this.snakeSpeedText);
  }

  private cleanupHighscores() {
    if (this.highscoresText) this.uiRenderGroup.removeChild(this.highscoresText);
    if (this.newHighscoreNameInput) this.uiRenderGroup.removeChild(this.newHighscoreNameInput);
  }

  private updateSnakeSprites(snake: Snake): Sprite[] {
    let sprites: Sprite[] = [];
    for (let i = 0; i < snake.body.length; i++) {
      let snakeSprite = new Sprite(this.snakeSheet.value().textures[this.snakeTextureNames[snake.body[i].type]]);
      snakeSprite.x = snake.body[i].x * this.CELL_SIZE;
      snakeSprite.y = snake.body[i].y * this.CELL_SIZE;
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
    bonusSprite.x = bonus.x * this.CELL_SIZE;
    bonusSprite.y = bonus.y * this.CELL_SIZE;
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
          bonusSprite.x = bonuses[i].x * this.CELL_SIZE;
          bonusSprite.y = bonuses[i].y * this.CELL_SIZE;
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
        obstacleSprite.x = obstacles[i].x * this.CELL_SIZE;
        obstacleSprite.y = obstacles[i].y * this.CELL_SIZE;
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
          critterSprite.x = critters[i].x * this.CELL_SIZE;
          critterSprite.y = critters[i].y * this.CELL_SIZE;
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


