import { WORKER_PALETTE } from '../constants/palette.js';

// --- Visualizer & Component Renderers ---

/**
 * Initializes the 64 bit elements in the grid container.
 */
export function initBitGrid(container) {
  const bitElements = [];
  container.innerHTML = '';
  for (let i = 0; i < 64; i++) {
    const el = document.createElement('div');
    el.className = 'bit';
    el.textContent = '0';
    container.appendChild(el);
    bitElements.push(el);
  }
  return bitElements;
}

/**
 * Updates classes and background colors of all 64 bit divs.
 */
export function updateBitElementsLayout(bitElements, limits, workerSegments) {
  const { tsBits, seqBits } = limits;

  // Bit 0: Sign
  bitElements[0].className = 'bit sign';
  bitElements[0].style.backgroundColor = '';

  let cursor = 1;

  // Timestamp bits
  for (let i = 0; i < tsBits && cursor < 64; i++, cursor++) {
    bitElements[cursor].className = 'bit time';
    bitElements[cursor].style.backgroundColor = '';
  }

  // Worker Segment bits
  workerSegments.forEach(seg => {
    for (let i = 0; i < seg.bits && cursor < 64; i++, cursor++) {
      bitElements[cursor].className = 'bit';
      bitElements[cursor].style.backgroundColor = seg.color;
    }
  });

  // Sequence bits
  for (let i = 0; i < seqBits && cursor < 64; i++, cursor++) {
    bitElements[cursor].className = 'bit seq';
    bitElements[cursor].style.backgroundColor = '';
  }

  // Remaining unused bits
  for (; cursor < 64; cursor++) {
    bitElements[cursor].className = 'bit unused';
    bitElements[cursor].style.backgroundColor = '';
  }
}

/**
 * Updates text content and change highlights of 64 bits.
 */
export function updateBitsUI(bitElements, prevBitValues, limits, workerSegments, ts, seq) {
  const { tsBits, seqBits } = limits;

  const tsBin = ts.toString(2).padStart(tsBits, '0');
  const seqBin = seq.toString(2).padStart(seqBits, '0');

  // Sign bit is always 0
  bitElements[0].textContent = '0';

  let cursor = 1;
  for (let i = 0; i < tsBits && cursor < 64; i++, cursor++) {
    updateBit(bitElements[cursor], cursor, tsBin[i], prevBitValues);
  }

  workerSegments.forEach(seg => {
    const val = BigInt(seg.value || 0);
    const bin = val.toString(2).padStart(seg.bits, '0');
    for (let i = 0; i < seg.bits && cursor < 64; i++, cursor++) {
      updateBit(bitElements[cursor], cursor, bin[i], prevBitValues);
    }
  });

  for (let i = 0; i < seqBits && cursor < 64; i++, cursor++) {
    updateBit(bitElements[cursor], cursor, seqBin[i], prevBitValues);
  }

  for (; cursor < 64; cursor++) {
    bitElements[cursor].textContent = '0';
    prevBitValues[cursor] = '0';
  }
}

function updateBit(el, index, newValue, prevBitValues) {
  const oldValue = prevBitValues[index];
  el.textContent = newValue;
  if (newValue !== oldValue && oldValue !== undefined) {
    el.classList.add('highlight');
    setTimeout(() => el.classList.remove('highlight'), 200);
  }
  prevBitValues[index] = newValue;
}

/**
 * Renders the top visual allocation bar.
 */
export function renderAllocationBar(barElement, limits, workerSegments) {
  if (!barElement) return;
  barElement.innerHTML = '';

  const { tsBits, seqBits } = limits;

  // Sign (1 bit)
  const signSeg = document.createElement('div');
  signSeg.className = 'bar-segment sign';
  signSeg.style.width = `${(1 / 64) * 100}%`;
  signSeg.title = 'Sign (1 bit)';
  barElement.appendChild(signSeg);

  // Timestamp
  if (tsBits > 0) {
    const tsSeg = document.createElement('div');
    tsSeg.className = 'bar-segment time';
    tsSeg.style.width = `${(tsBits / 64) * 100}%`;
    tsSeg.title = `Timestamp (${tsBits} bits)`;
    barElement.appendChild(tsSeg);
  }

  // Worker Segments
  workerSegments.forEach(seg => {
    if (seg.bits > 0) {
      const segEl = document.createElement('div');
      segEl.className = 'bar-segment';
      segEl.style.backgroundColor = seg.color;
      segEl.style.width = `${(seg.bits / 64) * 100}%`;
      segEl.title = `${seg.name} (${seg.bits} bits)`;
      barElement.appendChild(segEl);
    }
  });

  // Sequence
  if (seqBits > 0) {
    const seqSeg = document.createElement('div');
    seqSeg.className = 'bar-segment seq';
    seqSeg.style.width = `${(seqBits / 64) * 100}%`;
    seqSeg.title = `Sequence (${seqBits} bits)`;
    barElement.appendChild(seqSeg);
  }
}

/**
 * Renders the color-coded legend items.
 */
export function renderLegend(legendContainer, limits, workerSegments) {
  if (!legendContainer) return;
  legendContainer.innerHTML = '';

  const { tsBits, seqBits } = limits;

  // Sign
  const signItem = document.createElement('div');
  signItem.className = 'legend-item';
  signItem.innerHTML = `<div class="dot" style="background: var(--sign)"></div>Sign (1 bit)`;
  legendContainer.appendChild(signItem);

  // Timestamp
  const tsItem = document.createElement('div');
  tsItem.className = 'legend-item';
  tsItem.innerHTML = `<div class="dot" style="background: var(--time)"></div>Timestamp (${tsBits} bit${tsBits !== 1 ? 's' : ''})`;
  legendContainer.appendChild(tsItem);

  // Worker Segments
  workerSegments.forEach(seg => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<div class="dot" style="background: ${seg.color}"></div>${seg.name} (${seg.bits} bit${seg.bits !== 1 ? 's' : ''})`;
    legendContainer.appendChild(item);
  });

  // Sequence
  const seqItem = document.createElement('div');
  seqItem.className = 'legend-item';
  seqItem.innerHTML = `<div class="dot" style="background: var(--seq)"></div>Sequence (${seqBits} bit${seqBits !== 1 ? 's' : ''})`;
  legendContainer.appendChild(seqItem);
}

/**
 * Renders the worker segments manager list inside the configuration section.
 */
export function renderWorkerSegmentsManager(container, workerSegments, callbacks) {
  if (!container) return;
  container.innerHTML = '';
  const canRemove = workerSegments.length > 1;

  workerSegments.forEach((seg, idx) => {
    const color = WORKER_PALETTE[idx % WORKER_PALETTE.length];
    seg.color = color;

    const row = document.createElement('div');
    row.className = 'worker-segment-row';

    row.innerHTML = `
      <div class="segment-color-dot" style="background-color: ${color};"></div>
      <input type="text" class="segment-name-input" value="${seg.name}" placeholder="Segment name" spellcheck="false" autocomplete="off">
      <div class="segment-bits-wrapper">
        <input type="number" class="segment-bits-input" min="0" max="32" value="${seg.bits}">
        <span class="segment-unit">bits</span>
      </div>
      <button type="button" class="btn-remove-segment" ${!canRemove ? 'disabled' : ''} title="Remove segment" aria-label="Remove segment">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    const nameInput = row.querySelector('.segment-name-input');
    const bitsInput = row.querySelector('.segment-bits-input');
    const removeBtn = row.querySelector('.btn-remove-segment');

    nameInput.addEventListener('input', (e) => {
      seg.name = e.target.value || `Segment ${idx + 1}`;
      if (callbacks.onNameChange) callbacks.onNameChange();
    });

    bitsInput.addEventListener('input', (e) => {
      const val = Math.max(0, Math.min(32, parseInt(e.target.value, 10) || 0));
      seg.bits = val;
      if (callbacks.onBitsChange) callbacks.onBitsChange();
    });

    removeBtn.addEventListener('click', () => {
      if (workerSegments.length > 1) {
        workerSegments.splice(idx, 1);
        if (callbacks.onRemove) callbacks.onRemove();
      }
    });

    container.appendChild(row);
  });
}

/**
 * Renders dynamic sliders for worker segments and sequence in the controls area.
 */
export function renderSliders(container, limits, workerSegments, seqValue, callbacks) {
  if (!container) return;
  container.innerHTML = '';

  const { maxSeq } = limits;

  // Worker Segment Sliders
  workerSegments.forEach(seg => {
    const maxVal = seg.mask || 0n;
    if (seg.value === undefined || seg.value === null) seg.value = 0n;
    if (seg.value > maxVal) seg.value = maxVal;
    if (seg.value < 0n) seg.value = 0n;

    const group = document.createElement('div');
    group.className = 'input-group';

    group.innerHTML = `
      <div class="label-row">
        <label for="slider-${seg.id}">${seg.name} (max ${maxVal.toLocaleString()})</label>
        <span class="value-badge" style="color: ${seg.color};" id="badge-${seg.id}">${seg.value.toString()}</span>
      </div>
      <input type="range" id="slider-${seg.id}" min="0" max="${maxVal.toString()}" value="${seg.value.toString()}" style="--thumb-color: ${seg.color}; accent-color: ${seg.color};">
    `;

    const rangeInput = group.querySelector('input[type="range"]');
    const badgeEl = group.querySelector(`#badge-${seg.id}`);

    rangeInput.addEventListener('input', (e) => {
      const val = BigInt(e.target.value || 0);
      seg.value = val;
      if (badgeEl) badgeEl.textContent = val.toString();
      if (callbacks.onWorkerChange) callbacks.onWorkerChange(seg, val);
    });

    container.appendChild(group);
  });

  // Sequence Slider
  let currentSeq = seqValue;
  if (currentSeq > maxSeq) currentSeq = maxSeq;
  if (currentSeq < 0n) currentSeq = 0n;

  const seqGroup = document.createElement('div');
  seqGroup.className = 'input-group';
  seqGroup.innerHTML = `
    <div class="label-row">
      <label for="sequence">Sequence (max ${maxSeq.toLocaleString()})</label>
      <span class="value-badge seq-badge" id="sequence-value">${currentSeq.toString()}</span>
    </div>
    <input type="range" id="sequence" min="0" max="${maxSeq.toString()}" value="${currentSeq.toString()}" style="--thumb-color: var(--seq); accent-color: var(--seq);">
  `;

  const seqRangeInput = seqGroup.querySelector('#sequence');
  const seqValEl = seqGroup.querySelector('#sequence-value');

  seqRangeInput.addEventListener('input', (e) => {
    const val = BigInt(e.target.value || 0);
    if (seqValEl) seqValEl.textContent = val.toString();
    if (callbacks.onSeqChange) callbacks.onSeqChange(val);
  });

  container.appendChild(seqGroup);
}
