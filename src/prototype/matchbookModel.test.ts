import { describe, expect, it } from 'vitest';
import {
  buildRally,
  deriveSetState,
  formatRatio,
  getWinnerForEvent,
  summarizeSet,
  type ErrorSubtype,
  type PendingRallyInput,
  type PrototypePlayer,
  type RallyRecord,
  type SetSetup,
  type TerminalEvent,
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

const scriptedPlayers: PrototypePlayer[] = [
  { id: 'p1', number: '1', name: 'Avery', active: true },
  { id: 'p2', number: '2', name: 'Blake', active: true },
  { id: 'p3', number: '3', name: 'Casey', active: true },
  { id: 'p4', number: '4', name: 'Drew', active: true },
  { id: 'p5', number: '5', name: 'Emerson', active: true },
  { id: 'p6', number: '6', name: 'Finley', active: true },
];

const scriptedSetup: SetSetup = {
  opponent: 'Liberty',
  setNumber: 1,
  initialMode: 'serving',
  initialRotation: 1,
  initialServerId: 'p1',
  lineup: { 1: 'p1', 2: 'p2', 3: 'p3', 4: 'p4', 5: 'p5', 6: 'p6' },
  rotationServers: { 1: 'p1', 2: 'p2', 3: 'p3', 4: 'p4', 5: 'p5', 6: 'p6' },
};

type ScriptedRally = {
  event: TerminalEvent;
  creditedPlayerId?: string;
  chargedPlayerId?: string;
  errorSubtype?: ErrorSubtype;
  teamAttribution?: boolean;
};

const scriptedSet: ScriptedRally[] = [
  { event: 'century_ace' },
  { event: 'century_kill', creditedPlayerId: 'p2' },
  { event: 'opponent_kill' },
  { event: 'opponent_block' },
  { event: 'opponent_error', errorSubtype: 'Serve' },
  { event: 'century_block', teamAttribution: true },
  { event: 'serve_error' },
  { event: 'century_kill', creditedPlayerId: 'p3' },
  { event: 'century_ace' },
  { event: 'attack_error', chargedPlayerId: 'p4' },
  { event: 'opponent_kill' },
  { event: 'receive_error', chargedPlayerId: 'p5' },
  { event: 'century_kill', creditedPlayerId: 'p2' },
  { event: 'century_block', creditedPlayerId: 'p6' },
  { event: 'serve_error' },
  { event: 'opponent_kill' },
  { event: 'opponent_error', errorSubtype: 'Attack' },
  { event: 'opponent_block' },
  { event: 'century_kill', creditedPlayerId: 'p1' },
  { event: 'century_ace' },
  { event: 'century_kill', creditedPlayerId: 'p3' },
  { event: 'attack_error', chargedPlayerId: 'p4' },
  { event: 'opponent_kill' },
  { event: 'century_block', creditedPlayerId: 'p5' },
  { event: 'century_ace' },
  { event: 'serve_error' },
  { event: 'century_kill', creditedPlayerId: 'p2' },
  { event: 'opponent_error', errorSubtype: 'Other' },
  { event: 'receive_error', chargedPlayerId: 'p1' },
  { event: 'opponent_kill' },
  { event: 'opponent_block' },
  { event: 'century_block', creditedPlayerId: 'p6' },
  { event: 'century_ace' },
  { event: 'serve_error' },
  { event: 'century_kill', creditedPlayerId: 'p3' },
  { event: 'century_ace' },
  { event: 'violation', chargedPlayerId: 'p4' },
  { event: 'opponent_kill' },
  { event: 'opponent_error', errorSubtype: 'Attack' },
  { event: 'century_block', teamAttribution: true },
  { event: 'serve_error' },
  { event: 'century_kill', creditedPlayerId: 'p5' },
  { event: 'century_ace' },
  { event: 'opponent_block' },
  { event: 'century_kill', creditedPlayerId: 'p2' },
];

const buildScriptedSet = () =>
  scriptedSet.reduce<RallyRecord[]>((rallies, item, index) => {
    const input: PendingRallyInput = {
      winner: getWinnerForEvent(item.event),
      ...item,
    };

    return [
      ...rallies,
      buildRally(
        scriptedSetup,
        rallies,
        input,
        () => `scripted-${index + 1}`,
        () => `2026-09-03T00:${String(index).padStart(2, '0')}:00.000Z`,
      ),
    ];
  }, []);

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

  it('keeps score, rotation, and live report totals stable across a realistic 25-20 set', () => {
    const rallies = buildScriptedSet();
    const finalState = deriveSetState(scriptedSetup, rallies);
    const summary = summarizeSet(rallies, scriptedPlayers);

    expect(rallies).toHaveLength(45);
    expect(finalState).toMatchObject({
      centuryScore: 25,
      opponentScore: 20,
    });
    expect(summary.team).toMatchObject({
      earnedPoints: 21,
      giftsReceived: 4,
      opponentEarnedPoints: 10,
      giftsConceded: 10,
    });
    expect(summary.team.earnedByType).toEqual([
      { key: 'century_kill', label: 'Kills', total: 9 },
      { key: 'century_ace', label: 'Aces', total: 7 },
      { key: 'century_block', label: 'Blocks', total: 5 },
    ]);
    expect(summary.team.giftsConcededByType).toEqual([
      { key: 'serve_error', label: 'Serving', total: 5 },
      { key: 'attack_error', label: 'Attacking', total: 2 },
      { key: 'receive_error', label: 'Serve Receive', total: 2 },
      { key: 'violation', label: 'Violations', total: 1 },
    ]);
    expect(summary.team.breakpoint.attempts + summary.team.sideout.attempts).toBe(45);

    const p2 = summary.players.find((player) => player.playerId === 'p2');
    expect(p2).toMatchObject({
      earnedPoints: 4,
      giftsConceded: 1,
      balance: 3,
      earnedByType: [{ key: 'century_kill', label: 'Kills', total: 4 }],
      giftsConcededByType: [{ key: 'serve_error', label: 'Serving', total: 1 }],
    });

    const p4 = summary.players.find((player) => player.playerId === 'p4');
    expect(p4).toMatchObject({
      earnedPoints: 1,
      giftsConceded: 4,
      balance: -3,
      earnedByType: [{ key: 'century_ace', label: 'Aces', total: 1 }],
    });
  });

  it('recalculates the scripted set cleanly after undo and correction edits', () => {
    const rallies = buildScriptedSet();
    const withoutLastRally = rallies.slice(0, -1);
    const correctedRallies = rallies.map((rally) =>
      rally.sequence === 44
        ? {
            ...rally,
            winner: 'century' as const,
            event: 'opponent_error' as const,
            errorSubtype: 'Other' as const,
          }
        : rally,
    );

    expect(deriveSetState(scriptedSetup, withoutLastRally)).toMatchObject({
      centuryScore: 24,
      opponentScore: 20,
    });
    expect(deriveSetState(scriptedSetup, correctedRallies)).toMatchObject({
      centuryScore: 26,
      opponentScore: 19,
    });
    expect(summarizeSet(correctedRallies, scriptedPlayers).team).toMatchObject({
      giftsReceived: 5,
      opponentEarnedPoints: 9,
    });
  });
});
