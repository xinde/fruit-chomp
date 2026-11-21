export const capacity = 5;
export const departure = 1.13;
export const duration = 60;

export class Round {
  score = 0;
  streak = 0;
  hits = 0;
  fullness = 0;
  elapsed = 0;
  nextDrop = 0;
  flights = [];

  get full() { return this.fullness === capacity; }

  advance(delta, makeItem) {
    this.elapsed = Math.min(duration, this.elapsed + delta);
    if (this.elapsed >= duration) return;
    this.flights = this.flights.filter(flight => {
      flight.progress = (this.elapsed - flight.start) / flight.duration;
      if (flight.progress <= departure) return true;
      if (flight.item.type !== "bomb") this.streak = 0;
      return false;
    });
    if (this.elapsed >= this.nextDrop && this.flights.length < 4) {
      this.flights.push({
        item: makeItem(), start: this.elapsed, progress: 0,
        duration: 2.95 - .35 * this.elapsed / duration
      });
      this.nextDrop = this.elapsed + .82 + Math.random() * .38;
    }
  }

  awardFruit() {
    this.hits++;
    this.streak++;
    const points = 10 + Math.min(5, Math.floor(this.streak / 3)) * 5;
    this.score += points;
    return points;
  }

  bite(flight) {
    const index = this.flights.indexOf(flight);
    if (index < 0) return 0;
    this.flights.splice(index, 1);
    if (flight.item.type === "bomb") {
      this.streak = 0;
      this.score -= 20;
      return -20;
    }
    this.fullness = Math.min(capacity, this.fullness + 1);
    return this.awardFruit();
  }

  feast() {
    if (!this.full) return null;
    const fruits = this.flights.filter(flight => flight.item.type !== "bomb");
    if (!fruits.length) return null;
    this.flights = this.flights.filter(flight => flight.item.type === "bomb");
    this.fullness = 0;
    const before = this.score;
    for (let i=0; i<fruits.length; i++) this.awardFruit();
    return { fruits, points: this.score - before };
  }
}
