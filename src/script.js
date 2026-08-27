import { initTheme } from './state/theme.js';
import { formatTimestampDate, getEpochMs, formatEpochPreview, formatLifespan } from './utils/formatters.js';
import { calculateLimits, encodeSnowflake, decodeSnowflake } from './core/snowflake.js';
import { syncURLParams, loadFromURLParams } from './state/url.js';
import {
  initBitGrid,
  updateBitElementsLayout,
  updateBitsUI,
  renderAllocationBar,
  renderLegend,
  renderWorkerSegmentsManager,
  renderSliders
} from './ui/visualizer.js';

// Initialize Theme
initTheme();

// --- Application State ---
let workerSegments = [
  { id: 'w_0', name: 'Worker ID', bits: 10, value: 42n }
];
let nextSegmentId = 1;
let seqValue = 7n;
let prevBitValues = [];

// --- DOM Elements ---
const configSection = document.getElementById('config-section');
const configToggle = document.getElementById('config-toggle');
const configSummary = document.getElementById('config-summary');

const bitsTsInput = document.getElementById('bits-ts');
const bitsSeqInput = document.getElementById('bits-seq');
const totalBitsBadge = document.getElementById('total-bits-badge');

const tsCapacityEl = document.getElementById('ts-capacity');
const seqCapacityEl = document.getElementById('seq-capacity');
const workerTotalCapacityEl = document.getElementById('worker-total-capacity');

const tsLifespanHint = document.getElementById('ts-lifespan-hint');
const seqCapacityHint = document.getElementById('seq-capacity-hint');

const workerSegmentsListEl = document.getElementById('worker-segments-list');
const btnAddSegment = document.getElementById('btn-add-segment');
const barAllocationEl = document.getElementById('bit-allocation-bar');

const epochInput = document.getElementById('epoch');
const readableEpochEl = document.getElementById('readable-epoch');
const epochPresetButtons = document.querySelectorAll('.epoch-presets .preset-btn');
const tsInput = document.getElementById('timestamp');
const btnNow = document.getElementById('btn-now');
const readableDateEl = document.getElementById('readable-date');

const slidersContainer = document.getElementById('sliders-container');
const bitsContainer = document.getElementById('bits-container');
const legendContainer = document.getElementById('legend-container');

const finalIdInput = document.getElementById('final-id');
const btnCopy = document.getElementById('btn-copy');
const copyText = document.getElementById('copy-text');

// Initialize 64-bit grid elements
const bitElements = initBitGrid(bitsContainer);

function getLimits() {
  return calculateLimits(bitsTsInput.value, bitsSeqInput.value, workerSegments);
}

function updateEpochPreview() {
  const epochVal = getEpochMs(epochInput.value);
  if (readableEpochEl) {
    readableEpochEl.textContent = formatEpochPreview(epochVal);
  }
  const currentDateStr = epochInput.value.trim();
  epochPresetButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.date === currentDateStr);
  });
}

function updateBitStructureUI() {
  const limits = getLimits();
  const { tsBits, seqBits, workerTotalBits, maxTs, maxSeq, totalBits } = limits;

  if (configSummary) {
    const workerParts = workerSegments.map(s => s.bits).join('+');
    configSummary.textContent = `${tsBits} / ${workerParts || workerTotalBits} / ${seqBits} bits`;
  }

  if (tsCapacityEl) tsCapacityEl.textContent = `${tsBits} bit${tsBits !== 1 ? 's' : ''}`;
  if (seqCapacityEl) seqCapacityEl.textContent = `${seqBits} bit${seqBits !== 1 ? 's' : ''}`;
  if (workerTotalCapacityEl) workerTotalCapacityEl.textContent = `${workerTotalBits} bits total`;

  if (tsLifespanHint) tsLifespanHint.textContent = formatLifespan(maxTs);
  if (seqCapacityHint) {
    const totalSeqs = seqBits > 0 ? (Number(maxSeq) + 1).toLocaleString() : '1';
    seqCapacityHint.textContent = `${totalSeqs} IDs/ms (0–${maxSeq.toLocaleString()})`;
  }

  if (totalBitsBadge) {
    totalBitsBadge.textContent = `${totalBits} / 64 bits`;
    const isValid = totalBits === 64;
    totalBitsBadge.classList.toggle('valid', isValid);
    totalBitsBadge.classList.toggle('invalid', !isValid);
  }

  renderAllocationBar(barAllocationEl, limits, workerSegments);
  updateBitElementsLayout(bitElements, limits, workerSegments);

  syncURLParams({ tsBits, seqBits, epoch: epochInput.value, workerSegments });
}

function renderUIComponents() {
  const limits = getLimits();

  renderWorkerSegmentsManager(workerSegmentsListEl, workerSegments, {
    onNameChange: () => {
      updateBitStructureUI();
      renderSlidersComponent();
      renderLegend(legendContainer, getLimits(), workerSegments);
    },
    onBitsChange: () => {
      updateBitStructureUI();
      renderSlidersComponent();
      renderLegend(legendContainer, getLimits(), workerSegments);
      updateSimulator();
    },
    onRemove: () => {
      renderUIComponents();
      updateBitStructureUI();
      updateSimulator();
    }
  });

  renderSlidersComponent();
  renderLegend(legendContainer, limits, workerSegments);
}

function renderSlidersComponent() {
  const limits = getLimits();
  renderSliders(slidersContainer, limits, workerSegments, seqValue, {
    onWorkerChange: () => updateSimulator(),
    onSeqChange: (val) => {
      seqValue = val;
      updateSimulator();
    }
  });
}

function updateSimulator() {
  const epoch = getEpochMs(epochInput.value);
  const limits = getLimits();
  const { maxTs, maxSeq } = limits;

  let ts = BigInt(tsInput.value || 0);
  if (ts > maxTs) { ts = maxTs; tsInput.value = ts.toString(); }

  workerSegments.forEach(seg => {
    const maxVal = seg.mask || 0n;
    if (seg.value > maxVal) seg.value = maxVal;
    if (seg.value < 0n) seg.value = 0n;
    const badge = document.getElementById(`badge-${seg.id}`);
    const slider = document.getElementById(`slider-${seg.id}`);
    if (badge) badge.textContent = seg.value.toString();
    if (slider && document.activeElement !== slider) slider.value = seg.value.toString();
  });

  if (seqValue > maxSeq) seqValue = maxSeq;
  if (seqValue < 0n) seqValue = 0n;
  const seqBadge = document.getElementById('sequence-value');
  const seqSlider = document.getElementById('sequence');
  if (seqBadge) seqBadge.textContent = seqValue.toString();
  if (seqSlider && document.activeElement !== seqSlider) seqSlider.value = seqValue.toString();

  if (readableDateEl) readableDateEl.textContent = formatTimestampDate(epoch + ts);

  const id = encodeSnowflake({ ts, workerSegments, seqValue, limits });

  if (document.activeElement !== finalIdInput) {
    finalIdInput.value = id.toString();
  }

  updateBitsUI(bitElements, prevBitValues, limits, workerSegments, ts, seqValue);
}

function decodeSnowflakeId() {
  const epoch = getEpochMs(epochInput.value);
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

  const limits = getLimits();
  const totalDataBits = BigInt(limits.totalBits - 1);
  const maxAllowedId = totalDataBits >= 63n ? 0x7FFFFFFFFFFFFFFFn : ((1n << totalDataBits) - 1n);

  if (id > maxAllowedId) {
    id = maxAllowedId;
    finalIdInput.value = id.toString();
  }

  const { ts, seq } = decodeSnowflake({ id, limits, workerSegments });
  tsInput.value = ts.toString();
  seqValue = seq;

  renderSlidersComponent();
  if (readableDateEl) readableDateEl.textContent = formatTimestampDate(epoch + ts);

  updateBitsUI(bitElements, prevBitValues, limits, workerSegments, ts, seqValue);
}

// --- Event Listeners ---
if (configToggle && configSection) {
  configToggle.addEventListener('click', () => {
    const isOpen = configSection.classList.toggle('open');
    configToggle.setAttribute('aria-expanded', isOpen.toString());
  });
}

if (btnAddSegment) {
  btnAddSegment.addEventListener('click', () => {
    const newIdx = workerSegments.length + 1;
    workerSegments.push({
      id: `w_${nextSegmentId++}`,
      name: `Segment ${newIdx}`,
      bits: 5,
      value: 0n
    });
    renderUIComponents();
    updateBitStructureUI();
    updateSimulator();
  });
}

[bitsTsInput, bitsSeqInput].forEach(input => {
  input.addEventListener('input', () => {
    updateBitStructureUI();
    renderSlidersComponent();
    renderLegend(legendContainer, getLimits(), workerSegments);
    updateSimulator();
  });
});

epochPresetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    epochInput.value = btn.dataset.date;
    updateEpochPreview();
    syncURLParams({
      tsBits: getLimits().tsBits,
      seqBits: getLimits().seqBits,
      epoch: epochInput.value,
      workerSegments
    });
    updateSimulator();
  });
});

epochInput.addEventListener('input', () => {
  updateEpochPreview();
  syncURLParams({
    tsBits: getLimits().tsBits,
    seqBits: getLimits().seqBits,
    epoch: epochInput.value,
    workerSegments
  });
  updateSimulator();
});

if (btnNow) {
  btnNow.addEventListener('click', () => {
    const currentMs = BigInt(Date.now());
    const epoch = getEpochMs(epochInput.value);
    let offset = currentMs - epoch;
    if (offset < 0n) offset = 0n;
    const { maxTs } = getLimits();
    if (offset > maxTs) offset = maxTs;
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

tsInput.addEventListener('input', updateSimulator);
finalIdInput.addEventListener('input', decodeSnowflakeId);

// --- Initialization ---
const loadedParams = loadFromURLParams();
if (loadedParams.tsBits !== undefined) bitsTsInput.value = loadedParams.tsBits;
if (loadedParams.seqBits !== undefined) bitsSeqInput.value = loadedParams.seqBits;
if (loadedParams.epoch !== undefined) epochInput.value = loadedParams.epoch;
if (loadedParams.workerSegments && loadedParams.workerSegments.length > 0) {
  workerSegments = loadedParams.workerSegments;
}

if (!epochInput.value) {
  epochInput.value = "2010-11-04";
}

const initialNow = BigInt(Date.now());
const initialEpoch = getEpochMs(epochInput.value);
let initialOffset = initialNow - initialEpoch;
if (initialOffset < 0n) initialOffset = 0n;
tsInput.value = initialOffset.toString();

renderUIComponents();
updateEpochPreview();
updateBitStructureUI();
updateSimulator();
