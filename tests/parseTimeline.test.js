import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parseTimelineJson, parseCoordinates, isValidCoordinate } from '../src/lib/parseTimeline.js';
import { aggregateVisits, mergePlaces, mergePlacesByName, makePlaceId } from '../src/lib/aggregate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readSample = (name) => readFileSync(resolve(__dirname, '..', 'samples', name), 'utf-8');

describe('parseCoordinates & validation', () => {
  it('parses degree-formatted latLng strings', () => {
    expect(parseCoordinates({ latLng: '12.3456°, 78.9012°' })).toEqual({
      lat: 12.3456,
      lng: 78.9012,
    });
    expect(parseCoordinates({ latLng: '-33.8688°, 151.2093°' })).toEqual({
      lat: -33.8688,
      lng: 151.2093,
    });
  });

  it('parses geo: URI strings', () => {
    expect(parseCoordinates('geo:35.6762,139.6503')).toEqual({
      lat: 35.6762,
      lng: 139.6503,
    });
  });

  it('parses E7 coordinate objects', () => {
    expect(parseCoordinates({ latitudeE7: 515080390, longitudeE7: -1280690 })).toEqual({
      lat: 51.508039,
      lng: -0.128069,
    });
  });

  it('rejects (0, 0) and out-of-range coordinates', () => {
    expect(isValidCoordinate(0, 0)).toBe(false);
    expect(parseCoordinates({ latLng: '0.0°, 0.0°' })).toBeNull();
    expect(parseCoordinates('geo:91.0,10.0')).toBeNull();
    expect(parseCoordinates('geo:10.0,-181.0')).toBeNull();
    expect(parseCoordinates('invalid')).toBeNull();
  });
});

describe('Sample Timeline files parsing & aggregation', () => {
  it('parses semantic-segments.json, skips activity/timelinePath/0,0, and deduplicates repeat visits', () => {
    const raw = readSample('semantic-segments.json');
    const result = parseTimelineJson(raw);

    expect(result.format).toBe('semanticSegments');
    // 4 valid visits (1 repeat within 4 decimals, 0,0 skipped, activity and timelinePath ignored)
    expect(result.visits).toHaveLength(4);

    const places = aggregateVisits(result.visits);
    expect(places).toHaveLength(3);

    const sfCityHall = places.find((p) => p.id === makePlaceId(37.7749, -122.4194));
    expect(sfCityHall).toBeDefined();
    expect(sfCityHall.visitCount).toBe(2);
    expect(sfCityHall.years).toEqual({ 2024: 2 });
    expect(sfCityHall.firstVisit < sfCityHall.lastVisit).toBe(true);
    expect(result.distanceKm).toBeCloseTo(3.8, 1);
    expect(result.distanceByYearKm).toEqual({ 2024: 3.8 });
  });

  it('parses android-array.json with geo: coordinates and aggregates across years', () => {
    const raw = readSample('android-array.json');
    const result = parseTimelineJson(raw);

    expect(result.format).toBe('androidArray');
    expect(result.visits).toHaveLength(4);
    expect(result.distanceKm).toBeCloseTo(8.9, 1);
    expect(result.distanceByYearKm).toEqual({ 2023: 8.9 });

    const places = aggregateVisits(result.visits);
    expect(places).toHaveLength(3);

    const tokyoTower = places.find((p) => p.id === makePlaceId(35.6586, 139.7454));
    expect(tokyoTower).toBeDefined();
    expect(tokyoTower.visitCount).toBe(2);
    expect(tokyoTower.years).toEqual({ 2023: 1, 2024: 1 });
  });

  it('parses takeout-semantic.json with E7 coordinates, names, and both timestamp formats', () => {
    const raw = readSample('takeout-semantic.json');
    const result = parseTimelineJson(raw);

    expect(result.format).toBe('takeout');
    expect(result.visits).toHaveLength(4);

    const places = aggregateVisits(result.visits);
    expect(places).toHaveLength(3);

    const trafalgar = places.find((p) => p.name === 'Trafalgar Square');
    expect(trafalgar).toBeDefined();
    expect(trafalgar.visitCount).toBe(2);
    expect(trafalgar.years).toEqual({ 2022: 1, 2023: 1 });
    expect(trafalgar.address).toContain('London');

    const eiffel = places.find((p) => p.name === 'Eiffel Tower');
    expect(eiffel).toBeDefined();
    expect(eiffel.lat).toBeCloseTo(48.8584, 4);
    expect(eiffel.lng).toBeCloseTo(2.2945, 4);
    expect(eiffel.years).toEqual({ 2024: 1 });
    expect(result.distanceKm).toBeCloseTo(1.3, 1);
    expect(result.distanceByYearKm['2022']).toBeCloseTo(1.3, 1);
  });

  it('throws the helpful Records.json error message on raw locations export', () => {
    const raw = readSample('records-raw.json');
    expect(() => parseTimelineJson(raw)).toThrow(
      'No visits found. Records.json files only hold raw points. Use Timeline.json or Semantic Location History files.'
    );
  });
});

describe('mergePlaces deduplication on re-import', () => {
  it('merges overlapping places cleanly without duplicating entries', () => {
    const existing = aggregateVisits(parseTimelineJson(readSample('takeout-semantic.json')).visits);
    const incoming = [
      {
        id: makePlaceId(51.5080, -1.2807),
        lat: 51.508,
        lng: -1.2807,
        visitCount: 1,
        firstVisit: '2025-02-01T10:00:00.000Z',
        lastVisit: '2025-02-01T10:00:00.000Z',
        name: null,
        address: null,
        years: { 2025: 1 },
      },
    ];

    // Verify Trafalgar Square's exact rounded ID
    const trafalgarExisting = existing.find((p) => p.name === 'Trafalgar Square');
    incoming[0].id = trafalgarExisting.id;

    const merged = mergePlaces(existing, incoming);
    expect(merged).toHaveLength(existing.length);

    const updated = merged.find((p) => p.id === trafalgarExisting.id);
    expect(updated.visitCount).toBe(3);
    expect(updated.name).toBe('Trafalgar Square');
    expect(updated.years).toEqual({ 2022: 1, 2023: 1, 2025: 1 });
    expect(updated.lastVisit).toBe('2025-02-01T10:00:00.000Z');
  });
});

describe('mergePlacesByName', () => {
  it('merges same-named campus spots within 5 km while keeping distant chains separate', () => {
    const input = [
      {
        id: '31.2536_75.7037',
        lat: 31.2536,
        lng: 75.7037,
        visitCount: 5,
        firstVisit: '2023-08-01T09:00:00.000Z',
        lastVisit: '2024-02-10T17:00:00.000Z',
        name: 'Lovely Professional University',
        years: { 2023: 3, 2024: 2 },
      },
      {
        id: '31.2554_75.7052',
        lat: 31.2554,
        lng: 75.7052,
        visitCount: 8,
        firstVisit: '2023-07-15T08:00:00.000Z',
        lastVisit: '2024-05-12T18:00:00.000Z',
        name: '  lovely professional university ',
        years: { 2023: 4, 2024: 4 },
      },
      {
        id: '28.6139_77.2090',
        lat: 28.6139,
        lng: 77.209,
        visitCount: 2,
        firstVisit: '2024-01-01T10:00:00.000Z',
        lastVisit: '2024-01-02T10:00:00.000Z',
        name: 'Lovely Professional University',
        years: { 2024: 2 },
      },
    ];

    const merged = mergePlacesByName(input);
    expect(merged).toHaveLength(2);

    const campus = merged.find((p) => p.lat === 31.2554);
    expect(campus).toBeDefined();
    expect(campus.visitCount).toBe(13);
    expect(campus.firstVisit).toBe('2023-07-15T08:00:00.000Z');
    expect(campus.lastVisit).toBe('2024-05-12T18:00:00.000Z');
    expect(campus.years).toEqual({ 2023: 7, 2024: 6 });
    expect(campus.sourceIds).toEqual(['31.2554_75.7052', '31.2536_75.7037']);
  });
});
