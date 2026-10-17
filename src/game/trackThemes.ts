export interface TrackTheme {
  id: string;
  name: string;
  country: string;
  landmark: string;
  locationDetails: string;
  weatherFlavour: string;
  image: string;
  accentColor: string;
  accentHex: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  infieldGradient: {
    start: string;
    mid: string;
    end: string;
  };
  infieldFillOpacity: number;
  infieldStroke: string;
  ambientBg: string;
  pageGradient: string;
  terrainType: 'mountain' | 'countryside' | 'riviera' | 'speedway' | 'grandprix';
  kerbPrimary: string;
  kerbSecondary: string;
  asphaltColor: string;
  asphaltStroke: string;
  gravelColor: string;
}

export const TRACK_THEMES: Record<string, TrackTheme> = {
  bathurst: {
    id: 'bathurst',
    name: 'Bathurst',
    country: 'Australia 🇦🇺',
    landmark: 'Mount Panorama',
    locationDetails: 'Blue Mountains & The Cutting · Bathurst, NSW',
    weatherFlavour: 'Golden Hour Sunset · 26°C · Track Temp 41°C',
    image: '/src/assets/images/backdrop_bathurst_1792182799477.jpg',
    accentColor: 'amber-400',
    accentHex: '#f59e0b',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-500/50',
    badgeText: 'text-amber-300',
    infieldGradient: {
      start: '#78350f', // Warm Australian red sandstone
      mid: '#451a03',   // Deep outback clay
      end: '#1c1917',   // Mountain shadow
    },
    infieldFillOpacity: 0.72,
    infieldStroke: 'rgba(245, 158, 11, 0.35)',
    ambientBg: 'from-[#2e1708] via-[#1c1109] to-[#0c0a09]',
    pageGradient: 'from-amber-950/70 via-stone-950 to-stone-950',
    terrainType: 'mountain',
    kerbPrimary: '#dc2626',
    kerbSecondary: '#f8fafc',
    asphaltColor: '#1a1f26',
    asphaltStroke: '#64748b',
    gravelColor: '#b45309',
  },
  'brands-hatch': {
    id: 'brands-hatch',
    name: 'Brands Hatch',
    country: 'United Kingdom 🇬🇧',
    landmark: 'Kent Countryside',
    locationDetails: 'Pilgrims Drop, Druids & Dingle Dell · Kent, UK',
    weatherFlavour: 'British Afternoon · 19°C · Rolling Hills Breeze',
    image: '/src/assets/images/backdrop_brands_hatch_1792182813874.jpg',
    accentColor: 'emerald-400',
    accentHex: '#10b981',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/50',
    badgeText: 'text-emerald-300',
    infieldGradient: {
      start: '#15803d', // English meadow turf
      mid: '#14532d',   // Deep Kent woodland
      end: '#064e3b',   // British racing pine
    },
    infieldFillOpacity: 0.75,
    infieldStroke: 'rgba(16, 185, 129, 0.35)',
    ambientBg: 'from-[#0d2a1b] via-[#091b12] to-[#080f0c]',
    pageGradient: 'from-emerald-950/70 via-stone-950 to-stone-950',
    terrainType: 'countryside',
    kerbPrimary: '#dc2626',
    kerbSecondary: '#f8fafc',
    asphaltColor: '#171d26',
    asphaltStroke: '#526173',
    gravelColor: '#d97706',
  },
  monaco: {
    id: 'monaco',
    name: 'Monaco',
    country: 'Monaco 🇲🇨',
    landmark: 'Port Hercules Marina',
    locationDetails: 'Monte-Carlo Riviera & Yacht Harbour · Monaco',
    weatherFlavour: 'Mediterranean Sun · 24°C · Azure Sea Breeze',
    image: '/src/assets/images/backdrop_monaco_1792182830257.jpg',
    accentColor: 'sky-400',
    accentHex: '#38bdf8',
    badgeBg: 'bg-sky-500/20',
    badgeBorder: 'border-sky-500/50',
    badgeText: 'text-sky-300',
    infieldGradient: {
      start: '#0284c7', // Mediterranean azure sea
      mid: '#0369a1',   // Deep harbour turquoise
      end: '#0c4a6e',   // Riviera coastal blue
    },
    infieldFillOpacity: 0.75,
    infieldStroke: 'rgba(56, 189, 248, 0.4)',
    ambientBg: 'from-[#082f49] via-[#0b1f33] to-[#06101c]',
    pageGradient: 'from-sky-950/75 via-slate-950 to-stone-950',
    terrainType: 'riviera',
    kerbPrimary: '#dc2626',
    kerbSecondary: '#f8fafc',
    asphaltColor: '#191f2c',
    asphaltStroke: '#586b85',
    gravelColor: '#ea580c',
  },
  speedway: {
    id: 'speedway',
    name: 'Indianapolis Speedway',
    country: 'USA 🇺🇸',
    landmark: 'The Brickyard',
    locationDetails: 'Yard of Bricks & Pagoda · Indianapolis, IN',
    weatherFlavour: 'Summer Sunshine · 29°C · Clear & Fast Track',
    image: '/src/assets/images/backdrop_indianapolis_1792182829987.jpg',
    accentColor: 'red-500',
    accentHex: '#ef4444',
    badgeBg: 'bg-red-500/20',
    badgeBorder: 'border-red-500/50',
    badgeText: 'text-red-300',
    infieldGradient: {
      start: '#15803d', // Pristine fairway lawn
      mid: '#166534',   // Infield turf stripes
      end: '#0f381e',   // Speedway interior shadow
    },
    infieldFillOpacity: 0.75,
    infieldStroke: 'rgba(239, 68, 68, 0.35)',
    ambientBg: 'from-[#331118] via-[#1f0b0f] to-[#0d0709]',
    pageGradient: 'from-red-950/65 via-stone-950 to-stone-950',
    terrainType: 'speedway',
    kerbPrimary: '#dc2626',
    kerbSecondary: '#f8fafc',
    asphaltColor: '#181e28',
    asphaltStroke: '#59697f',
    gravelColor: '#b45309',
  },
};

export const DEFAULT_THEME: TrackTheme = {
  id: 'custom',
  name: 'Grand Prix Circuit',
  country: 'International 🏁',
  landmark: 'Grand Prix Arena',
  locationDetails: 'International Autodrome Grand Prix Facility',
  weatherFlavour: 'Race Day Conditions · 22°C · Dry Track',
  image: '/src/assets/images/backdrop_brands_hatch_1792182813874.jpg',
  accentColor: 'amber-400',
  accentHex: '#f59e0b',
  badgeBg: 'bg-amber-500/20',
  badgeBorder: 'border-amber-500/50',
  badgeText: 'text-amber-300',
  infieldGradient: {
    start: '#15803d',
    mid: '#14532d',
    end: '#064e3b',
  },
  infieldFillOpacity: 0.7,
  infieldStroke: 'rgba(245, 158, 11, 0.3)',
  ambientBg: 'from-[#172554] via-[#0f172a] to-[#020617]',
  pageGradient: 'from-slate-900 via-stone-950 to-stone-950',
  terrainType: 'grandprix',
  kerbPrimary: '#dc2626',
  kerbSecondary: '#ffffff',
  asphaltColor: '#181f2a',
  asphaltStroke: '#586b85',
  gravelColor: '#d97706',
};

export function getTrackTheme(trackId: string): TrackTheme {
  const normalized = trackId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  if (TRACK_THEMES[trackId]) return TRACK_THEMES[trackId];
  if (TRACK_THEMES[normalized]) return TRACK_THEMES[normalized];
  if (trackId.includes('bathurst')) return TRACK_THEMES['bathurst'];
  if (trackId.includes('brands') || trackId.includes('hatch')) return TRACK_THEMES['brands-hatch'];
  if (trackId.includes('monaco')) return TRACK_THEMES['monaco'];
  if (trackId.includes('speedway') || trackId.includes('indianapolis')) return TRACK_THEMES['speedway'];
  return DEFAULT_THEME;
}
