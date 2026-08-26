import type { Classification, OutcomeType } from '../types';

const earnedOutcomes = new Set<OutcomeType>(['Ace', 'Kill', 'Block', 'Forced Error']);
const giftedOutcomes = new Set<OutcomeType>([
  'Serve Error',
  'Attack Error',
  'Ball Handling Error',
  'Net / Line Violation',
  'Free Ball Error',
  'Other',
]);

export const classifyTerminalOutcome = (outcome: OutcomeType): Classification => {
  if (earnedOutcomes.has(outcome)) return 'Earned';
  if (giftedOutcomes.has(outcome)) return 'Gifted';
  return 'Neutral';
};

export const isEarnedOutcome = (outcome: OutcomeType) => earnedOutcomes.has(outcome);
