// Client-side clip playback engine — shared by ExercisePlayer and the programme Player.
//
// Instead of waiting on server-side assembly (assembled output MP3s), the frontend
// fetches every clip for a stage via the playback-clips endpoint, decodes them into
// AudioBuffers, and schedules them on an AudioContext at their timeline offsets.
// Pauses and split markers are simply gaps with nothing scheduled.

import { flattenScript, resolvePauseDuration, computeMarkerDuration } from './playback';

export function collectLoops(segments, map = {}) {
  for (const seg of segments) {
    if (seg.type === 'loop') {
      map[seg.id] = seg;
      collectLoops(seg.segments, map);
    }
  }
  return map;
}

export function resolveWordVars(word, variables) {
  return word.replace(/\{(\w+)(?::(\w+))?\}/g, (_, varName, suffix) => {
    const v = variables[varName];
    if (v == null) return `{${varName}${suffix ? ':' + suffix : ''}}`;
    if (suffix === 's') {
      const val = typeof v === 'object' ? v.value : v;
      return Number(val) === 1 ? '' : 's';
    }
    return typeof v === 'object' ? (v.value ?? `{${varName}}`) : v;
  });
}

/** Map asset segment IDs to their filenames so buildTimeline can look up durations. */
export function collectAssetSegIds(segments, map = {}) {
  for (const seg of segments) {
    if (seg.type === 'asset') map[seg.id] = seg.file;
    if (seg.type === 'loop') collectAssetSegIds(seg.segments, map);
  }
  return map;
}

export function buildTimeline(script, variables, components) {
  const flat = flattenScript(script, variables, components);
  const loops = collectLoops(script);
  const timeline = [];
  let cursor = 0;

  for (const item of flat) {
    const { seg } = item;
    let dur = 0;

    if (seg.type === 'speech') {
      const comp = components[seg.id];
      dur = comp?.duration || 0;
    } else if (seg.type === 'pause') {
      dur = resolvePauseDuration(seg.duration_seconds, variables);
    } else if (seg.type === 'asset') {
      const comp = components[seg.id];
      dur = comp?.duration || 1;
    } else if (seg.type === 'split_marker') {
      const markerDur = computeMarkerDuration(script, seg.id, variables, components);
      dur = markerDur != null ? markerDur * (seg.multiplier || 1) : 1;
    }

    if (dur > 0) {
      const loopSeg = item.loopId ? loops[item.loopId] : null;
      const rawWords = seg.type === 'speech' ? (seg.text || '').split(' ') : [];
      timeline.push({
        start: cursor,
        end: cursor + dur,
        dur,
        type: seg.type,
        segId: seg.id,
        file: seg.file,
        words: rawWords.map(w => resolveWordVars(w, variables)),
        loopLabel: loopSeg?.label || '',
        loopIteration: item.loopIteration || null,
        loopTotal: item.loopTotal || null,
      });
      cursor += dur;
    }
  }

  return timeline;
}

/** Build a components map ({ segId → { duration } }) from playback-clips data. */
export function buildComponentsMap(script, clipData) {
  const components = {};
  for (const [segId, clip] of Object.entries(clipData.clips || {})) {
    components[segId] = { duration: clip.duration || 0, status: clip.status || 'current' };
  }
  const assetSegIds = collectAssetSegIds(script);
  for (const [segId, filename] of Object.entries(assetSegIds)) {
    const assetData = clipData.assets?.[filename];
    if (assetData?.duration) {
      components[segId] = { duration: assetData.duration };
    }
  }
  return components;
}

/**
 * Fetch and decode all clip/asset audio for a stage into AudioBuffers.
 * `onProgress(loaded, total)` fires as each download settles — use it for buffering UI.
 */
export async function loadClipBuffers(ctx, clipData, onProgress) {
  const clipEntries = Object.entries(clipData.clips || {}).filter(([, c]) => c.url);
  const assetEntries = Object.entries(clipData.assets || {}).filter(([, a]) => a?.url);

  const total = clipEntries.length + assetEntries.length;
  let loaded = 0;
  const tick = () => { loaded += 1; onProgress?.(loaded, total); };
  onProgress?.(0, total);

  const [clipResults, assetResults] = await Promise.all([
    Promise.all(clipEntries.map(async ([segId, clip]) => {
      try {
        const resp = await fetch(clip.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(buf);
        tick();
        return [segId, { buffer: audioBuf, trimStart: clip.trimStart || 0, trimEnd: clip.trimEnd || audioBuf.duration }];
      } catch (err) {
        console.warn(`[playback] Failed to load clip ${segId}:`, err);
        tick();
        return [segId, null];
      }
    })),
    Promise.all(assetEntries.map(async ([filename, asset]) => {
      try {
        const resp = await fetch(asset.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(buf);
        tick();
        return [filename, { buffer: audioBuf, trimStart: asset.trimStart || 0, trimEnd: asset.trimEnd || audioBuf.duration }];
      } catch (err) {
        console.warn(`[playback] Failed to load asset ${filename}:`, err);
        tick();
        return [filename, null];
      }
    })),
  ]);

  return {
    clipBuffers: Object.fromEntries(clipResults.filter(([, v]) => v)),
    assetBuffers: Object.fromEntries(assetResults.filter(([, v]) => v)),
  };
}

/**
 * Schedule every timeline entry from `fromTime` onward on the AudioContext.
 * Returns the list of started AudioBufferSourceNodes (stop them to cancel).
 */
export function scheduleTimeline(ctx, timeline, clipBuffers, assetBuffers, fromTime) {
  const sources = [];

  for (const entry of timeline) {
    if (entry.end <= fromTime) continue; // already past

    let bufData = null;
    if (entry.type === 'speech') {
      bufData = clipBuffers[entry.segId];
    } else if (entry.type === 'asset') {
      bufData = assetBuffers[entry.file];
    }

    if (!bufData) continue; // pause, split_marker, or missing clip — silence

    const source = ctx.createBufferSource();
    source.buffer = bufData.buffer;
    source.connect(ctx.destination);

    const clipStart = bufData.trimStart || 0;
    const clipDur = (bufData.trimEnd || bufData.buffer.duration) - clipStart;

    const when = ctx.currentTime + (entry.start - fromTime);

    if (when < ctx.currentTime) {
      // Segment already partially past — start from the middle
      const skipBy = ctx.currentTime - when;
      if (skipBy < clipDur) {
        source.start(0, clipStart + skipBy, clipDur - skipBy);
        sources.push(source);
      }
    } else {
      source.start(when, clipStart, clipDur);
      sources.push(source);
    }
  }

  return sources;
}
