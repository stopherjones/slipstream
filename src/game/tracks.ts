import { TrackDefinition, TrackSectionType } from '../types/game';

// -------------------------------------------------------------
// Rectilinear Racing Circuits (Straights, Bottlenecks & 90° Corners)
// -------------------------------------------------------------

export const TRACK_PRESETS: TrackDefinition[] = [
  {
    id: 'monza',
    name: 'Autodromo Nazionale Monza',
    country: 'Italy 🇮🇹',
    description: 'The Temple of Speed. Long slipstream straights, high-speed 90° sweepers, and the tactical Serraglio bottleneck straight.',
    difficulty: 'Beginner',
    lapsDefault: 2,
    sections: [
      'T', 'T', 'T', 'T', 'T',
      'R', 'R',
      'T', 'T', 'T', 'S', 'S', 'S', 'T', 'T', 'T',
      'R', 'R',
      'T', 'T', 'T', 'T', 'T', 'T',
      'R', 'R',
      'T', 'T', 'S', 'S', 'S', 'T', 'T', 'T',
      'R', 'R',
      'T', 'T', 'T', 'T',
    ],
    segments: [
      'TTTTT',     // Start Straight
      'CC',        // Turn 1 (90°)
      'TTTSSSTTT', // Right Straight (Serraglio bottleneck)
      'CC',        // Turn 2 (90°)
      'TTTTTT',    // Top Backstretch
      'CC',        // Turn 3 (90°)
      'TTSSSTTT',  // Left Straight
      'CC',        // Turn 4 (90° Parabolica)
      'TTTT',      // Finish Straight
    ],
  },
    {
    id: 'custom_circuit',
    name: 'Custom Circuit',
    country: 'Custom 🏁',
    description: 'Custom racing circuit with 45° corners.',
    difficulty: 'Intermediate',
    lapsDefault: 2,
    sections: ["T","T","R","T","T","L","S","S","S","L","L","L","L","T","T","R","T","T","L","T","T","S","S","S","L","L","L","L","T","T"],
    segments: [
      'TTTTS',
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
    id: 'silverstone',
    name: 'Silverstone Grand Prix',
    country: 'Great Britain 🇬🇧',
    description: 'Classic British circuit with expansive straights, Wellington single-lane bottleneck, and wide 3-cell 90° corner complexes.',
    difficulty: 'Intermediate',
    lapsDefault: 2,
    sections: [
      'T', 'T', 'T', 'T',
      'R', 'R',
      'T', 'T', 'S', 'S', 'S', 'T',
      'R', 'R',
      'T', 'T', 'T', 'T', 'T', 'T', 'T',
      'R', 'R',
      'T', 'T', 'S', 'S', 'S', 'T',
      'R', 'R',
      'T', 'T', 'T', 'T',
    ],
    segments: [
      'TTTT',    // Start Straight
      'CCC',     // Turn 1 (90° Abbey)
      'TTSSST',  // Right Straight (Wellington)
      'CCC',     // Turn 2 (90° Brooklands)
      'TTTTTTT', // Top Straight (Hangar Straight)
      'CCC',     // Turn 3 (90° Stowe)
      'TTSSST',  // Left Straight (Vale)
      'CCC',     // Turn 4 (90° Club)
      'TTTT',    // Finish Straight
    ],
  },
  {
    id: 'suzuka',
    name: 'Suzuka International',
    country: 'Japan 🇯🇵',
    description: 'Demanding technical circuit with dual extended single-lane bottleneck sections, tight braking zones, and long straights.',
    difficulty: 'Pro',
    lapsDefault: 2,
    sections: [
      'T', 'T', 'T', 'T',
      'R', 'R',
      'T', 'T', 'S', 'S', 'S', 'S', 'S', 'T',
      'R', 'R',
      'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T',
      'R', 'R',
      'T', 'S', 'S', 'S', 'S', 'S', 'T', 'T',
      'R', 'R',
      'T', 'T', 'T', 'T',
    ],
    segments: [
      'TTTT',     // Start Straight
      'CC',       // Turn 1 (90°)
      'TTSSSSST', // Right Straight (Hairpin bottleneck)
      'CCC',      // Turn 2 (90° Spoon)
      'TTTTTTTT', // Top Straight (200R & 130R)
      'CC',       // Turn 3 (90° Casio)
      'TSSSSSTT', // Left Straight (Snake bottleneck)
      'CCC',      // Turn 4 (90°)
      'TTTT',     // Finish Straight
    ],
  },
  {
    id: 'sprint',
    name: 'Red Bull Sprint Ring',
    country: 'Austria 🇦🇹',
    description: 'Ultra-compact 26-space high-speed arena with rapid corner transitions and sharp single-lane chicanes. Fast & intense.',
    difficulty: 'Beginner',
    lapsDefault: 3,
    sections: [
      'T', 'T', 'T',
      'R', 'R',
      'T', 'T', 'S', 'T',
      'R', 'R',
      'T', 'T', 'T', 'T',
      'R', 'R',
      'T', 'S', 'T', 'T',
      'R', 'R',
      'T', 'T', 'T',
    ],
    segments: [
      'TTT',  // Start Straight
      'CC',   // Turn 1 (90°)
      'TTST', // Right Straight
      'CC',   // Turn 2 (90°)
      'TTTT', // Top Straight
      'CC',   // Turn 3 (90°)
      'TSTT', // Left Straight
      'CC',   // Turn 4 (90°)
      'TTT',  // Finish Straight
    ],
  },
  {
    id: 'monaco',
    name: 'Monaco Street Circuit',
    country: 'Monaco 🇲🇨',
    description: 'Ultra-tight harbour course dominated by single-lane bottlenecks where track position, blocking, and drafting are everything.',
    difficulty: 'Pro',
    lapsDefault: 2,
    sections: [
      'T', 'T', 'T',
      'R', 'R',
      'S', 'S', 'T', 'S', 'S',
      'R', 'R',
      'T', 'T', 'T', 'T', 'T',
      'R', 'R',
      'S', 'S', 'S', 'S', 'T',
      'R', 'R',
      'T', 'T', 'T',
    ],
    segments: [
      'TTT',   // Start Straight
      'CC',    // Turn 1 (Sainte Devote)
      'SSTSS', // Right Straight (Casino bottleneck)
      'CC',    // Turn 2 (Mirabeau)
      'TTTTT', // Top Straight (Tunnel)
      'CC',    // Turn 3 (Chicane)
      'SSSST', // Left Straight (Swimming Pool & Rascasse)
      'CC',    // Turn 4 (Anthony Noghes)
      'TTT',   // Finish Straight
    ],
  },
  {
    id: 'speedway',
    name: 'Speedway Twin-Oval',
    country: 'USA 🇺🇸',
    description: 'Massive high-speed drafting circuit with extended straights designed for slipstream leaps, broken by two tactical bottlenecks.',
    difficulty: 'Intermediate',
    lapsDefault: 2,
    sections: [
      'T', 'T', 'T', 'T', 'T', 'T',
      'R', 'R',
      'T', 'T', 'S', 'T', 'T',
      'R', 'R',
      'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T',
      'R', 'R',
      'T', 'T', 'S', 'T', 'T',
      'R', 'R',
      'T', 'T', 'T', 'T', 'T', 'T',
    ],
    segments: [
      'TTTTTT',   // Start Straight
      'CC',       // Turn 1 (90°)
      'TTSTT',    // Right Straight
      'CC',       // Turn 2 (90°)
      'TTTTTTTT', // Top Super-Straight
      'CC',       // Turn 3 (90°)
      'TTSTT',    // Left Straight
      'CC',       // Turn 4 (90°)
      'TTTTTT',   // Finish Straight
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
  const valid = parts.every((p) => p === 'T' || p === 'S' || p === 'L' || p === 'R');
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
      sections: custom.sections,
    };
  }

  return TRACK_PRESETS[0];
}

export function loadStoredTrack(mode: 'dice' | 'cards'): string[] {
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
  return DEFAULT_TRACK_SEGMENTS[mode];
}

export function saveStoredTrack(mode: 'dice' | 'cards', segments: string[]) {
  try {
    let currentData: Record<string, string[]> = {};
    const raw = localStorage.getItem('slip_cur');
    if (raw) currentData = JSON.parse(raw);
    currentData[mode] = segments;
    localStorage.setItem('slip_cur', JSON.stringify(currentData));
  } catch {
    // ignore
  }
}
