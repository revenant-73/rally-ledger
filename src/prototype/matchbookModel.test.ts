import { describe, expect, it } from 'vitest';
import {
  buildRally,
  deriveSetState,
  formatRatio,
  summarizeSet,
  type PrototypePlayer,
  type RallyRecord,
  type SetSetup,
} from './matchbookModel';

const players: PrototypePlayer[] = [
  { id: 'p1', number: '1', name: 'Avery', active: true },
  { id: 'p2', number: '2', name: 'Blake', active: true },
  { id: 'p3', number: '3', name: 'Casey', active: true },
];

const setup: SetSetup = {
  opponent: 'Liberty',
  setNumber: 1,
  initialMode: 'serving',
  initialRotation: 1,
  initialServerId: 'p1',
  rotationServers: { 1: 'p1', 2: 'p2', 3: 'p3' },
};

const add = (
  rallies: RallyRecord[],
  event: Parameters<typeof buildRally>[2]['event'],
  extra: Partial<Parameters<typeof buildRally>[2]> = {},
) => [
  ...rallies,
  buildRally(
    setup,
    rallies,
    { winner: event.startsWith('century') || event === 'opponent_error' ? 'century' : 'opponent', event, ...extra },
    () => `r${rallies.length + 1}`,
    () => `2026-09-03T00:00:0${rallies.length}.000Z`,
  ),
];

describe('matchbook prototype rally model', () => {
  it('handles all four serving and rotation transitions from the rally log', () => {
    let rallies: RallyRecord[] = [];

    rallies = add(rallies, 'century_ace');
    expect(deriveSetState(setup, rallies)).toMatchObject({
      centuryScore: 1,
      opponentScore: 0,
      mode: 'serving',
      rotation: 1,
      serverId: 'p1',
    });

    rallies = add(rallies, 'opponent_kill');
    expect(deriveSetState(setup, rallies)).toMatchObject({
      centuryScore: 1,
      opponentScore: 1,
      mode: 'receiving',
      rotation: 1,
    });

    rallies = add(rallies, 'opponent_block');
    expect(deriveSetState(setup, rallies)).toMatchObject({
      centuryScore: 1,
      opponentScore: 2,
      mode: 'receiving',
      rotation: 1,
    });

    rallies = add(rallies, 'century_kill', { creditedPlayerId: 'p2' });
    expect(deriveSetState(setup, rallies)).toMatchObject({
      centuryScore: 2,
      opponentScore: 2,
      mode: 'serving',
      rotation: 2,
      serverId: 'p2',
    });
  });

  it('recalculates correctly when the last rally is removed', () => {
    const rallies = add(add(add([], 'century_ace'), 'opponent_kill'), 'century_kill', {
      creditedPlayerId: 'p2',
    });

    expect(deriveSetState(setup, rallies)).toMatchObject({ centuryScore: 2, opponentScore: 1, rotation: 2 });
    expect(deriveSetState(setup, rallies.slice(0, -1))).toMatchObject({
      centuryScore: 1,
      opponentScore: 1,
      mode: 'receiving',
      rotation: 1,
    });
  });

  it('summarizes breakpoint, sideout, serving, rotation, and player totals', () => {
    let rallies: RallyRecord[] = [];
    rallies = add(rallies, 'century_ace');
    rallies = add(rallies, 'serve_error');
    rallies = add(rallies, 'century_kill', { creditedPlayerId: 'p2' });
    rallies = add(rallies, 'attack_error', { chargedPlayerId: 'p3' });

    const summary = summarizeSet(rallies, players);

    expect(summary.team.earnedPoints).toBe(2);
    expect(summary.team.giftsConceded).toBe(2);
    expect(summary.team.earnedByType).toEqual([
      { key: 'century_ace', label: 'Aces', total: 1 },
      { key: 'century_kill', label: 'Kills', total: 1 },
    ]);
    expect(summary.team.giftsConcededByType).toEqual([
      { key: 'attack_error', label: 'Attacking', total: 1 },
      { key: 'serve_error', label: 'Serving', total: 1 },
    ]);
    expect(summary.team.breakpoint).toMatchObject({ made: 1, attempts: 3, label: '33%' });
    expect(summary.team.sideout).toMatchObject({ made: 1, attempts: 1, label: '100%' });
    expect(summary.team.serveIn).toMatchObject({ made: 2, attempts: 3, label: '67%' });
    expect(summary.team.ace).toMatchObject({ made: 1, attempts: 3, label: '33%' });
    expect(summary.rotations[0]).toMatchObject({ rallies: 3, won: 2, lost: 1 });
    expect(summary.players.find((player) => player.playerId === 'p1')).toMatchObject({
      serveAttempts: 2,
      aces: 1,
      giftsConceded: 1,
      earnedByType: [{ key: 'century_ace', label: 'Aces', total: 1 }],
      giftsConcededByType: [{ key: 'serve_error', label: 'Serving', total: 1 }],
    });
    expect(summary.players.find((player) => player.playerId === 'p3')).toMatchObject({ giftsConceded: 1 });
  });

  it('uses -- for zero-denominator percentages', () => {
    expect(formatRatio(0, 0).label).toBe('--');
  });
});
