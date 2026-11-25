import { parseTimelineJson } from '../lib/parseTimeline.js';
import { aggregateVisits } from '../lib/aggregate.js';

self.onmessage = async (event) => {
  const { files } = event.data || {};
  if (!files || !files.length) {
    self.postMessage({ type: 'error', error: 'No files provided to import.' });
    return;
  }

  const allVisits = [];
  const formats = new Set();
  const warnings = [];
  let filesSucceeded = 0;
  let totalDistanceKm = 0;
  const distanceByYearKm = {};

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const baseProgress = (i / files.length) * 0.85;
      const sliceSpan = 0.85 / files.length;

      self.postMessage({
        type: 'progress',
        progress: Math.round(baseProgress * 100),
        stage: `Reading ${file.name}...`,
        fileIndex: i + 1,
        totalFiles: files.length,
      });

      const text = await file.text();

      self.postMessage({
        type: 'progress',
        progress: Math.round((baseProgress + sliceSpan * 0.25) * 100),
        stage: `Parsing ${file.name}...`,
        fileIndex: i + 1,
        totalFiles: files.length,
      });

      try {
        const result = parseTimelineJson(text, {
          onProgress: (fraction) => {
            const pct = baseProgress + sliceSpan * (0.25 + fraction * 0.75);
            self.postMessage({
              type: 'progress',
              progress: Math.round(pct * 100),
              stage: `Extracting visits from ${file.name}...`,
              fileIndex: i + 1,
              totalFiles: files.length,
            });
          },
        });

        formats.add(result.format);
        for (let j = 0; j < result.visits.length; j++) {
          allVisits.push(result.visits[j]);
        }
        totalDistanceKm += result.distanceKm || 0;
        for (const [yr, km] of Object.entries(result.distanceByYearKm || {})) {
          distanceByYearKm[yr] = Math.round(((distanceByYearKm[yr] || 0) + km) * 10) / 10;
        }
        filesSucceeded += 1;
      } catch (fileErr) {
        if (files.length === 1) {
          self.postMessage({
            type: 'error',
            error: fileErr.message || `Failed to parse ${file.name}`,
          });
          return;
        }
        warnings.push(`${file.name}: ${fileErr.message}`);
      }
    }

    if (filesSucceeded === 0 || allVisits.length === 0) {
      self.postMessage({
        type: 'error',
        error:
          warnings[0] ||
          'No visits found in the selected files. Use Timeline.json or Semantic Location History files.',
      });
      return;
    }

    self.postMessage({
      type: 'progress',
      progress: 90,
      stage: `Deduplicating ${allVisits.length.toLocaleString()} visits...`,
      fileIndex: files.length,
      totalFiles: files.length,
    });

    const places = aggregateVisits(allVisits);

    self.postMessage({
      type: 'progress',
      progress: 100,
      stage: 'Parsing complete',
      fileIndex: files.length,
      totalFiles: files.length,
    });

    self.postMessage({
      type: 'done',
      places,
      warnings,
      stats: {
        filesProcessed: filesSucceeded,
        totalVisits: allVisits.length,
        totalPlaces: places.length,
        formats: Array.from(formats),
        distanceKm: Math.round(totalDistanceKm * 10) / 10,
        distanceByYearKm,
      },
    });
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err?.message || 'Unexpected error while parsing Timeline files.',
    });
  }
};
