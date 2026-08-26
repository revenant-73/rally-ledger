import { describe, expect, it } from 'vitest';
import { classifyTerminalOutcome } from './pointClassification';

describe('pointClassification', () => {
  it('classifies terminal scoring actions as earned by the point winner', () => {
    expect(classifyTerminalOutcome('Ace')).toBe('Earned');
    expect(classifyTerminalOutcome('Kill')).toBe('Earned');
    expect(classifyTerminalOutcome('Block')).toBe('Earned');
    expect(classifyTerminalOutcome('Forced Error')).toBe('Earned');
  });

  it('classifies errors as gifted by the team that lost the point', () => {
    expect(classifyTerminalOutcome('Serve Error')).toBe('Gifted');
    expect(classifyTerminalOutcome('Attack Error')).toBe('Gifted');
    expect(classifyTerminalOutcome('Ball Handling Error')).toBe('Gifted');
    expect(classifyTerminalOutcome('Net / Line Violation')).toBe('Gifted');
    expect(classifyTerminalOutcome('Free Ball Error')).toBe('Gifted');
  });
});
