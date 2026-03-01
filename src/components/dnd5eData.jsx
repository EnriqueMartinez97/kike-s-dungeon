// Standard PHB DnD 5e options

export const RACES = [
  'Dragonborn', 'Dwarf (Hill)', 'Dwarf (Mountain)', 'Elf (Dark/Drow)', 'Elf (High)', 'Elf (Wood)',
  'Gnome (Forest)', 'Gnome (Rock)', 'Half-Elf', 'Half-Orc', 'Halfling (Lightfoot)', 'Halfling (Stout)',
  'Human', 'Human (Variant)', 'Tiefling'
];

export const CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
];

export const SUBCLASSES = {
  Barbarian: ['Berserker', 'Totem Warrior'],
  Bard: ['College of Lore', 'College of Valor'],
  Cleric: [
    'Knowledge Domain', 'Life Domain', 'Light Domain', 'Nature Domain',
    'Tempest Domain', 'Trickery Domain', 'War Domain'
  ],
  Druid: ['Circle of the Land', 'Circle of the Moon'],
  Fighter: ['Battle Master', 'Champion', 'Eldritch Knight'],
  Monk: ['Way of the Open Hand', 'Way of Shadow', 'Way of the Four Elements'],
  Paladin: ['Oath of Devotion', 'Oath of the Ancients', 'Oath of Vengeance'],
  Ranger: ['Beast Master', 'Hunter'],
  Rogue: ['Arcane Trickster', 'Assassin', 'Thief'],
  Sorcerer: ['Draconic Bloodline', 'Wild Magic'],
  Warlock: ['The Archfey', 'The Fiend', 'The Great Old One'],
  Wizard: [
    'School of Abjuration', 'School of Conjuration', 'School of Divination',
    'School of Enchantment', 'School of Evocation', 'School of Illusion',
    'School of Necromancy', 'School of Transmutation'
  ]
};

export const BACKGROUNDS = [
  'Acolyte', 'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero',
  'Guild Artisan', 'Hermit', 'Noble', 'Outlander', 'Sage',
  'Sailor', 'Soldier', 'Urchin'
];

export const ALIGNMENTS = [
  { value: 'LG', label: 'Lawful Good' },
  { value: 'NG', label: 'Neutral Good' },
  { value: 'CG', label: 'Chaotic Good' },
  { value: 'LN', label: 'Lawful Neutral' },
  { value: 'N', label: 'True Neutral' },
  { value: 'CN', label: 'Chaotic Neutral' },
  { value: 'LE', label: 'Lawful Evil' },
  { value: 'NE', label: 'Neutral Evil' },
  { value: 'CE', label: 'Chaotic Evil' }
];