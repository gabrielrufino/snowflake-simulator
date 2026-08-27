// --- URL Parameters Synchronization ---

export function syncURLParams({ tsBits, seqBits, epoch, workerSegments }) {
  const params = new URLSearchParams();
  if (tsBits !== 41) params.set('ts_bits', tsBits.toString());
  if (seqBits !== 12) params.set('seq_bits', seqBits.toString());
  if (epoch && epoch !== '2010-11-04') params.set('epoch', epoch);

  const segStr = workerSegments.map(s => `${encodeURIComponent(s.name)}:${s.bits}`).join(',');
  if (segStr !== 'Worker%20ID:10') {
    params.set('workers', segStr);
  }

  const queryStr = params.toString();
  const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
  window.history.replaceState({}, '', newUrl);
}

export function loadFromURLParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};

  if (params.has('ts_bits')) result.tsBits = parseInt(params.get('ts_bits'), 10);
  if (params.has('seq_bits')) result.seqBits = parseInt(params.get('seq_bits'), 10);
  if (params.has('epoch')) result.epoch = params.get('epoch');

  if (params.has('workers')) {
    try {
      const parts = params.get('workers').split(',');
      if (parts.length > 0) {
        const loaded = parts.map((p, idx) => {
          const [rawName, rawBits] = p.split(':');
          return {
            id: `w_url_${idx}`,
            name: decodeURIComponent(rawName) || `Segment ${idx + 1}`,
            bits: Math.max(0, Math.min(32, parseInt(rawBits, 10) || 0)),
            value: 0n
          };
        });
        if (loaded.length > 0) {
          result.workerSegments = loaded;
        }
      }
    } catch {
      // Ignore parse error
    }
  }

  return result;
}
