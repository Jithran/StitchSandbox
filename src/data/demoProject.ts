import { type PatternDocument } from '../model/types';
import fox from './demo-fox.json';
import logo from './demo-jslogo.json';

// Ready-made patterns seeded into the library for first-time visitors so they
// immediately see what finished designs look like. The fox was generated from a
// fox illustration; the logo was reconstructed from a chart made in this tool.
// Both are quantized to / built from DMC floss colors.
export const DEMO_FOX = fox as unknown as PatternDocument;
export const DEMO_LOGO = logo as unknown as PatternDocument;
