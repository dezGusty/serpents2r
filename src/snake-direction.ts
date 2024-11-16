export enum SnakeDirection {
  up = 0,
  left = 1,
  down = 2,
  right = 3,
  none = 4
}

export function getOppositeDirection(direction: SnakeDirection): SnakeDirection {
  switch (direction) {
    case SnakeDirection.up:
      return SnakeDirection.down;
    case SnakeDirection.down:
      return SnakeDirection.up;
    case SnakeDirection.left:
      return SnakeDirection.right;
    case SnakeDirection.right:
      return SnakeDirection.left;
    default:
      return SnakeDirection.none;
  }
}

export namespace SnakeDirection {
  export function opposite(direction: SnakeDirection): SnakeDirection {
    return getOppositeDirection(direction);
  }

  export function deltaX(direction: SnakeDirection): number {
    switch (direction) {
      case SnakeDirection.left:
        return -1;
      case SnakeDirection.right:
        return 1;
      default:
        return 0;
    }
  }

  export function deltaY(direction: SnakeDirection): number {
    switch (direction) {
      case SnakeDirection.up:
        return -1;
      case SnakeDirection.down:
        return 1;
      default:
        return 0;
    }
  }

  export function toString(direction: SnakeDirection): string {
    switch (direction) {
      case SnakeDirection.up:
        return 'up';
      case SnakeDirection.down:
        return 'down';
      case SnakeDirection.left:
        return 'left';
      case SnakeDirection.right:
        return 'right';
      default:
        return 'none';
    }
  }
}