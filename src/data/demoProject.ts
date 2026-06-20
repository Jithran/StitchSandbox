import { type PatternDocument } from '../model/types';
import demo from './demo.json';

// A ready-made demo seeded into the library for first-time visitors so they
// immediately see what's possible: a fox (quantized from an illustration) next
// to the Jantina Stitches logo (reconstructed from a chart made in this tool),
// on a single canvas, all in DMC floss colors.
export const DEMO_PROJECT = demo as unknown as PatternDocument;

/** Name used to detect whether the demo is already in the library. */
export const DEMO_NAME = DEMO_PROJECT.name;
