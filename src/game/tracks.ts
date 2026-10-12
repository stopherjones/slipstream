import { TrackDefinition } from '../types/game';

export const DEFAULT_TRACK_SEGMENTS = {
  dice: ['TTTT', 'CC', 'TTTSSST', 'CC', 'TTSSSTT', 'CC', 'TTTSSTT', 'CC', 'TTTT'],
  cards: ['TTTT', 'CCC', 'TTTSSSTTTT', 'CCC', 'TTSSSSTTTT', 'CCC', 'TTTSSSTTTT', 'CCC', 'TTTTTTT'],
};

export const TRACK_PRESETS: TrackDefinition[] = [
  {
    id: 'standard-gp',
    name: 'Circuit de Slipstream',
    description: 'The classic balanced circuit with fast straights and tactical bottleneck sectors.',
    difficulty: 'Intermediate',
    segments: ['TTTT', 'CC', 'TTTSSST', 'CC', 'TTSSSTT', 'CC', 'TTTSSTT', 'CC', 'TTTT'],
  },
  {
    id: 'chicanes',
    name: 'Canyon Bottleneck',
    description: 'High-risk technical track with long single-lane zones where overtaking is blocked.',
    difficulty: 'Pro',
    segments: ['TTT', 'CCC', 'SSSSSSS', 'CCC', 'SSSSSSS', 'CCC', 'TTTTTT', 'CCC', 'TTT'],
  },
  {
    id: 'oval-sprint',
    name: 'Speedway Twin-Ring',
    description: 'Fast two-lane layout with short corners emphasizing slipstream drafting.',
    difficulty: 'Beginner',
    segments: ['TTTTT', 'CC', 'TTTTTT', 'CC', 'TTTTTTT', 'CC', 'TTTTTT', 'CC', 'TTTTT'],
  },
];

export const SEGMENT_NAMES = [
  'Start Straight',
  'Corner 1',
  'Right Straight',
  'Corner 2',
  'Top Straight',
  'Corner 3',
  'Left Straight',
  'Corner 4',
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
      if (!/^[TS]{1,14}$/.test(parts[j])) return null;
    }
  }
  // Start straight must begin with a two-lane T space
  if (parts[0][0] !== 'T') return null;
  return parts;
}

export function loadSavedCustomTracks(): { name: string; mode: string; code: string }[] {
  try {
    return JSON.parse(localStorage.getItem('slip_tracks') || '[]');
  } catch {
    return [];
  }
}

export function saveCustomTracks(tracks: { name: string; mode: string; code: string }[]) {
  try {
    localStorage.setItem('slip_tracks', JSON.stringify(tracks));
  } catch {
    // ignore local storage restrictions
  }
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
