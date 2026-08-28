import { describe, expect, it } from 'vitest';
import type { RallyEvent } from '../types';
import { getReceivePlayerId, getReceiveResult, getServeResult } from './rallyResults';

const rally = (overrides: Partial<RallyEvent>): RallyEvent => ({
  id: 'r1',
  matchId: 'm1',
  setId: 's1',
  rallyNumber: 1,
  scoreBeforeUs: 0,
  scoreBeforeOpponent: 0,
  scoreAfterUs: 1,
  scoreAfterOpponent: 0,
  pointWinner: 'Us',
  servingTeam: 'Us',
  outcomeType: 'Ace',
  classification: 'Earned',
  createdAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('rally result helpers', () => {
  it('only counts our serve results when our team served', () => {
    expect(getServeResult(rally({ servingTeam: 'Us', serveResult: 'Out-of-System' }))).toBe('Out-of-System');
    expect(getServeResult(rally({ servingTeam: 'Opponent', serveResult: 'Out-of-System' }))).toBeUndefined();
  });

  it('only counts receive results when the opponent served', () => {
    expect(getReceiveResult(rally({ servingTeam: 'Opponent', receiveResult: 'In-System' }))).toBe('In-System');
    expect(getReceiveResult(rally({ servingTeam: 'Us', receiveResult: 'In-System' }))).toBeUndefined();
  });

  it('infers opponent aces as receive errors', () => {
    expect(getReceiveResult(rally({
      servingTeam: 'Opponent',
      outcomeType: 'Ace',
      pointWinner: 'Opponent',
    }))).toBe('Error');
  });

  it('infers receiver attribution for legacy opponent ace rows', () => {
    expect(getReceivePlayerId(rally({
      servingTeam: 'Opponent',
      outcomeType: 'Ace',
      pointWinner: 'Opponent',
      playerId: 'p6',
    }))).toBe('p6');
  });
});
