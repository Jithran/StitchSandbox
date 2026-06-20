import { type PatternDocument } from '../model/types';
import raw from './demo-fox.json';

// A ready-made fox pattern seeded into the library for first-time visitors, so
// they immediately see what a finished design looks like. Generated from a fox
// illustration, quantized to DMC floss colors.
export const DEMO_PROJECT = raw as unknown as PatternDocument;
