import { Application, Sprite, Assets, Text, TextStyle, BitmapText, Spritesheet, AnimatedSprite } from 'pixi.js';
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

enum GameState {
  InMenu,
  InGame,
  PostGameGameOver
}

let currentGameState: GameState = GameState.InMenu;

// The application will create a renderer using WebGL, if possible,
// with a fallback to a canvas render. It will also setup the ticker
// and the root stage PIXI.Container
const app = new Application();


const bodyElement: Maybe<HTMLElement> = new Maybe<HTMLElement>(document.querySelector('body'));

// Wait for the Renderer to be available
await app.init({ background: '#102229', resizeTo: bodyElement.value() });

console.log('App started, size: ' + app.screen.width + 'x' + app.screen.height);

// const stats = new Stats(app.renderer);

// The application will create a canvas element for you that you
// can then insert into the DOM
document.body.appendChild(app.canvas);

const terrainSheet: Spritesheet = await Assets.load('terrainspritesheet.json');

// Store a dictionary of indices (1-5) to texture names (E.g. terrain_01.png)
const terrainTextureNames: string[] = [];
// The texture names are taken from object key properties in sheet.textures
for (let key in terrainSheet.textures) {
  terrainTextureNames.push(key);
}

const snakeSheet: Spritesheet = await Assets.load('snakesspritesheet.json');
const snakeTextureNames: string[] = [];
for (let key in snakeSheet.textures) {
  snakeTextureNames.push(key);
}

const bonusSheet: Spritesheet = await Assets.load('bonusspritesheet.json');
const bonusTextureNames: string[] = [];
for (let key in bonusSheet.textures) {
  bonusTextureNames.push(key);
}
let bonusSprites: Sprite[] = [];

const crittersSheet: Spritesheet = await Assets.load('crittersspritesheet.json');
const crittersTextureNames: string[] = [];
for (let key in crittersSheet.textures) {
  crittersTextureNames.push(key);
}
let crittersSprites: Sprite[] = [];

const obstaclesSheet: Spritesheet = await Assets.load('obstaclesspritesheet.json');
const obstaclesTextureNames: string[] = [];
for (let key in obstaclesSheet.textures) {
  obstaclesTextureNames.push(key);
}
let obstaclesSprites: Sprite[] = [];

// Generate the terrain map (randomly)
const maxTerrainCount = terrainTextureNames.length;

let gameMap: GameMap = new GameMap(28, 12);
for (let i = 0; i < gameMap.width; i++) {
  for (let j = 0; j < gameMap.height; j++) {
    gameMap.tiles[i][j] = Math.floor(Math.random() * maxTerrainCount);
    let gameSprite = new Sprite(terrainSheet.textures[terrainTextureNames[gameMap.tiles[i][j]]]);

    gameSprite.x = i * 32;
    gameSprite.y = j * 32;

    app.stage.addChild(gameSprite);
  }
}

await Assets.load('./GustysSerpentsFontL.xml');

const fpsText = new BitmapText({
  text: 'FPS: 0',
  style: {
    fontFamily: 'GustysSerpents',
    fontSize: 18,
    align: 'left',
  },
});

const gameSpeedText = new BitmapText({
  text: 'Speed: 1',
  style: {
    fontFamily: 'GustysSerpents',
    fontSize: 18,
    align: 'left',
  },
});


const style = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 18,
  fill: { color: '#ffffff', alpha: 1 },
  stroke: { color: '#4a1850', width: 5, join: 'round' },
});

const gameOverText = new BitmapText({
  text: 'Game Over!',
  style: {
    fontFamily: 'GustysSerpents',
    fontSize: 72,
    align: 'center',
  },
});

fpsText.x = 10;
fpsText.y = 10;
app.stage.addChild(fpsText);

gameSpeedText.x = 10;
gameSpeedText.y = 35;
app.stage.addChild(gameSpeedText);

gameOverText.x = 100;
gameOverText.y = 200;

const instructionsText = new Text({
  text: 'Press ENTER to start the game. Use the gamepad direction stick (or keyb. WASD) to move the snake',
  style,
});
instructionsText.x = 280;
instructionsText.y = 10;
app.stage.addChild(instructionsText);

const messagesText = new Text({
  text: '',
  style,
});
messagesText.x = 10;
messagesText.y = 60;
app.stage.addChild(messagesText);

const keyboardController = new KeyboardController(KeyboardControllerMode.Manual);
const gamepadController = new GamepadController();

let game: Game = new Game(gameMap, keyboardController, gamepadController);
game.onSnakeCollisionWithItself = () => {
  sound.play('snake-dead');
};
game.onSnakeCollisionWithObstacle = () => {
  sound.play('snake-dead');
};
game.onSnakePickupBonus = () => {
  sound.play('eat-bonus');
};
game.onSnakePickupCritter = () => {
  sound.play('eat-critter');
};

// if (GameState.InGame === currentGameState) {
//   startGame();
//   const snakeSprites = updateSnakeSprites(game.snake);
//   for (let i = 0; i < snakeSprites.length; i++) {
//     app.stage.addChild(snakeSprites[i]);
//   }
// } else 
if (currentGameState === GameState.InMenu) {
  messagesText.text = "Press ENTER to start the game.";
} else if (currentGameState === GameState.PostGameGameOver) {
  messagesText.text = "Game Over! Press ENTER to restart.";
}

// Add sounds
console.log('Loading sounds...');
await sound.add('game-over', 'game_over.ogg');
await sound.add('eat-bonus', 'drop_004.ogg');
await sound.add('start-game', 'ready.ogg');
await sound.add('snake-dead', 'error_008.ogg');
await sound.add('eat-critter', 'sfx_powerup.wav');

console.log('Loaded sounds...');

app.ticker.maxFPS = 60;

// Listen for frame updates
app.ticker.add((ticker) => {

  fpsText.text = `FPS: ${Math.round(ticker.FPS)}`;

  if (currentGameState === GameState.InGame) {
    if (game.update(ticker.deltaMS)) {
      updateSnakeInStage(game.snake);
      updateBonusesInStage(game.bonuses);
      updateObstaclesInStage(game.obstacles);
      updateCrittersInStage(game.critters);
    }

    if (!game.snake.alive) {
      currentGameState = GameState.PostGameGameOver;
      app.stage.addChild(gameOverText);
      sound.play('game-over');
    }
  }

  gameSpeedText.text = `Speed: ${game.snake.speed().toFixed(1)}, Length: ${game.snake.body.length}`;
});

window.addEventListener("gamepadconnected", (e) => {
  let message: string = `Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}. ${e.gamepad.buttons.length} buttons, ${e.gamepad.axes.length} axes.`;
  console.log(message);
  messagesText.text = message;
});

window.addEventListener("gamepaddisconnected", (e) => {
  let message: string = `Gamepad disconnected from index ${e.gamepad.index}: ${e.gamepad.id}`;
  console.log(message);
  messagesText.text = message;
});

document.addEventListener('keydown', (event) => {
  if (currentGameState === GameState.InGame) {
    // handled inside the Game class
    keyboardController.keydownHandler(event);
  } else if (currentGameState === GameState.InMenu) {
    if (event.code === 'Enter') {
      startGame();
    }
  } else if (currentGameState === GameState.PostGameGameOver) {
    // Any key => move to the menu
    cleanupGame();
    currentGameState = GameState.InMenu;

  }
});

document.addEventListener('keyup', (event) => {
  if (currentGameState === GameState.InGame) {
    // handled inside the Game class
    keyboardController.keyupHandler(event);
  }
});

function startGame() {
  currentGameState = GameState.InGame;
  sound.play('start-game');
  game.start();
}

function cleanupGame() {
  // clean-up the stage
  // clean-up for the snake
  const sprites = game.snake.sprites();
  for (let i = 0; i < sprites.length; i++) {
    app.stage.removeChild(sprites[i]);
  }

  // clean-up for the bonuses
  for (let i = 0; i < bonusSprites.length; i++) {
    app.stage.removeChild(bonusSprites[i]);
  }

  // clean-up for the obstacles
  for (let i = 0; i < obstaclesSprites.length; i++) {
    app.stage.removeChild(obstaclesSprites[i]);
  }

  // clean-up for the critters
  for (let i = 0; i < crittersSprites.length; i++) {
    app.stage.removeChild(crittersSprites[i]);
  }

  app.stage.removeChild(gameOverText);

}

function updateSnakeSprites(snake: Snake): Sprite[] {
  let sprites: Sprite[] = [];
  for (let i = 0; i < snake.body.length; i++) {
    let snakeSprite = new Sprite(snakeSheet.textures[snakeTextureNames[snake.body[i].type]]);
    snakeSprite.x = snake.body[i].x * 32;
    snakeSprite.y = snake.body[i].y * 32;
    sprites.push(snakeSprite);
    snake.body[i].sprite = Maybe.Some(snakeSprite);
  }
  return sprites;
}

function updateSnakeInStage(snake: Snake) {
  const oldSprites = snake.sprites();
  for (let i = 0; i < oldSprites.length; i++) {
    app.stage.removeChild(oldSprites[i]);
  }
  const snakeSprites = updateSnakeSprites(snake);
  for (let i = 0; i < snakeSprites.length; i++) {
    app.stage.addChild(snakeSprites[i]);
  }
}

function updateBonusesInStage(bonuses: Bonus[]) {
  for (let i = 0; i < bonusSprites.length; i++) {
    app.stage.removeChild(bonusSprites[i]);
  }

  bonusSprites = [];
  for (let i = 0; i < bonuses.length; i++) {
    const typeIndex = bonuses[i].type;
    if (typeIndex < bonusTextureNames.length) {
      let bonusSprite;
      if (bonuses[i].remainingLifetime < Bonus.WARNING_DURATION) {
        // Use AnimatedSprite if remaining lifetime is less than 2 seconds
        const textureName = "anim_" + bonusTextureNames[typeIndex];
        const textures = bonusSheet.animations[textureName];
        if (textures) {
          bonusSprite = new AnimatedSprite(textures);
          bonusSprite.animationSpeed = 2.0; // Adjust the animation speed as needed
          bonusSprite.play();
        } else {
          console.log(`No animation found for texture: ${textureName}`);
          bonusSprite = new Sprite(bonusSheet.textures[textureName]);
        }
      } else {
        // Use regular Sprite if remaining lifetime is 2 seconds or more
        bonusSprite = new Sprite(bonusSheet.textures[bonusTextureNames[typeIndex]]);
      }
      bonusSprite.x = bonuses[i].x * 32;
      bonusSprite.y = bonuses[i].y * 32;
      bonusSprites.push(bonusSprite);
    } else {
      console.log(`Invalid bonus type index: ${typeIndex}`);
    }
  }

  for (let i = 0; i < bonusSprites.length; i++) {
    app.stage.addChild(bonusSprites[i]);
  }
}

function updateObstaclesInStage(obstacles: Obstacle[]) {

  for (let i = 0; i < obstaclesSprites.length; i++) {
    app.stage.removeChild(obstaclesSprites[i]);
  }

  obstaclesSprites = [];
  for (let i = 0; i < obstacles.length; i++) {
    const typeIndex = obstacles[i].type;
    if (typeIndex < obstaclesTextureNames.length) {
      let obstacleSprite = new Sprite(obstaclesSheet.textures[obstaclesTextureNames[typeIndex]]);
      obstacleSprite.x = obstacles[i].x * 32;
      obstacleSprite.y = obstacles[i].y * 32;
      obstaclesSprites.push(obstacleSprite);
    } else {
      console.log(`Invalid obstacle type index: ${typeIndex}`);
    }
  }

  for (let i = 0; i < obstaclesSprites.length; i++) {
    app.stage.addChild(obstaclesSprites[i]);
  }
}

function updateCrittersInStage(critters: Critter[]) {
  for (let i = 0; i < crittersSprites.length; i++) {
    app.stage.removeChild(crittersSprites[i]);
  }

  crittersSprites = [];
  for (let i = 0; i < critters.length; i++) {
    const typeIndex = critters[i].type;
    if (typeIndex < crittersTextureNames.length) {
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
        let critterSprite = new Sprite(crittersSheet.textures[textureName]);
        critterSprite.x = critters[i].x * 32;
        critterSprite.y = critters[i].y * 32;
        crittersSprites.push(critterSprite);
      }
    } else {
      console.log(`Invalid critter type index: ${typeIndex}`);
    }
  }

  for (let i = 0; i < crittersSprites.length; i++) {
    app.stage.addChild(crittersSprites[i]);
  }
}