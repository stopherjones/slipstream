import { TrackDefinition, TrackSectionType } from '../types/game';

// -------------------------------------------------------------
// Rectilinear Racing Circuits (Straights, Bottlenecks & 90° Corners)
// -------------------------------------------------------------

export const TRACK_PRESETS: TrackDefinition[] = [
  {
    id: 'bathurst',
    name: 'Bathurst',
    country: 'Australia 🇦🇺',
    description: 'Iconic Australian race track climbing Mount Panorama.',
    difficulty: 'Intermediate',
    lapsDefault: 2,
    sections: ["T", "T", "L", "L", "T", "T", "T", "T", "T", "R", "R", "R", "T", "T", "L", "L", "L", "L", "S", "R", "T", "R", "L", "T", "T", "T", "T", "L", "T", "L", "T", "T", "R", "L", "L", "R", "S", "S", "R", "T", "T", "L", "L", "T", "T", "S", "S", "L", "L", "T", "R", "T", "T", "T", "T", "T", "T", "T", "T", "R", "T", "L", "T", "L", "T", "L", "T", "T", "T", "T", "T", "T"],
    segments: [
      'TTTTT',
      'CC',
      'TTSTT',
      'CC',
      'TTTT',
      'CC',
      'TTSTT',
      'CC',
      'TTTT',
    ],
  },
  {
    id: 'brands-hatch',
    name: 'Brands Hatch',
    country: 'United Kingdom 🇬🇧',
    description: 'Classic compact circuit with tight corners and fast straights.',
    difficulty: 'Intermediate',
    lapsDefault: 2,
    sections: ["T", "T", "T", "L", "L", "T", "T", "T", "T", "R", "R", "S", "S", "L", "T", "L", "T", "T", "T", "T", "L", "L", "T", "T", "T", "T", "S", "L", "L", "T", "T", "T", "T", "T", "T", "T", "T", "R", "R", "S", "S", "S", "R", "R", "R", "S", "S", "S", "L", "L", "L", "L", "T", "T", "T", "T", "T", "T", "T", "L", "T", "L", "T", "L", "T", "T", "T", "T"],
    segments: [
      'TTTTT',
      'CC',
      'TTSTT',
      'CC',
      'TTTT',
      'CC',
      'TTSTT',
      'CC',
      'TTTT',
    ],
  },
  {
    id: 'monaco',
    name: 'Monaco',
    country: 'Monaco 🇲🇨',
    description: 'Tight and twisty street course and centre piece of the Grand Prix calendar.',
    difficulty: 'Intermediate',
    lapsDefault: 2,
    sections: ["T","T","T","T","T","L","R","T","R","L","L","L","T","T","T","L","L","L","T","T","T","T","SR","SR","SR","SL","SL","S","SL","SL","SR","SR","T","T","T","R","R","R","T","T","T","T","T","T","T","T","SR","SR","SL","SL","S","SL","SL","SR","SR","T","T","L","T","T","T","T","L","T","T","L","T","L","L","L","T","T","R","SR","SR","SR","S","S","SL","SL","L","T","T","T","T","T","T","T","R","T","T","T","T","T","T","T","T","L","SR","SR","SL","SL","SL","SL","T","T","T","T","T","T","T","T"],
    segments: [
      'TTTTT',
      'CC',
      'TTSTT',
      'CC',
      'TTTT',
      'CC',
      'TTSTT',
      'CC',
      'TTTT',
    ],
  },
  {
    id: 'speedway',
    name: 'Indianapolis Speedway',
    country: 'USA 🇺🇸',
    description: 'Fast oval circuit with wide corners and long, fast straights.',
    difficulty: 'Intermediate',
    lapsDefault: 2,
    sections: ["T", "T", "T", "T", "T", "T", "T", "T", "L", "T", "L", "T", "T", "T", "T", "L", "T", "L", "T", "T", "T", "T", "T", "T", "T", "T", "T", "T", "T", "T", "T", "T", "T", "L", "T", "L", "T", "T", "T", "T", "L", "T", "L", "T", "T", "T", "T", "T"],
    segments: [
      'TTTTT',
      'CC',
      'TTSTT',
      'CC',
      'TTTT',
      'CC',
      'TTSTT',
      'CC',
      'TTTT',
    ],
  },
];

export const REAL_CIRCUITS = TRACK_PRESETS;

// -------------------------------------------------------------
// Section Helpers (T, S, L, R)
// -------------------------------------------------------------

export function encodeSectionTrackCode(sections: TrackSectionType[]): string {
  return sections.join('-');
}

export function parseSectionTrackCode(code: string): TrackSectionType[] | null {
  const parts = String(code || '')
    .trim()
    .toUpperCase()
    .split(/[-,\s]+/);
  if (parts.length === 0 || parts[0] === '') return null;
  const valid = parts.every((p) =>
    p === 'T' || p === 'S' || p === 'L' || p === 'R' || p === 'SL' || p === 'SR'
  );
  if (!valid) return null;
  return parts as TrackSectionType[];
}

export function generateSectionTrackCodeSnippet(
  id: string,
  name: string,
  country: string,
  description: string,
  difficulty: 'Beginner' | 'Intermediate' | 'Pro',
  lapsDefault: number,
  sections: TrackSectionType[]
): string {
  const formattedSections = JSON.stringify(sections);
  return `{
  id: '${id.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}',
  name: '${name.replace(/'/g, "\\'")}',
  country: '${country.replace(/'/g, "\\'")}',
  description: '${description.replace(/'/g, "\\'")}',
  difficulty: '${difficulty}',
  lapsDefault: ${lapsDefault},
  sections: ${formattedSections},
  segments: [
    '${sections.filter((s) => s === 'T' || s === 'S').slice(0, 5).join('') || 'TTTT'}',
    'CC',
    'TTSTT',
    'CC',
    'TTTT',
    'CC',
    'TTSTT',
    'CC',
    'TTTT',
  ],
},`;
}

// -------------------------------------------------------------
// Legacy & Track Editor Support (9-segment system)
// -------------------------------------------------------------

export const DEFAULT_TRACK_SEGMENTS = {
  dice: ['TTTTT', 'CC', 'TTTSSSTTT', 'CC', 'TTTTTT', 'CC', 'TTSSSTTT', 'CC', 'TTTT'],
  cards: ['TTTT', 'CCC', 'TTSSST', 'CCC', 'TTTTTTT', 'CCC', 'TTSSST', 'CCC', 'TTTT'],
};

export const SEGMENT_NAMES = [
  'Start Straight',
  'Turn 1 (90°)',
  'Right Straight',
  'Turn 2 (90°)',
  'Top Straight',
  'Turn 3 (90°)',
  'Left Straight',
  'Turn 4 (90°)',
  'Finish Straight',
];

export function encodeTrackCode(segments: string[]): string {
  return segments.join('/');
}

export function parseTrackCode(code: string): string[] | null {
  const parts = String(code || '').trim().toUpperCase().split('/');
  if (parts.length !== 9) return null;
  for (let j = 0; j < 9; j++) {
    const isCorner = j % 2 !== 0;
    if (isCorner) {
      if (!/^C{1,5}$/.test(parts[j])) return null;
    } else {
      if (!/^[TS]{1,16}$/.test(parts[j])) return null;
    }
  }
  if (parts[0][0] !== 'T') return null;
  return parts;
}

export function generateTrackCodeSnippet(
  id: string,
  name: string,
  description: string,
  difficulty: 'Beginner' | 'Intermediate' | 'Pro',
  lapsDefault: number,
  segments: string[]
): string {
  const segLines = segments
    .map((s, idx) => `      '${s}', // ${SEGMENT_NAMES[idx]}`)
    .join('\n');

  return `{
  id: '${id.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}',
  name: '${name.replace(/'/g, "\\'")}',
  country: 'Custom 🏁',
  description: '${description.replace(/'/g, "\\'")}',
  difficulty: '${difficulty}',
  lapsDefault: ${lapsDefault},
  segments: [
${segLines}
  ],
},`;
}

export interface SavedTrackItem {
  id?: string;
  name: string;
  country?: string;
  mode?: string;
  description?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Pro';
  lapsDefault?: number;
  code?: string;
  segments?: string[];
  sections?: TrackSectionType[];
}

export function loadSavedCustomTracks(): SavedTrackItem[] {
  try {
    const raw = localStorage.getItem('slip_tracks');
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) return list;
  } catch {
    // ignore
  }
  return [];
}

export function saveCustomTracks(tracks: SavedTrackItem[]) {
  try {
    localStorage.setItem('slip_tracks', JSON.stringify(tracks));
  } catch {
    // ignore
  }
}

export function loadCurrentCircuitId(): string {
  try {
    const id = localStorage.getItem('slip_circuit_id');
    if (id) {
      if (TRACK_PRESETS.some((c) => c.id === id)) return id;
      const custom = loadSavedCustomTracks();
      if (custom.some((c) => c.id === id || c.name === id)) return id;
    }
  } catch {
    // fallback
  }
  return TRACK_PRESETS[0].id;
}

export function saveCurrentCircuitId(id: string) {
  try {
    localStorage.setItem('slip_circuit_id', id);
  } catch {
    // ignore
  }
}

export function getCircuitById(id: string): TrackDefinition {
  const preset = TRACK_PRESETS.find((c) => c.id === id);
  if (preset) return preset;

  const custom = loadSavedCustomTracks().find((c) => c.id === id || c.name === id);
  if (custom) {
    const parsedSections =
      custom.sections ?? (custom.code ? parseSectionTrackCode(custom.code) ?? undefined : undefined);
    const segs =
      custom.segments ?? (custom.code ? parseTrackCode(custom.code) : null) ?? DEFAULT_TRACK_SEGMENTS.dice;
    return {
      id: custom.id ?? custom.name.toLowerCase().replace(/\s+/g, '-'),
      name: custom.name,
      country: custom.country || 'Custom 🏁',
      description: custom.description || 'Custom crafted player circuit.',
      difficulty: custom.difficulty || 'Intermediate',
      lapsDefault: custom.lapsDefault || 2,
      segments: segs,
      sections: parsedSections,
    };
  }

  return TRACK_PRESETS[0];
}

export function getAllAvailableTracks(): TrackDefinition[] {
  const custom = loadSavedCustomTracks();
  const customDefs: TrackDefinition[] = custom.map((c) => {
    const parsedSections =
      c.sections ?? (c.code ? parseSectionTrackCode(c.code) ?? undefined : undefined);
    const segs =
      c.segments ?? (c.code ? parseTrackCode(c.code) : null) ?? DEFAULT_TRACK_SEGMENTS.dice;
    return {
      id: c.id ?? c.name.toLowerCase().replace(/\s+/g, '-'),
      name: c.name,
      country: c.country || 'Custom 🏁',
      description: c.description || 'Custom crafted player circuit.',
      difficulty: c.difficulty || 'Intermediate',
      lapsDefault: c.lapsDefault || 2,
      segments: segs,
      sections: parsedSections,
    };
  });
  return [...TRACK_PRESETS, ...customDefs];
}

export function getDailyTrack(dateStr?: string): TrackDefinition {
  const all = getAllAvailableTracks();
  const date = dateStr ? new Date(dateStr) : new Date();
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const index = Math.abs(seed) % all.length;
  return all[index];
}

export function loadStoredTrack(mode: string = 'dice'): string[] {
  try {
    const raw = localStorage.getItem('slip_cur');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed[mode]) {
        const validated = parseTrackCode(parsed[mode].join('/'));
        if (validated) return validated;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_TRACK_SEGMENTS.dice;
}

export function saveStoredTrack(modeOrSegments: string | string[], maybeSegments?: string[]) {
  try {
    const segments = Array.isArray(modeOrSegments) ? modeOrSegments : (maybeSegments ?? DEFAULT_TRACK_SEGMENTS.dice);
    const mode = typeof modeOrSegments === 'string' ? modeOrSegments : 'dice';
    let currentData: Record<string, string[]> = {};
    const raw = localStorage.getItem('slip_cur');
    if (raw) currentData = JSON.parse(raw);
    currentData[mode] = segments;
    localStorage.setItem('slip_cur', JSON.stringify(currentData));
  } catch {
    // ignore
  }
}
