import type { RefereeAwardOption } from '../../../packages/schemas/src/index.js'
import { createSeededRng } from '../../../packages/sim/src/index.js'

const DEFAULT_INTEREST_RATE = 0.1
const DEFAULT_INTEREST_CAP = 25

type RefereeAwardCard = {
  id: string
  title: string
  description: string
  gold: number
}

const REFEREE_AWARD_CARDS: RefereeAwardCard[] = [
  {
    id: 'most-stylish',
    title: 'Most Stylish',
    description: 'Readable silhouette, memorable identity, and enough restraint to still look engineered.',
    gold: 25,
  },
  {
    id: 'coolest-idea',
    title: 'Coolest Idea',
    description: 'The build tried something specific instead of drifting into generic weapon mass.',
    gold: 20,
  },
  {
    id: 'best-engineering',
    title: 'Best Engineering',
    description: 'The design had the cleanest relationship between parts, motion, and fight plan.',
    gold: 25,
  },
  {
    id: 'budget-genius',
    title: 'Budget Genius',
    description: 'The team preserved economy without submitting a throwaway machine.',
    gold: 20,
  },
  {
    id: 'most-chaotic',
    title: 'Most Chaotic',
    description: 'The fight became stranger because this bot existed, and that deserves a sponsor.',
    gold: 20,
  },
  {
    id: 'best-use-of-parts',
    title: 'Best Use of Parts',
    description: 'Parts were arranged with intent instead of merely spending the available budget.',
    gold: 25,
  },
  {
    id: 'funniest-bot',
    title: 'Funniest Bot',
    description: 'The machine made a bad idea legible enough to become entertaining.',
    gold: 20,
  },
  {
    id: 'most-improved',
    title: 'Most Improved',
    description: 'This round showed clearer adaptation than the previous submitted approach.',
    gold: 25,
  },
  {
    id: 'best-counterbuild',
    title: 'Best Counterbuild',
    description: 'The bot answered the opponent instead of pretending the matchup did not exist.',
    gold: 25,
  },
  {
    id: 'sponsor-favorite',
    title: 'Sponsor Favorite',
    description: 'The broadcast booth can explain this bot in one sentence and sell the shirt.',
    gold: 20,
  },
]

export function calculateInterest(unspentGold: number): number {
  return Math.min(
    Math.floor(Math.max(0, unspentGold) * DEFAULT_INTEREST_RATE),
    DEFAULT_INTEREST_CAP,
  )
}

export function generateRefereeAwardOptions(
  seed: string,
  round: number,
): RefereeAwardOption[] {
  const rng = createSeededRng(`${seed}:awards:${round}`)
  const cards = [...REFEREE_AWARD_CARDS]
  const options: RefereeAwardOption[] = []

  while (options.length < 3 && cards.length > 0) {
    const index = Math.floor(rng() * cards.length)
    const [card] = cards.splice(index, 1)

    options.push({
      id: `${card.id}-r${round}`,
      title: card.title,
      description: card.description,
      gold: card.gold,
    })
  }

  return options
}
