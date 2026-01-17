export type Skill = {
  id: string;
  name: string;
  category: string;
  description: string;
  duration?: string;
  prerequisites?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  videoUrl?: string;
  exercises?: string[];
};

export interface SkillCategory {
  category: string;
  skills: Skill[];
}

// Comprehensive guitar learning roadmap, curated from best practices and tutorials
export const LEARNING_ROAMMAP: SkillCategory[] = [
  {
    category: 'Getting Started',
    skills: [
      {
        id: 'guitar-basics',
        name: 'Guitar Basics: Holding, Tuning, and Posture',
        category: 'basics',
        description: 'Learn proper guitar holding, tuning methods, and playing posture.',
        duration: '1 week',
        difficulty: 'beginner'
      },
      {
        id: 'basic-notes',
        name: 'Basic Notes and Fretboard Navigation',
        category: 'basics',
        description: 'Understand note names, fretboard layout, and basic navigation.',
        duration: '1 week',
        difficulty: 'beginner'
      }
    ]
  },
  {
    category: 'Chords & Transitions',
    skills: [
      {
        id: 'open-chords',
        name: 'Open Chords (C G D Em Am)',
        category: 'chords',
        description: 'Master common open-position chords and smooth transitions.',
        duration: '2 weeks',
        difficulty: 'beginner'
      },
      {
        id: 'power-chords',
        name: 'Power Chords',
        category: 'chords',
        description: 'Learn barre and open power chord shapes for rock/metal.',
        duration: '1 week',
        difficulty: 'beginner',
        prerequisites: ['open-chords']
      },
      {
        id: 'barre-chords',
        name: 'Barre Chords Basics',
        category: 'chords',
        description: 'Learn to form barre shapes and move between them cleanly.',
        duration: '3 weeks',
        difficulty: 'intermediate',
        prerequisites: ['open-chords']
      },
      {
        id: '7th-chords',
        name: '7th Chords (Maj7, m7, Dom7)',
        category: 'chords',
        description: 'Advanced chord voicings for jazz and complex progressions.',
        duration: '2 weeks',
        difficulty: 'intermediate',
        prerequisites: ['barre-chords']
      }
    ]
  },
  {
    category: 'Rhythm & Timing',
    skills: [
      {
        id: 'strumming-patterns',
        name: 'Strumming Patterns',
        category: 'rhythm',
        description: 'Practice common strumming patterns and tempo control.',
        duration: '2 weeks',
        difficulty: 'beginner'
      },
      {
        id: 'fingerpicking',
        name: 'Fingerpicking Basics',
        category: 'rhythm',
        description: 'Develop fingerpicking technique with simple patterns.',
        duration: '2 weeks',
        difficulty: 'intermediate'
      },
      {
        id: 'fingerstyle',
        name: 'Fingerstyle Guitar',
        category: 'rhythm',
        description: 'Classical and folk fingerstyle techniques.',
        duration: '4 weeks',
        difficulty: 'advanced',
        prerequisites: ['fingerpicking']
      },
      {
        id: 'percussive-techniques',
        name: 'Percussive Techniques',
        category: 'rhythm',
        description: 'Slap, tap, and percussive guitar methods.',
        duration: '2 weeks',
        difficulty: 'intermediate'
      }
    ]
  },
  {
    category: 'Music Theory',
    skills: [
      {
        id: 'key-signatures',
        name: 'Key Signatures & Scales',
        category: 'theory',
        description: 'Learn major/minor scales and key signatures relevant to guitar.',
        duration: '2 weeks',
        difficulty: 'beginner'
      },
      {
        id: 'circle-of-fifths',
        name: 'Circle of Fifths',
        category: 'theory',
        description: 'Understand relationships between keys and transpose with ease.',
        duration: '2 weeks',
        difficulty: 'intermediate'
      },
      {
        id: 'chord-progressions',
        name: 'Common Chord Progressions',
        category: 'theory',
        description: 'I-IV-V, ii-V-I, and other progressions in all keys.',
        duration: '3 weeks',
        difficulty: 'intermediate',
        prerequisites: ['key-signatures']
      },
      {
        id: 'harmonic-analysis',
        name: 'Harmonic Analysis',
        category: 'theory',
        description: 'Analyze songs and understand chord functions.',
        duration: '4 weeks',
        difficulty: 'advanced',
        prerequisites: ['chord-progressions']
      }
    ]
  },
  {
    category: 'Soloing & Lead Guitar',
    skills: [
      {
        id: 'pentatonic-scale',
        name: 'Pentatonic Scale',
        category: 'solo',
        description: 'Master the minor pentatonic scale for blues/rock solos.',
        duration: '2 weeks',
        difficulty: 'beginner'
      },
      {
        id: 'blues-scale',
        name: 'Blues Scale',
        category: 'solo',
        description: 'Blues scale patterns and bends for expressive solos.',
        duration: '2 weeks',
        difficulty: 'intermediate',
        prerequisites: ['pentatonic-scale']
      },
      {
        id: 'major-scale-modes',
        name: 'Major Scale & Modes',
        category: 'solo',
        description: 'Dorian, Mixolydian, and other modes for jazz/fusion.',
        duration: '4 weeks',
        difficulty: 'advanced',
        prerequisites: ['blues-scale']
      },
      {
        id: 'arpeggios',
        name: 'Arpeggios',
        category: 'solo',
        description: 'Chord-tone arpeggios for melodic soloing.',
        duration: '3 weeks',
        difficulty: 'intermediate'
      },
      {
        id: 'sweeping',
        name: 'Sweeping Arpeggios',
        category: 'solo',
        description: 'Fast arpeggio sweeps for shred guitar.',
        duration: '2 weeks',
        difficulty: 'advanced',
        prerequisites: ['arpeggios']
      }
    ]
  },
  {
    category: 'Technique Mastery',
    skills: [
      {
        id: 'hammer-ons',
        name: 'Hammer-ons & Pull-offs',
        category: 'technique',
        description: 'Build speed and accuracy with legato techniques.',
        duration: '1 week',
        difficulty: 'beginner'
      },
      {
        id: 'slides',
        name: 'Slides & Bends',
        category: 'technique',
        description: 'Add expressive phrasing with slides and bends.',
        duration: '1 week',
        difficulty: 'beginner'
      },
      {
        id: 'vibrato',
        name: 'Vibrato Techniques',
        category: 'technique',
        description: 'Develop smooth and controlled vibrato.',
        duration: '1 week',
        difficulty: 'intermediate'
      },
      {
        id: 'tapping',
        name: 'Two-Handed Tapping',
        category: 'technique',
        description: 'Eddie Van Halen style tapping techniques.',
        duration: '2 weeks',
        difficulty: 'advanced'
      },
      {
        id: 'alternate-picking',
        name: 'Alternate Picking',
        category: 'technique',
        description: 'Fast, accurate alternate picking for speed.',
        duration: '2 weeks',
        difficulty: 'intermediate'
      },
      {
        id: 'economy-picking',
        name: 'Economy Picking',
        category: 'technique',
        description: 'Efficient picking patterns for complex riffs.',
        duration: '3 weeks',
        difficulty: 'advanced',
        prerequisites: ['alternate-picking']
      }
    ]
  },
  {
    category: 'Song Learning',
    skills: [
      {
        id: 'tab-reading',
        name: 'Reading Guitar Tabs',
        category: 'learning',
        description: 'Learn to read and understand guitar tablature.',
        duration: '1 week',
        difficulty: 'beginner'
      },
      {
        id: 'ear-training',
        name: 'Ear Training',
        category: 'learning',
        description: 'Develop relative pitch and chord recognition.',
        duration: '4 weeks',
        difficulty: 'intermediate'
      },
      {
        id: 'song-analysis',
        name: 'Song Analysis & Breakdown',
        category: 'learning',
        description: 'Break down songs into components and learn systematically.',
        duration: '2 weeks',
        difficulty: 'intermediate',
        prerequisites: ['tab-reading']
      }
    ]
  }
];

export default LEARNING_ROAMMAP;
