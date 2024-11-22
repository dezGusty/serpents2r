export class Score {
  constructor(public score: number, public name: string) { }
}

export class Highscores {
  private scores: Score[] = [];
  constructor() {
    const highscores = localStorage.getItem('highscores');
    if (highscores) {
      this.scores = JSON.parse(highscores);
    }
  }
  public add(score: Score) {
    this.scores.push(score);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 5);
    localStorage.setItem('highscores', JSON.stringify(this.scores));
  }
  public get() {
    return this.scores;
  }
}