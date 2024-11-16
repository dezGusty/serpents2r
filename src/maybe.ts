export class Maybe<T> {
  constructor(private data?: T | null) {
  }

  public hasData(): boolean {
    return this.data !== undefined && this.data !== null;
  }

  public value(): T {
    if (this.hasData()) {
      return this.data as T;
    } else {
      throw new Error('No data');
    }
  }
};

export namespace Maybe {

  export function Some<T>(data: T): Maybe<T> {
    return new Maybe<T>(data);
  }

  export function None<T>(): Maybe<T> {
    return new Maybe<T>(undefined);
  }
}