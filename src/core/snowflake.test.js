import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { calculateLimits, encodeSnowflake, decodeSnowflake, randomizeSnowflake } from './snowflake.js';

/**
 * Helper: creates a minimal worker segment for testing.
 */
function makeSegment(name, bits, value = 0n) {
  return { id: `w_${name}`, name, bits, value };
}

describe('calculateLimits', () => {
  it('should compute correct limits for a standard Twitter Snowflake layout (41/10/12)', () => {
    const workers = [makeSegment('Worker', 10)];
    const limits = calculateLimits(41, 12, workers);

    expect(limits.tsBits).toBe(41);
    expect(limits.seqBits).toBe(12);
    expect(limits.workerTotalBits).toBe(10);
    expect(limits.totalBits).toBe(64); // 1 sign + 41 + 10 + 12
    expect(limits.maxTs).toBe((1n << 41n) - 1n);
    expect(limits.maxSeq).toBe((1n << 12n) - 1n);
  });

  it('should clamp tsBits to range [1, 55]', () => {
    const workers = [makeSegment('W', 5)];
    // parseInt(0) is 0, which is falsy, so fallback to 41
    expect(calculateLimits(0, 0, workers).tsBits).toBe(41);
    // parseInt(-10) is -10 (truthy), clamped by max(1, min(55, -10)) => 1
    expect(calculateLimits(-10, 0, workers).tsBits).toBe(1);
    // parseInt(100) is 100 (truthy), clamped by max(1, min(55, 100)) => 55
    expect(calculateLimits(100, 0, workers).tsBits).toBe(55);
  });

  it('should clamp seqBits to range [0, 32]', () => {
    const workers = [makeSegment('W', 5)];
    expect(calculateLimits(41, -5, workers).seqBits).toBe(0);
    expect(calculateLimits(41, 50, workers).seqBits).toBe(32);
  });

  it('should fall back to defaults for NaN inputs', () => {
    const workers = [makeSegment('W', 5)];
    const limits = calculateLimits('abc', 'xyz', workers);
    expect(limits.tsBits).toBe(41);
    expect(limits.seqBits).toBe(0);
  });

  it('should assign colors from palette to worker segments', () => {
    const workers = [makeSegment('A', 5), makeSegment('B', 5)];
    calculateLimits(41, 12, workers);

    expect(workers[0].color).toBeDefined();
    expect(workers[1].color).toBeDefined();
    expect(workers[0].color).not.toBe(workers[1].color);
  });

  it('should compute shifts and masks for multiple worker segments', () => {
    const workers = [makeSegment('A', 5), makeSegment('B', 3)];
    const limits = calculateLimits(41, 12, workers);

    // Sequence occupies lowest 12 bits (shift = 0)
    // Worker B: 3 bits at shift 12
    // Worker A: 5 bits at shift 15
    // Timestamp: starts at shift 20
    expect(workers[1].shift).toBe(12n);
    expect(workers[1].mask).toBe(0b111n);
    expect(workers[0].shift).toBe(15n);
    expect(workers[0].mask).toBe(0b11111n);
    expect(limits.tsShift).toBe(20n);
  });

  it('should handle seqBits = 0 with maxSeq = 0', () => {
    const workers = [makeSegment('W', 10)];
    const limits = calculateLimits(41, 0, workers);
    expect(limits.maxSeq).toBe(0n);
    expect(limits.seqBits).toBe(0);
  });

  it('should handle a single worker with 0 bits', () => {
    const workers = [makeSegment('W', 0)];
    const limits = calculateLimits(41, 12, workers);
    expect(limits.workerTotalBits).toBe(0);
    expect(workers[0].mask).toBe(0n);
  });
});

describe('randomizeSnowflake', () => {
  it('should randomize ts, seq, and worker segment values within their limits', () => {
    const workers = [makeSegment('A', 5), makeSegment('B', 10)];
    const limits = calculateLimits(41, 12, workers);

    // We mock Math.random so that high & low are predictable
    // First random gives high, second gives low

    // Spy and return values that would result in max values
    let callCount = 0;
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      return 0.9999999999;
    });

    const result = randomizeSnowflake({ limits, workerSegments: workers });

    // The logic is random64 % (maxVal + 1n), so the remainder will be maxVal if the random value is large enough
    // It should be within bounds and the mock ensures we test bounds
    expect(result.ts).toBeLessThanOrEqual(limits.maxTs);
    expect(result.seq).toBeLessThanOrEqual(limits.maxSeq);
    expect(workers[0].value).toBeLessThanOrEqual(workers[0].mask);
    expect(workers[1].value).toBeLessThanOrEqual(workers[1].mask);

    // Ensure the returned seq and ts are correct according to the limits
    // Since random64 % (max + 1) -> we know it won't exceed max. We also test for lower bound.
    expect(result.ts).toBeGreaterThanOrEqual(0n);
    expect(result.seq).toBeGreaterThanOrEqual(0n);

    randomSpy.mockRestore();
  });

  it('should handle maxVal of 0 gracefully', () => {
    const workers = [makeSegment('A', 0)];
    const limits = calculateLimits(41, 0, workers);

    const result = randomizeSnowflake({ limits, workerSegments: workers });

    expect(result.seq).toBe(0n);
    expect(workers[0].value).toBe(0n);
  });
});

describe('encodeSnowflake', () => {
  it('should encode a standard snowflake with known values', () => {
    const workers = [makeSegment('Worker', 10, 42n)];
    const limits = calculateLimits(41, 12, workers);
    const ts = 1000n;
    const seq = 7n;

    const id = encodeSnowflake({ ts, workerSegments: workers, seqValue: seq, limits });

    // Manual computation:
    // id = (ts << 22) | (worker << 12) | seq
    const expected = (1000n << 22n) | (42n << 12n) | 7n;
    expect(id).toBe(expected);
  });

  it('should encode 0 for all-zero inputs', () => {
    const workers = [makeSegment('W', 10, 0n)];
    const limits = calculateLimits(41, 12, workers);
    const id = encodeSnowflake({ ts: 0n, workerSegments: workers, seqValue: 0n, limits });
    expect(id).toBe(0n);
  });

  it('should encode maximum values correctly', () => {
    const workers = [makeSegment('W', 10, 1023n)]; // 2^10 - 1
    const limits = calculateLimits(41, 12, workers);
    const id = encodeSnowflake({
      ts: limits.maxTs,
      workerSegments: workers,
      seqValue: limits.maxSeq,
      limits,
    });

    const expected = (limits.maxTs << 22n) | (1023n << 12n) | limits.maxSeq;
    expect(id).toBe(expected);
  });

  it('should encode multiple worker segments', () => {
    const workers = [makeSegment('A', 5, 31n), makeSegment('B', 5, 15n)];
    const limits = calculateLimits(41, 12, workers);
    const ts = 500n;
    const seq = 3n;

    const id = encodeSnowflake({ ts, workerSegments: workers, seqValue: seq, limits });

    // Workers: A at shift 17 (12+5), B at shift 12
    const expected = (500n << 22n) | (31n << 17n) | (15n << 12n) | 3n;
    expect(id).toBe(expected);
  });

  it('should mask worker values that exceed their bit width', () => {
    const workers = [makeSegment('W', 3, 255n)]; // 255 is 0xFF, mask for 3 bits is 0b111 = 7
    const limits = calculateLimits(41, 12, workers);
    const id = encodeSnowflake({ ts: 0n, workerSegments: workers, seqValue: 0n, limits });

    // 255 & 7 = 7
    const expected = 7n << 12n;
    expect(id).toBe(expected);
  });
});

describe('decodeSnowflake', () => {
  it('should decode a snowflake back to original components', () => {
    const workers = [makeSegment('Worker', 10, 0n)];
    const limits = calculateLimits(41, 12, workers);

    const ts = 12345n;
    const seq = 42n;
    const workerVal = 100n;
    workers[0].value = workerVal;

    const id = encodeSnowflake({ ts, workerSegments: workers, seqValue: seq, limits });
    const decoded = decodeSnowflake({ id, limits, workerSegments: workers });

    expect(decoded.ts).toBe(ts);
    expect(decoded.seq).toBe(seq);
    expect(workers[0].value).toBe(workerVal);
  });

  it('should round-trip encode/decode with all zeros', () => {
    const workers = [makeSegment('W', 10, 0n)];
    const limits = calculateLimits(41, 12, workers);

    const id = encodeSnowflake({ ts: 0n, workerSegments: workers, seqValue: 0n, limits });
    const decoded = decodeSnowflake({ id, limits, workerSegments: workers });

    expect(decoded.ts).toBe(0n);
    expect(decoded.seq).toBe(0n);
    expect(workers[0].value).toBe(0n);
  });

  it('should round-trip encode/decode with max values', () => {
    const workers = [makeSegment('W', 10, 1023n)];
    const limits = calculateLimits(41, 12, workers);

    const id = encodeSnowflake({
      ts: limits.maxTs,
      workerSegments: workers,
      seqValue: limits.maxSeq,
      limits,
    });

    const decoded = decodeSnowflake({ id, limits, workerSegments: workers });

    expect(decoded.ts).toBe(limits.maxTs);
    expect(decoded.seq).toBe(limits.maxSeq);
    expect(workers[0].value).toBe(1023n);
  });

  it('should round-trip encode/decode with multiple worker segments', () => {
    const workers = [makeSegment('A', 5, 20n), makeSegment('B', 5, 10n)];
    const limits = calculateLimits(41, 12, workers);

    const ts = 999999n;
    const seq = 4095n;

    const id = encodeSnowflake({ ts, workerSegments: workers, seqValue: seq, limits });
    const decoded = decodeSnowflake({ id, limits, workerSegments: workers });

    expect(decoded.ts).toBe(ts);
    expect(decoded.seq).toBe(seq);
    expect(workers[0].value).toBe(20n);
    expect(workers[1].value).toBe(10n);
  });

  it('should decode a known snowflake ID', () => {
    const workers = [makeSegment('W', 10, 0n)];
    const limits = calculateLimits(41, 12, workers);

    // Construct a known ID: ts=1000, worker=42, seq=7
    const knownId = (1000n << 22n) | (42n << 12n) | 7n;
    const decoded = decodeSnowflake({ id: knownId, limits, workerSegments: workers });

    expect(decoded.ts).toBe(1000n);
    expect(decoded.seq).toBe(7n);
    expect(workers[0].value).toBe(42n);
  });
});
