// --- Theme Management ---
const themeButtons = document.querySelectorAll('.theme-btn');
const systemMedia = window.matchMedia('(prefers-color-scheme: dark)');

function getSavedTheme() {
  return localStorage.getItem('snowflake_theme') || 'system';
}

function applyTheme(theme) {
  const isDark = theme === 'system' ? systemMedia.matches : theme === 'dark';
  
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme-setting', theme);
  
  themeButtons.forEach(btn => {
    const isActive = btn.dataset.themeValue === theme;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-checked', isActive.toString());
  });
}

function setTheme(theme) {
  localStorage.setItem('snowflake_theme', theme);
  applyTheme(theme);
}

themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    setTheme(btn.dataset.themeValue);
  });
});

systemMedia.addEventListener('change', () => {
  if (getSavedTheme() === 'system') {
    applyTheme('system');
  }
});

// Initialize Theme
applyTheme(getSavedTheme());

// --- Simulator & Decoder Logic ---
const epochInput = document.getElementById('epoch');
const readableEpochEl = document.getElementById('readable-epoch');
const presetButtons = document.querySelectorAll('.preset-btn');
const tsInput = document.getElementById('timestamp');
const btnNow = document.getElementById('btn-now');
const readableDateEl = document.getElementById('readable-date');
const workerInput = document.getElementById('worker');
const seqInput = document.getElementById('sequence');
const workerValEl = document.getElementById('worker-value');
const seqValEl = document.getElementById('sequence-value');
const bitsContainer = document.getElementById('bits-container');
const finalIdInput = document.getElementById('final-id');
const btnCopy = document.getElementById('btn-copy');
const copyText = document.getElementById('copy-text');

function formatTimestampDate(tsBigInt) {
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

function updateEpochPreview() {
  const epochVal = BigInt(epochInput.value || 0);
  if (readableEpochEl) {
    readableEpochEl.textContent = formatTimestampDate(epochVal);
  }
  
  // Highlight matching preset button
  presetButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.epoch === epochInput.value.trim());
  });
}

presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    epochInput.value = btn.dataset.epoch;
    updateEpochPreview();
    updateSimulator();
  });
});

epochInput.addEventListener('input', () => {
  updateEpochPreview();
  updateSimulator();
});

if (btnNow) {
  btnNow.addEventListener('click', () => {
    const currentMs = BigInt(Date.now());
    const epoch = BigInt(epochInput.value || 0);
    let offset = currentMs - epoch;
    if (offset < 0n) offset = 0n;
    if (offset > 2199023255551n) offset = 2199023255551n;
    tsInput.value = offset.toString();
    updateSimulator();
  });
}

if (btnCopy && finalIdInput) {
  btnCopy.addEventListener('click', async () => {
    const textToCopy = finalIdInput.value;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      finalIdInput.select();
      document.execCommand('copy');
    }
    if (copyText) {
      copyText.textContent = 'Copied!';
      setTimeout(() => {
        copyText.textContent = 'Copy';
      }, 1500);
    }
  });
}

// Creates the 64 divs representing the bits
const bitElements = [];
for (let i = 0; i < 64; i++) {
  const el = document.createElement('div');
  el.className = 'bit';
  // Applies the correct classes according to position
  if (i === 0) el.classList.add('sign');
  else if (i >= 1 && i <= 41) el.classList.add('time');
  else if (i >= 42 && i <= 51) el.classList.add('worker');
  else el.classList.add('seq');
  
  el.textContent = '0';
  bitsContainer.appendChild(el);
  bitElements.push(el);
}

// Previous state variables for animation
let prevTsBin = "", prevWorkerBin = "", prevSeqBin = "";

function updateBitsUI(ts, worker, seq) {
  // Converts to binary string padded with leading zeros
  const tsBin = ts.toString(2).padStart(41, '0');
  const workerBin = worker.toString(2).padStart(10, '0');
  const seqBin = seq.toString(2).padStart(12, '0');

  // Updates the UI and applies highlight effect where changes occurred
  bitElements[0].textContent = '0'; // Sign bit is always 0
  
  for (let i = 0; i < 41; i++) {
    updateBit(bitElements[i + 1], tsBin[i], prevTsBin[i]);
  }
  for (let i = 0; i < 10; i++) {
    updateBit(bitElements[i + 42], workerBin[i], prevWorkerBin[i]);
  }
  for (let i = 0; i < 12; i++) {
    updateBit(bitElements[i + 52], seqBin[i], prevSeqBin[i]);
  }

  // Saves state for the next animation
  prevTsBin = tsBin;
  prevWorkerBin = workerBin;
  prevSeqBin = seqBin;
}

// Encode: Controls -> Decimal ID + Bits
function updateSimulator() {
  const epoch = BigInt(epochInput.value || 0);
  let ts = BigInt(tsInput.value || 0);
  let worker = BigInt(workerInput.value || 0);
  let seq = BigInt(seqInput.value || 0);

  // Applies size limits for 41-bit offset
  if (ts > 2199023255551n) { ts = 2199023255551n; tsInput.value = ts.toString(); }
  if (worker > 1023n) { worker = 1023n; workerInput.value = worker.toString(); }
  if (seq > 4095n) { seq = 4095n; seqInput.value = seq.toString(); }

  // Update value badges and absolute date preview
  if (workerValEl) workerValEl.textContent = worker.toString();
  if (seqValEl) seqValEl.textContent = seq.toString();
  if (readableDateEl) readableDateEl.textContent = formatTimestampDate(epoch + ts);

  // The Snowflake Magic: Combines everything using Shift (<<) and OR (|)
  const id = (ts << 22n) | (worker << 12n) | seq;
  
  if (document.activeElement !== finalIdInput) {
    finalIdInput.value = id.toString();
  }

  updateBitsUI(ts, worker, seq);
}

// Decode: Decimal ID -> Controls + Bits
function decodeSnowflakeId() {
  const epoch = BigInt(epochInput.value || 0);
  const rawVal = finalIdInput.value.trim().replace(/\D/g, '');
  if (rawVal !== finalIdInput.value.trim()) {
    finalIdInput.value = rawVal;
  }

  let id = 0n;
  try {
    id = rawVal ? BigInt(rawVal) : 0n;
  } catch {
    id = 0n;
  }

  // Max 63-bit positive limit for Snowflake ID (sign bit = 0)
  const max64Bit = 0x7FFFFFFFFFFFFFFFn;
  if (id > max64Bit) {
    id = max64Bit;
    finalIdInput.value = id.toString();
  }

  // Decode components using Bitwise operations
  const ts = (id >> 22n) & 2199023255551n; // 41 bits (Bits 22..62)
  const worker = (id >> 12n) & 1023n;     // 10 bits (Bits 12..21)
  const seq = id & 4095n;                // 12 bits (Bits 0..11)

  // Update inputs
  tsInput.value = ts.toString();
  workerInput.value = worker.toString();
  seqInput.value = seq.toString();

  // Update badges & date preview
  if (workerValEl) workerValEl.textContent = worker.toString();
  if (seqValEl) seqValEl.textContent = seq.toString();
  if (readableDateEl) readableDateEl.textContent = formatTimestampDate(epoch + ts);

  updateBitsUI(ts, worker, seq);
}

function updateBit(el, newValue, oldValue) {
  el.textContent = newValue;
  if (newValue !== oldValue && oldValue !== undefined) {
    el.classList.add('highlight');
    setTimeout(() => el.classList.remove('highlight'), 200);
  }
}

// Event listeners for real-time updates (Encode)
tsInput.addEventListener('input', updateSimulator);
workerInput.addEventListener('input', updateSimulator);
seqInput.addEventListener('input', updateSimulator);

// Event listener for real-time decoding (Decode)
finalIdInput.addEventListener('input', decodeSnowflakeId);

// Initial render with current timestamp offset relative to default epoch (Twitter 2010)
const initialNow = BigInt(Date.now());
const initialEpoch = BigInt(epochInput.value || 0);
let initialOffset = initialNow - initialEpoch;
if (initialOffset < 0n) initialOffset = 0n;
tsInput.value = initialOffset.toString();

updateEpochPreview();
updateSimulator();
