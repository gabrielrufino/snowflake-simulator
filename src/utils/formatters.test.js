import { describe, it, expect } from 'vitest';
import { formatTimestampDate, getEpochMs, formatEpochPreview, formatLifespan } from './formatters.js';

describe('getEpochMs', () => {
  it('should return the UTC milliseconds for a valid date string', () => {
    const result = getEpochMs('2010-11-04');
    const expected = BigInt(Date.UTC(2010, 10, 4)); // month is 0-indexed
    expect(result).toBe(expected);
  });

  it('should return 0n for an empty string', () => {
    expect(getEpochMs('')).toBe(0n);
  });

  it('should return 0n for null/undefined', () => {
    expect(getEpochMs(null)).toBe(0n);
    expect(getEpochMs(undefined)).toBe(0n);
  });

  it('should return 0n for a malformed date string', () => {
    expect(getEpochMs('not-a-date')).toBe(0n);
    expect(getEpochMs('2024-13')).toBe(0n);
    expect(getEpochMs('abc-def-ghi')).toBe(0n);
  });

  it('should handle the Unix epoch correctly', () => {
    const result = getEpochMs('1970-01-01');
    expect(result).toBe(0n);
  });

  it('should handle a date in the future', () => {
    const result = getEpochMs('2050-06-15');
    const expected = BigInt(Date.UTC(2050, 5, 15));
    expect(result).toBe(expected);
  });
});

describe('formatTimestampDate', () => {
  it('should return "Invalid date" for negative timestamps', () => {
    expect(formatTimestampDate(-1n)).toBe('Invalid date');
  });

  it('should return "Out of date range" for timestamps beyond JS Date range', () => {
    expect(formatTimestampDate(8640000000000001n)).toBe('Out of date range');
  });

  it('should format timestamp 0 as the Unix epoch', () => {
    const result = formatTimestampDate(0n);
    // Should contain UTC representation of Jan 1, 1970
    expect(result).toContain('1970-01-01');
    expect(result).toContain('UTC');
  });

  it('should format a known timestamp correctly', () => {
    // 2024-01-01T00:00:00.000Z = 1704067200000
    const result = formatTimestampDate(1704067200000n);
    expect(result).toContain('2024-01-01');
    expect(result).toContain('UTC');
  });

  it('should include both local and UTC representations separated by •', () => {
    const result = formatTimestampDate(1704067200000n);
    expect(result).toContain('•');
  });
});

describe('formatEpochPreview', () => {
  it('should format the epoch preview with ms value and UTC date', () => {
    const epochMs = BigInt(Date.UTC(2010, 10, 4)); // Twitter epoch
    const result = formatEpochPreview(epochMs);
    expect(result).toContain('ms');
    expect(result).toContain('2010-11-04');
    expect(result).toContain('UTC');
  });

  it('should format epoch 0 as Unix epoch', () => {
    const result = formatEpochPreview(0n);
    expect(result).toContain('0 ms');
    expect(result).toContain('1970-01-01');
  });
});

describe('formatLifespan', () => {
  it('should format very large ms values in years', () => {
    const oneYearMs = 1000n * 60n * 60n * 24n * 365n;
    const result = formatLifespan(oneYearMs * 100n);
    expect(result).toContain('years');
    expect(result).toContain('lifespan');
  });

  it('should format values >= 1 year with one decimal place', () => {
    // ~2 years
    const twoYearsMs = BigInt(Math.round(1000 * 60 * 60 * 24 * 365.2425 * 2));
    const result = formatLifespan(twoYearsMs);
    expect(result).toMatch(/~2\.0 years lifespan/);
  });

  it('should format values >= 100 years as rounded integers', () => {
    const manyYearsMs = BigInt(Math.round(1000 * 60 * 60 * 24 * 365.2425 * 150));
    const result = formatLifespan(manyYearsMs);
    expect(result).toContain('years');
    // Should be rounded, not decimal
    expect(result).not.toMatch(/\.\d+ years/);
  });

  it('should format values < 1 year but >= 1 day in days', () => {
    const fiveDaysMs = 1000n * 60n * 60n * 24n * 5n;
    const result = formatLifespan(fiveDaysMs);
    expect(result).toContain('days');
    expect(result).toContain('lifespan');
  });

  it('should format values < 1 day in hours', () => {
    const threeHoursMs = 1000n * 60n * 60n * 3n;
    const result = formatLifespan(threeHoursMs);
    expect(result).toContain('hours');
    expect(result).toContain('lifespan');
    expect(result).toMatch(/~3\.0 hours/);
  });

  it('should format very small values in hours', () => {
    const result = formatLifespan(1000n); // 1 second
    expect(result).toContain('hours');
  });
});
