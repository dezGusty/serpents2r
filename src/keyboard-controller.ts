// Map keyboard key codes to controller's state keys


export interface KeyState {
  pressed: boolean;
  doubleTap: boolean;
  timestamp: number;
  pushed: boolean; // pressed and released
}

export enum KeyboardControllerMode {
  Auto = 0,
  Manual = 1,
}

// Class for handling keyboard inputs.
export class KeyboardController {

  public keys: Record<string, KeyState> = {
    'up': { pressed: false, doubleTap: false, timestamp: 0, pushed: false },
    'left': { pressed: false, doubleTap: false, timestamp: 0, pushed: false },
    'down': { pressed: false, doubleTap: false, timestamp: 0, pushed: false },
    'right': { pressed: false, doubleTap: false, timestamp: 0, pushed: false },
    'space': { pressed: false, doubleTap: false, timestamp: 0, pushed: false },
    'speed-up': { pressed: false, doubleTap: false, timestamp: 0, pushed: false },
    'speed-down': { pressed: false, doubleTap: false, timestamp: 0, pushed: false },
  };

  public keyMap: Record<string, string> = {
    'Space': 'space',
    'KeyW': 'up',
    'ArrowUp': 'up',
    'KeyA': 'left',
    'ArrowLeft': 'left',
    'KeyS': 'down',
    'ArrowDown': 'down',
    'KeyD': 'right',
    'ArrowRight': 'right',
    'NumpadAdd': 'speed-up',
    'NumpadSubtract': 'speed-down',
  };

  public onKeyDown(_action: string) { }

  constructor(public startMode: KeyboardControllerMode = KeyboardControllerMode.Auto) {
    if (startMode === KeyboardControllerMode.Auto) {
      // Register event listeners for akeydown and keyup events.
      window.addEventListener('keydown', (event) => this.keydownHandler(event));
      window.addEventListener('keyup', (event) => this.keyupHandler(event));
    }
  }

  public popKeyState(key: string): KeyState {
    const state = this.keys[key];
    this.keys[key].pushed = false;
    return state;
  }

  public keydownHandler(event: KeyboardEvent) {
    const key = this.keyMap[event.code];
    if (!key) {
      return;
    }

    this.onKeyDown(key);
    const now = Date.now();

    // If not already in the double-tap state, toggle the double tap state if the key was pressed twice within 300ms.
    this.keys[key].doubleTap = this.keys[key].doubleTap || now - this.keys[key].timestamp < 100;

    // Toggle on the key pressed state.
    this.keys[key].pressed = true;
  }

  public keyupHandler(event: KeyboardEvent) {
    const key = this.keyMap[event.code];
    if (!key) {
      return;
    }
    // Toggle off the key pressed state.
    this.keys[key].pressed = false;
    this.keys[key].pushed = true;
    // Update the timestamp for the key.
    this.keys[key].timestamp = Date.now();
    if (this.keys[key].doubleTap) this.keys[key].doubleTap = false;
  }
}