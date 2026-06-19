import { type PatternDocument } from './types';
import { clone } from './document';

/**
 * Snapshot-based undo/redo. One entry per editing gesture (e.g. a full
 * click-drag stroke), kept small enough for grids in the thousands of cells.
 */
export class History {
  private past: PatternDocument[] = [];
  private future: PatternDocument[] = [];
  private readonly limit: number;

  constructor(limit = 100) {
    this.limit = limit;
  }

  /** Record the state as it was *before* the change about to be applied. */
  push(before: PatternDocument): void {
    this.past.push(clone(before));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(current: PatternDocument): PatternDocument | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(clone(current));
    return prev;
  }

  redo(current: PatternDocument): PatternDocument | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(clone(current));
    return next;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
