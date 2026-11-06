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

  it('should keep white text at WCAG AA contrast on every color', () => {
    for (const color of WORKER_PALETTE) {
      expect(contrastWithWhite(color)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

function contrastWithWhite(hex) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (luminance + 0.05);
}
