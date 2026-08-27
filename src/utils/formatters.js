// --- Date & Formatting Utilities ---

export function formatTimestampDate(tsBigInt) {
  if (tsBigInt < 0n) return "Invalid date";
  if (tsBigInt > 8640000000000000n) return "Out of date range";
  try {
    const ms = Number(tsBigInt);
    const date = new Date(ms);
    if (isNaN(date.getTime())) return "Invalid date";
    
    const localFormatted = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(date);
    
    const utcFormatted = date.toISOString().replace('T', ' ').replace('Z', ' UTC');
    return `${localFormatted} • ${utcFormatted}`;
  } catch {
    return "Invalid date";
  }
}

export function getEpochMs(dateString) {
  if (!dateString) return 0n;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 0n;
  const [year, month, day] = parts;
  return BigInt(Date.UTC(year, month - 1, day));
}

export function formatEpochPreview(epochVal) {
  try {
    const ms = Number(epochVal);
    const date = new Date(ms);
    if (isNaN(date.getTime())) return "Invalid date";
    const utcFormatted = date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
    return `${epochVal.toString()} ms • ${utcFormatted}`;
  } catch {
    return `${epochVal.toString()} ms`;
  }
}

export function formatLifespan(maxTsMs) {
  const years = Number(maxTsMs) / (1000 * 60 * 60 * 24 * 365.2425);
  if (years >= 1) {
    return `~${years >= 100 ? Math.round(years).toLocaleString() : years.toFixed(1)} years lifespan`;
  }
  const days = Number(maxTsMs) / (1000 * 60 * 60 * 24);
  if (days >= 1) {
    return `~${days.toFixed(1)} days lifespan`;
  }
  const hours = Number(maxTsMs) / (1000 * 60 * 60);
  return `~${hours.toFixed(1)} hours lifespan`;
}
