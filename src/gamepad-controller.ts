
export enum GamepadInput4x {
  AxisUp,
  AxisDown,
  AxisLeft,
  AxisRight,
}

export class GamepadController {

  public GamepadController() {
    window.addEventListener('gamepadconnected', (event) => this.gamepadConnected(event));
    window.addEventListener('gamepaddisconnected', (event) => this.gamepadDisconnected(event));
  }

  public isDirectionPressed(direction: GamepadInput4x): boolean {
    const gamepads = navigator.getGamepads();
    if (gamepads) {
      const gp = gamepads[0];
      if (gp) {
        if (gp.axes[0] > 0.5 && direction === GamepadInput4x.AxisRight) {
          return true;
        }
        if (gp.axes[0] < -0.5 && direction === GamepadInput4x.AxisLeft) {
          return true;
        }
        if (gp.axes[1] > 0.5 && direction === GamepadInput4x.AxisDown) {
          return true;
        }
        if (gp.axes[1] < -0.5 && direction === GamepadInput4x.AxisUp) {
          return true
        }
        if (gp.buttons.length >= 15) {
          if (gp.buttons[12].pressed && direction === GamepadInput4x.AxisUp) {
            return true;
          }
          if (gp.buttons[13].pressed && direction === GamepadInput4x.AxisDown) {
            return true;
          }
          if (gp.buttons[14].pressed && direction === GamepadInput4x.AxisLeft) {
            return true;
          }
          if (gp.buttons[15].pressed && direction === GamepadInput4x.AxisRight) {
            return true;
          }
        }
      }
    }
    return false;
  }

  gamepadConnected(event: GamepadEvent) {
    console.log(`Gamepad connected at index ${event.gamepad.index}: ${event.gamepad.id}. ${event.gamepad.buttons.length} buttons, ${event.gamepad.axes.length} axes.`);
  }

  gamepadDisconnected(event: GamepadEvent) {
    console.log(`Gamepad disconnected from index ${event.gamepad.index}: ${event.gamepad.id}`);
  }
}