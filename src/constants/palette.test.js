import { describe, it, expect } from 'vitest';
import { WORKER_PALETTE } from './palette.js';

describe('WORKER_PALETTE', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(WORKER_PALETTE)).toBe(true);
    expect(WORKER_PALETTE.length).toBeGreaterThan(0);
  });

  it('should contain valid hex color strings', () => {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
    for (const color of WORKER_PALETTE) {
      expect(color).toMatch(hexColorRegex);
    }
  });

  it('should have 8 colors', () => {
    expect(WORKER_PALETTE.length).toBe(8);
  });

  it('should have all unique colors', () => {
    const unique = new Set(WORKER_PALETTE);
    expect(unique.size).toBe(WORKER_PALETTE.length);
  });
});
