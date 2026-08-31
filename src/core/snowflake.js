import { WORKER_PALETTE } from '../constants/palette.js';

// --- Snowflake Core Bitwise Logic ---

/**
 * Calculates bit masks, shifts, maximum values, and totals for a snowflake layout.
 */
export function calculateLimits(tsBits, seqBits, workerSegments) {
  const safeTsBits = Math.max(1, Math.min(55, parseInt(tsBits, 10) || 41));
  const safeSeqBits = Math.max(0, Math.min(32, parseInt(seqBits, 10) || 0));

  let workerTotalBits = 0;
  workerSegments.forEach((seg, idx) => {
    seg.color = WORKER_PALETTE[idx % WORKER_PALETTE.length];
    workerTotalBits += seg.bits;
  });

  const maxTs = (1n << BigInt(safeTsBits)) - 1n;
  const maxSeq = safeSeqBits > 0 ? (1n << BigInt(safeSeqBits)) - 1n : 0n;

  // Calculate shifts and masks from lowest (sequence) to highest (timestamp)
  let currentShift = BigInt(safeSeqBits);
  for (let i = workerSegments.length - 1; i >= 0; i--) {
    const seg = workerSegments[i];
    seg.shift = currentShift;
    seg.mask = seg.bits > 0 ? (1n << BigInt(seg.bits)) - 1n : 0n;
    currentShift += BigInt(seg.bits);
  }

  const tsShift = currentShift;
  const totalBits = 1 + safeTsBits + workerTotalBits + safeSeqBits;

  return {
    tsBits: safeTsBits,
    seqBits: safeSeqBits,
    workerTotalBits,
    maxTs,
    maxSeq,
    tsShift,
    totalBits
  };
}

/**
 * Encodes timestamp, worker segments, and sequence into a single BigInt Snowflake ID.
 */
export function encodeSnowflake({ ts, workerSegments, seqValue, limits }) {
  let id = (ts << limits.tsShift);
  for (const seg of workerSegments) {
    id |= (BigInt(seg.value || 0) & seg.mask) << seg.shift;
  }
  id |= (seqValue & limits.maxSeq);
  return id;
}

/**
 * Decodes a BigInt Snowflake ID into its timestamp, worker segments, and sequence.
 */
export function decodeSnowflake({ id, limits, workerSegments }) {
  const ts = (id >> limits.tsShift) & limits.maxTs;

  workerSegments.forEach(seg => {
    seg.value = (id >> seg.shift) & seg.mask;
  });

  const seq = id & limits.maxSeq;

  return { ts, seq };
}

/**
 * Randomizes the snowflake components (timestamp, worker segments, and sequence)
 * based on the limits.
 */
export function randomizeSnowflake({ limits, workerSegments }) {
  // Generate random BigInts within bounds
  const randomBigInt = (maxVal) => {
    if (maxVal === 0n) return 0n;
    // Math.random() gives 53 bits of precision which is enough for our max values
    // since we limit tsBits to 55 max, but we can combine two randoms for up to 64 bits just in case
    const high = BigInt(Math.floor(Math.random() * 0x100000000));
    const low = BigInt(Math.floor(Math.random() * 0x100000000));
    const random64 = (high << 32n) | low;
    return random64 % (maxVal + 1n);
  };

  const ts = randomBigInt(limits.maxTs);
  const seq = randomBigInt(limits.maxSeq);

  workerSegments.forEach(seg => {
    seg.value = randomBigInt(seg.mask);
  });

  return { ts, seq };
}
