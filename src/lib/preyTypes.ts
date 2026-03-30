export const PREY_TYPES = [
  {
    category: 'Rodents',
    items: [
      { name: 'Rat', sizes: ['Pinky', 'Fuzzy', 'Pup', 'Small', 'Medium', 'Large', 'X-Large', 'Jumbo'] },
      { name: 'Mouse', sizes: ['Pinky', 'Fuzzy', 'Hopper', 'Small', 'Medium', 'Large', 'X-Large'] },
      { name: 'Multimammate mouse', sizes: ['Pinky', 'Fuzzy', 'Small', 'Medium', 'Large'] },
      { name: 'Gerbil', sizes: ['Pinky', 'Small', 'Medium', 'Large'] },
      { name: 'Guinea pig', sizes: ['Pup', 'Small', 'Medium', 'Large'] },
      { name: 'Rabbit', sizes: ['Pinky', 'Pup', 'Small', 'Medium', 'Large'] },
    ],
  },
  {
    category: 'Insects',
    items: [
      { name: 'Dubia roach', sizes: ['Small', 'Medium', 'Large', 'Adult'] },
      { name: 'Cricket', sizes: ['Pin head', 'Small', 'Medium', 'Large', 'Adult'] },
      { name: 'Mealworm', sizes: ['Small', 'Medium', 'Large', 'Giant'] },
      { name: 'Superworm', sizes: ['Small', 'Medium', 'Large'] },
      { name: 'Waxworm', sizes: [] },
      { name: 'Black soldier fly larvae', sizes: ['Small', 'Medium', 'Large'] },
      { name: 'Silkworm', sizes: ['Small', 'Medium', 'Large'] },
      { name: 'Hornworm', sizes: ['Small', 'Medium', 'Large'] },
      { name: 'Locust', sizes: ['Small', 'Medium', 'Large', 'Adult'] },
      { name: 'Fruit fly', sizes: ['Melanogaster', 'Hydei'] },
    ],
  },
  {
    category: 'Other prey',
    items: [
      { name: 'Chick', sizes: ['Day-old', 'Small', 'Medium', 'Large'] },
      { name: 'Quail', sizes: ['Egg', 'Chick', 'Adult'] },
      { name: 'Fish', sizes: ['Small', 'Medium', 'Large'] },
      { name: 'Snail', sizes: ['Small', 'Medium', 'Large'] },
    ],
  },
  {
    category: 'Salad & vegetation',
    items: [
      { name: 'Salad mix', sizes: [] },
      { name: 'Collard greens', sizes: [] },
      { name: 'Mustard greens', sizes: [] },
      { name: 'Endive', sizes: [] },
      { name: 'Squash', sizes: [] },
    ],
  },
] as const

export function getPreySizes(preyName: string): string[] {
  for (const cat of PREY_TYPES) {
    const item = cat.items.find((i) => i.name === preyName)
    if (item) return [...item.sizes]
  }
  return []
}

export const ALL_PREY_NAMES = PREY_TYPES.flatMap((cat) => cat.items.map((i) => i.name))
