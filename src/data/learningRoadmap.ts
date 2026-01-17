export type Skill = {
  id: string;
  name: string;
  category: string;
  description: string;
  duration?: string;
  prerequisites?: string[];
};

export interface SkillCategory {
  category: string;
  skills: Skill[];
}

export const LEARNING_ROAMMAP: SkillCategory[] = [
  {
    category: 'Chords & Transitions',
    skills: [
      {
        id: 'open-chords',
        name: 'Open Chords (C G D Em Am)',
        category: 'chords',
        description: 'Master common open-position chords and smooth transitions.',
        duration: '2 weeks'
      },
      {
        id: 'barre-chords',
        name: 'Barre Chords Basics',
        category: 'chords',
        description: 'Learn to form barre shapes and move between them cleanly.',
        duration: '3 weeks',
        prerequisites: ['open-chords']
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
        duration: '2 weeks'
      },
      {
        id: 'fingerpicking',
        name: 'Fingerpicking Basics',
        category: 'rhythm',
        description: 'Develop fingerpicking technique with simple patterns.',
        duration: '2 weeks'
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
        duration: '2 weeks'
      },
      {
        id: 'circle-of-fifths',
        name: 'Circle of Fifths',
        category: 'theory',
        description: 'Understand relationships between keys and transpose with ease.',
        duration: '2 weeks',
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
        duration: '1 week'
      },
      {
        id: 'slides',
        name: 'Slides & Bends',
        category: 'technique',
        description: 'Add expressive phrasing with slides and bends.',
        duration: '1 week'
      }
    ]
  }
];

export default LEARNING_ROAMMAP;
