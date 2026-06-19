export class HistoryStack<T> {
  private past: T[] = [];
  private future: T[] = [];
  private limit: number;

  constructor(limit = 50) {
    this.limit = limit;
  }

  push(state: Readonly<T>): void {
    this.past.push(JSON.parse(JSON.stringify(state)));
    this.future = [];
    if (this.past.length > this.limit) this.past.shift();
  }

  undo(current: Readonly<T>): { snapshot: T | null; changed: boolean } {
    if (this.past.length === 0) return { snapshot: null, changed: false };
    this.future.push(JSON.parse(JSON.stringify(current)));
    return { snapshot: this.past.pop() as T, changed: true };
  }

  redo(current: Readonly<T>): { snapshot: T | null; changed: boolean } {
    if (this.future.length === 0) return { snapshot: null, changed: false };
    this.past.push(JSON.parse(JSON.stringify(current)));
    return { snapshot: this.future.pop() as T, changed: true };
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
