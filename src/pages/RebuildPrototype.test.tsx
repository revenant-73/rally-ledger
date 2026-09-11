import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import { useMatch } from '../hooks/useMatch';
import { useAccess } from '../hooks/queries/useAccess';
import {
  buildRally,
  type PendingRallyInput,
  type PrototypeMatchInput,
  type PrototypePlayer,
  type SetSetup,
} from '../prototype/matchbookModel';
import {
  createFreshPrototypeDocument,
  getTeamPrototypeStorageKey,
  PROTOTYPE_METADATA_KEY,
  type PrototypeCloudDocument,
} from '../prototype/prototypeCloudState';
import RebuildPrototype from './RebuildPrototype';

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useMatch', () => ({ useMatch: vi.fn() }));
vi.mock('../hooks/queries/useAccess', () => ({ useAccess: vi.fn() }));

const makeFinishedMatch = (): PrototypeMatchInput => ({
  id: 'finished-match', opponent: 'Central', date: '2026-09-08', result: 'Win', sets: [],
});

const makeScore = (setup: PrototypeCloudDocument['setup'], centuryScore: number, opponentScore: number) => {
  let rallies: PrototypeCloudDocument['rallies'] = [];
  for (let index = 0; index < centuryScore; index += 1) {
    rallies = [...rallies, buildRally(setup, rallies, { winner: 'century', event: 'opponent_error', errorSubtype: 'Other' })];
  }
  for (let index = 0; index < opponentScore; index += 1) {
    rallies = [...rallies, buildRally(setup, rallies, { winner: 'opponent', event: 'opponent_kill' })];
  }
  return rallies;
};

const reportRoster: PrototypePlayer[] = [
  { id: 'p12', number: '12', name: 'Avery Twelve', active: true },
  { id: 'p2', number: '2', name: 'Blake Two', active: true },
  { id: 'p-libero', number: 'L', name: 'Casey Libero', active: false },
];

const makeReportSetup = (opponent: string, setNumber = 1): SetSetup => ({
  opponent,
  setNumber,
  initialMode: 'serving',
  initialRotation: 1,
  initialServerId: 'p12',
  lineup: { 1: 'p12', 2: 'p2' },
  rotationServers: { 1: 'p12', 2: 'p2' },
});

const makeReportRallies = (
  setup: SetSetup,
  inputs: Array<PendingRallyInput & { active?: boolean }>,
) => inputs.reduce<PrototypeCloudDocument['rallies']>((rallies, input, index) => {
  const { active = true, ...rallyInput } = input;
  const rally = buildRally(
    setup,
    rallies,
    rallyInput,
    () => `${setup.opponent}-rally-${index + 1}`,
    () => `2026-09-0${setup.setNumber}T12:00:${String(index).padStart(2, '0')}.000Z`,
  );
  return [...rallies, { ...rally, active }];
}, []);

const makeReportMatch = (
  id: string,
  opponent: string,
  date: string,
  inputs: Array<PendingRallyInput & { active?: boolean }>,
): PrototypeMatchInput => {
  const setup = makeReportSetup(opponent);
  return {
    id,
    opponent,
    date,
    result: 'Win',
    sets: [{ id: `${id}-set-1`, setNumber: 1, setup, rallies: makeReportRallies(setup, inputs) }],
  };
};

const libertyReportMatch = () => makeReportMatch('report-liberty', 'Liberty', '2026-09-01', [
  { winner: 'century', event: 'century_ace' },
  { winner: 'century', event: 'century_kill', creditedPlayerId: 'p2', assistedByPlayerId: 'p12' },
  { winner: 'century', event: 'century_block', teamAttribution: true },
  { winner: 'opponent', event: 'serve_error' },
  { winner: 'opponent', event: 'receive_error', chargedPlayerId: 'p2' },
  { winner: 'opponent', event: 'ball_control_error', teamAttribution: true },
  { winner: 'century', event: 'score_adjustment', scoreAdjustment: { century: 3 } },
  { winner: 'century', event: 'century_kill', creditedPlayerId: 'p2', active: false },
]);

const centralReportMatch = () => makeReportMatch('report-central', 'Central', '2026-09-02', [
  { winner: 'century', event: 'century_kill', creditedPlayerId: 'p2', assistedByPlayerId: 'p12' },
  { winner: 'opponent', event: 'attack_error', chargedPlayerId: 'p2' },
  { winner: 'century', event: 'century_block', creditedPlayerId: 'p12' },
]);

const renderWithDocument = (document: PrototypeCloudDocument) => {
  const team = {
    id: 'team-1', name: 'CHS Varsity', level: 'Varsity', season: '2026',
    createdAt: '2026-09-09T12:00:00.000Z', updatedAt: '2026-09-09T12:00:00.000Z',
    metadata: { [PROTOTYPE_METADATA_KEY]: document },
  };
  vi.mocked(useAccess).mockReturnValue({
    data: { isAdmin: true, assignments: [], manageableTeamIds: ['team-1'], teams: [team] },
  } as unknown as ReturnType<typeof useAccess>);
  vi.mocked(useMatch).mockReturnValue({
    activeTeam: team, teams: [team], teamsLoading: false, selectTeam: vi.fn(), addTeam: vi.fn(),
    updateTeam: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useMatch>);
  return render(<RebuildPrototype />);
};

describe('RebuildPrototype match launch flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'coach-1', email: 'coach@example.com', name: 'Coach' }, logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('shows Start New Match for an idle saved document and opens set-one setup', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm');
    renderWithDocument(createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z')));
    expect(await screen.findByRole('heading', { name: 'Ready for the next serve?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume Match' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start New Match' }));
    expect(screen.getByRole('heading', { name: 'Set 1 Setup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Match' })).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('resumes a live match at its hydrated set and score', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'live';
    document.setup.opponent = 'Liberty';
    document.draftSetup.opponent = 'Liberty';
    document.rallies = [buildRally(document.setup, [], { winner: 'century', event: 'opponent_error', errorSubtype: 'Other' })];
    renderWithDocument(document);
    expect(await screen.findByText('Live match')).toBeInTheDocument();
    expect(screen.getByText('Liberty')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resume Match' }));
    expect(screen.getByText('CENTURY POINT')).toBeInTheDocument();
    expect(screen.getByText('Liberty')).toBeInTheDocument();
  });

  it('offers a guarded new-match choice beside resume and respects cancellation', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'live';
    document.setup.opponent = 'Liberty';
    document.draftSetup.opponent = 'Liberty';
    document.rallies = [buildRally(document.setup, [], { winner: 'century', event: 'opponent_error', errorSubtype: 'Other' })];
    document.seasonMatches = [makeFinishedMatch()];
    renderWithDocument(document);

    expect(await screen.findByRole('button', { name: 'Resume Match' })).toBeInTheDocument();
    const startNew = screen.getByRole('button', { name: 'Start New Match' });
    await user.click(startNew);
    expect(confirm).toHaveBeenCalledWith('Start a new match and replace the current unfinished match? Finished season reports will remain.');
    expect(screen.getByRole('button', { name: 'Resume Match' })).toBeInTheDocument();

    await user.click(startNew);
    expect(screen.getByRole('heading', { name: 'Set 1 Setup' })).toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team-1')) ?? '{}') as PrototypeCloudDocument;
      expect(saved.currentMatchId).not.toBe(document.currentMatchId);
      expect(saved.seasonMatches).toEqual([makeFinishedMatch()]);
      expect(saved.rallies).toEqual([]);
    });
    confirm.mockRestore();
  });

  it('uses Start Set when resuming setup for a subsequent set', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'setup';
    document.setup.setNumber = 2;
    document.draftSetup.setNumber = 2;
    document.completedSets = [{ id: 'set-1', setNumber: 1, setup: { ...document.setup, setNumber: 1 }, rallies: [] }];
    renderWithDocument(document);
    await user.click(await screen.findByRole('button', { name: 'Continue Setup' }));
    expect(screen.getByRole('button', { name: 'Start Set' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Match' })).not.toBeInTheDocument();
  });

  it('preserves finished season history when starting a new match', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'complete';
    document.seasonMatches = [makeFinishedMatch()];
    renderWithDocument(document);
    await user.click(await screen.findByRole('button', { name: 'Start New Match' }));
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team-1')) ?? '{}') as PrototypeCloudDocument;
      expect(saved.currentMatchId).not.toBe(document.currentMatchId);
      expect(saved.seasonMatches).toEqual([makeFinishedMatch()]);
      expect(saved.lifecycle).toBe('setup');
    });
  });

  it('edits setup during a live set without clearing its rallies', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'live';
    document.setup.opponent = 'Liberty';
    document.draftSetup.opponent = 'Liberty';
    document.rallies = [buildRally(document.setup, [], { winner: 'century', event: 'opponent_error', errorSubtype: 'Other' })];
    renderWithDocument(document);
    await user.click(await screen.findByRole('button', { name: 'Resume Match' }));
    await user.click(screen.getByRole('button', { name: 'Setup' }));
    const opponent = screen.getByRole('textbox', { name: 'Opponent' });
    await user.clear(opponent);
    await user.type(opponent, 'Sherwood');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByText('Sherwood')).toBeInTheDocument();
    expect(screen.getByText('Last 1 of 1')).toBeInTheDocument();
  });

  it('finishes a decided best-of match once and returns to the launcher', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'live';
    document.setup = { ...document.setup, opponent: 'Liberty', setNumber: 2, matchFormat: 'best-of-3' };
    document.draftSetup = document.setup;
    const firstSetup = { ...document.setup, setNumber: 1 };
    document.completedSets = [{ id: 'set-1', setNumber: 1, setup: firstSetup, rallies: makeScore(firstSetup, 25, 12) }];
    document.rallies = makeScore(document.setup, 24, 10);
    renderWithDocument(document);

    await user.click(await screen.findByRole('button', { name: 'Resume Match' }));
    await user.click(screen.getByRole('button', { name: 'Add CHS Varsity score' }));
    expect(screen.getByText('Saving this set finishes the match, finalizes every entry, and returns to Match Day.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Finish Match' }));

    expect(await screen.findByRole('heading', { name: 'Ready for the next serve?' })).toBeInTheDocument();
    expect(screen.getByText('Match finalized')).toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team-1')) ?? '{}') as PrototypeCloudDocument;
      expect(saved.lifecycle).toBe('complete');
      expect(saved.seasonMatches).toHaveLength(1);
      expect(saved.seasonMatches[0]).toMatchObject({ id: document.currentMatchId, result: 'Win' });
      expect(saved.seasonMatches[0].sets).toHaveLength(2);
      expect(saved.seasonMatches[0].sets[1].id).toBe(`${document.currentMatchId}-set-2`);
      expect(saved.rallies).toEqual([]);
    });
  });

  it('manually ends an active match after review and includes the current set once', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'live';
    document.setup = { ...document.setup, opponent: 'Liberty' };
    document.draftSetup = document.setup;
    document.rallies = makeScore(document.setup, 2, 1);
    renderWithDocument(document);

    await user.click(await screen.findByRole('button', { name: 'Resume Match' }));
    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('button', { name: /End MatchFinalize entries/ }));
    const review = screen.getByRole('dialog', { name: 'End this match?' });
    expect(within(review).getByText('Current set will be saved')).toBeInTheDocument();
    expect(within(review).getByText('Set 1 will be finalized at 2-1.')).toBeInTheDocument();
    await user.click(within(review).getByRole('button', { name: 'End Match' }));

    expect(await screen.findByRole('heading', { name: 'Ready for the next serve?' })).toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team-1')) ?? '{}') as PrototypeCloudDocument;
      expect(saved.seasonMatches).toHaveLength(1);
      expect(saved.seasonMatches[0].sets).toHaveLength(1);
      expect(saved.seasonMatches[0].sets[0]).toMatchObject({ id: `${document.currentMatchId}-set-1`, setNumber: 1 });
    });
  });

  it('ends between sets without adding a phantom set', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'setup';
    document.setup = { ...document.setup, opponent: 'Liberty', setNumber: 2 };
    document.draftSetup = document.setup;
    const firstSetup = { ...document.setup, setNumber: 1 };
    document.completedSets = [{ id: 'set-1', setNumber: 1, setup: firstSetup, rallies: makeScore(firstSetup, 25, 20) }];
    renderWithDocument(document);

    await user.click(await screen.findByRole('button', { name: 'Continue Setup' }));
    await user.click(screen.getByRole('button', { name: 'End Match' }));
    const review = screen.getByRole('dialog', { name: 'End this match?' });
    expect(within(review).getByText('No active set to add')).toBeInTheDocument();
    await user.click(within(review).getByRole('button', { name: 'End Match' }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team-1')) ?? '{}') as PrototypeCloudDocument;
      expect(saved.lifecycle).toBe('complete');
      expect(saved.seasonMatches[0].sets).toHaveLength(1);
      expect(saved.seasonMatches[0].sets[0].setNumber).toBe(1);
    });
  });

  it('does not allow a completely empty live match to be finalized', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'live';
    document.setup = { ...document.setup, opponent: 'Liberty' };
    document.draftSetup = document.setup;
    renderWithDocument(document);

    await user.click(await screen.findByRole('button', { name: 'Resume Match' }));
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('button', { name: /End MatchFinalize entries/ })).toBeDisabled();
    expect(screen.queryByRole('dialog', { name: 'End this match?' })).not.toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team-1')) ?? '{}') as PrototypeCloudDocument;
      expect(saved.seasonMatches).toEqual([]);
      expect(saved.lifecycle).toBe('live');
    });
  });

  it('records an optional assist after selecting the attacker for a kill', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.roster = reportRoster.map((player) => ({ ...player, active: true }));
    document.lifecycle = 'live';
    document.setup = makeReportSetup('Liberty');
    document.draftSetup = document.setup;
    document.currentLineup = document.setup.lineup ?? {};
    renderWithDocument(document);

    await user.click(await screen.findByRole('button', { name: 'Resume Match' }));
    await user.click(screen.getAllByRole('button', { name: /KILL/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Choose lineup #2 Blake T.' }));

    expect(screen.getByRole('heading', { name: 'Assist?' })).toBeInTheDocument();
    expect(screen.getByText('Kill by #2 Blake T.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Choose lineup #12 Avery T.' }));

    expect(await screen.findAllByText('Century KILL - #2 Blake T. - AST #12 Avery T.')).toHaveLength(2);
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team-1')) ?? '{}') as PrototypeCloudDocument;
      expect(saved.rallies[0]).toMatchObject({
        event: 'century_kill',
        creditedPlayerId: 'p2',
        assistedByPlayerId: 'p12',
      });
    });
  });

  it('cancels manual match completion without changing saved entries', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'live';
    document.setup = { ...document.setup, opponent: 'Liberty' };
    document.draftSetup = document.setup;
    document.rallies = makeScore(document.setup, 1, 0);
    renderWithDocument(document);

    await user.click(await screen.findByRole('button', { name: 'Resume Match' }));
    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('button', { name: /End MatchFinalize entries/ }));
    await user.click(within(screen.getByRole('dialog', { name: 'End this match?' })).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'End this match?' })).not.toBeInTheDocument();
    expect(screen.getByText('CENTURY POINT')).toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team-1')) ?? '{}') as PrototypeCloudDocument;
      expect(saved.seasonMatches).toEqual([]);
      expect(saved.rallies.filter((rally) => rally.active)).toHaveLength(1);
      expect(saved.lifecycle).toBe('live');
    });
  });

  it('upserts a stale archive and ignores repeated finalization', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'live';
    document.setup = { ...document.setup, opponent: 'Liberty' };
    document.draftSetup = document.setup;
    document.rallies = makeScore(document.setup, 1, 0);
    document.seasonMatches = [{ id: document.currentMatchId, opponent: 'Stale', date: '2026-09-08', result: 'Open', sets: [] }];
    renderWithDocument(document);

    await user.click(await screen.findByRole('button', { name: 'Resume Match' }));
    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('button', { name: /End MatchFinalize entries/ }));
    const confirmButton = within(screen.getByRole('dialog', { name: 'End this match?' })).getByRole('button', { name: 'End Match' });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team-1')) ?? '{}') as PrototypeCloudDocument;
      expect(saved.seasonMatches).toHaveLength(1);
      expect(saved.seasonMatches[0]).toMatchObject({ id: document.currentMatchId, opponent: 'Liberty', result: 'Win' });
      expect(saved.seasonMatches[0].sets).toHaveLength(1);
    });
  });

  it('records a fixed-two split as a Draw and shows it in season reports', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'live';
    document.setup = { ...document.setup, opponent: 'Liberty', setNumber: 2, matchFormat: 'fixed-2' };
    document.draftSetup = document.setup;
    const firstSetup = { ...document.setup, setNumber: 1 };
    document.completedSets = [{ id: 'set-1', setNumber: 1, setup: firstSetup, rallies: makeScore(firstSetup, 25, 10) }];
    document.rallies = makeScore(document.setup, 0, 24);
    renderWithDocument(document);

    await user.click(await screen.findByRole('button', { name: 'Resume Match' }));
    await user.click(screen.getByRole('button', { name: 'Add Liberty score' }));
    await user.click(screen.getByRole('button', { name: 'Finish Match' }));
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(getTeamPrototypeStorageKey('team-1')) ?? '{}') as PrototypeCloudDocument;
      expect(saved.seasonMatches[0].result).toBe('Draw');
    });

    await user.click(screen.getByRole('button', { name: 'Season Reports' }));
    expect(await screen.findByText(/Draw · Match 1-1/)).toBeInTheDocument();
  });

  it('keeps completed matches on the launcher even if stale rallies were persisted', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'complete';
    document.setup = { ...document.setup, opponent: 'Liberty' };
    document.draftSetup = document.setup;
    document.rallies = makeScore(document.setup, 1, 0);
    document.seasonMatches = [{ id: document.currentMatchId, opponent: 'Liberty', date: '2026-09-09', result: 'Win', sets: [] }];
    renderWithDocument(document);

    expect(await screen.findByRole('heading', { name: 'Ready for the next serve?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume Match' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Season Reports' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('heading', { name: 'Ready for the next serve?' })).toBeInTheDocument();
    expect(screen.queryByText('CENTURY POINT')).not.toBeInTheDocument();
  });
});

describe('RebuildPrototype player reports', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'coach-1', email: 'coach@example.com', name: 'Coach' }, logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
  });

  const makeReportDocument = () => {
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'complete';
    document.roster = reportRoster;
    document.currentMatchId = 'report-liberty';
    document.seasonMatches = [libertyReportMatch(), centralReportMatch()];
    return document;
  };

  it('shows every roster player in jersey order with earned, gifted, and reconciled event details', async () => {
    const user = userEvent.setup();
    renderWithDocument(makeReportDocument());

    await user.click(await screen.findByRole('button', { name: 'Season Reports' }));
    await user.click(screen.getByRole('button', { name: 'Player Report' }));

    expect(screen.getByRole('heading', { name: 'Match Player Report' })).toBeInTheDocument();
    expect(screen.getByText('Earned points are credited actions. Assists credit the setter on Century kills. Gifted points are errors charged to a player.')).toBeInTheDocument();
    const playerCards = screen.getAllByRole('article', { name: /^Player / });
    expect(playerCards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Player 2 Blake Two',
      'Player 12 Avery Twelve',
      'Player L Casey Libero',
    ]);

    const avery = screen.getByRole('article', { name: 'Player 12 Avery Twelve' });
    expect(within(avery).getByLabelText('Earned 1')).toBeInTheDocument();
    expect(within(avery).getByLabelText('Assists 1')).toBeInTheDocument();
    expect(within(avery).getByLabelText('Gifted 1')).toBeInTheDocument();
    expect(within(avery).getByLabelText('Net 0')).toBeInTheDocument();
    expect(within(avery).getByText(/Aces/)).toHaveTextContent('Aces 1');
    expect(within(avery).getByText(/Kills/)).toHaveTextContent('Kills 1');
    expect(within(avery).getByText(/Serving/)).toHaveTextContent('Serving 1');

    const blake = screen.getByRole('article', { name: 'Player 2 Blake Two' });
    expect(within(blake).getByLabelText('Assists 0')).toBeInTheDocument();
    expect(within(blake).getByText(/Kills/)).toHaveTextContent('Kills 1');
    expect(within(blake).getByText(/Serve Receive/)).toHaveTextContent('Serve Receive 1');

    const zeroPlayer = screen.getByRole('article', { name: 'Player L Casey Libero' });
    expect(within(zeroPlayer).getByLabelText('Earned 0')).toBeInTheDocument();
    expect(within(zeroPlayer).getByLabelText('Assists 0')).toBeInTheDocument();
    expect(within(zeroPlayer).getByLabelText('Gifted 0')).toBeInTheDocument();
    expect(within(zeroPlayer).getByText('No earned points.')).toBeInTheDocument();
    expect(within(zeroPlayer).getByText('No assists.')).toBeInTheDocument();
    expect(within(zeroPlayer).getByText('No gifts charged.')).toBeInTheDocument();

    const unclear = screen.getByRole('article', { name: 'Team or unclear attribution' });
    expect(within(unclear).getByLabelText('Earned 1')).toBeInTheDocument();
    expect(within(unclear).getByLabelText('Gifted 1')).toBeInTheDocument();
    expect(within(unclear).getByText(/Blocks/)).toHaveTextContent('Blocks 1');
    expect(within(unclear).getByText(/Ball Control/)).toHaveTextContent('Ball Control 1');
    expect(screen.getByText('Attributed Earned').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Attributed Assists').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Attributed Gifted').nextSibling).toHaveTextContent('2');
  });

  it('updates the player ledger when the selected match changes', async () => {
    const user = userEvent.setup();
    renderWithDocument(makeReportDocument());

    await user.click(await screen.findByRole('button', { name: 'Season Reports' }));
    await user.click(screen.getByRole('button', { name: 'Player Report' }));
    expect(screen.getByRole('article', { name: 'Team or unclear attribution' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /vs Central/ }));
    expect(screen.getByText('Century vs Central · Sep 2')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Team or unclear attribution' })).not.toBeInTheDocument();
    const avery = screen.getByRole('article', { name: 'Player 12 Avery Twelve' });
    expect(within(avery).getByLabelText('Earned 1')).toBeInTheDocument();
    expect(within(avery).getByLabelText('Assists 1')).toBeInTheDocument();
    expect(within(avery).getByLabelText('Gifted 0')).toBeInTheDocument();
    const blake = screen.getByRole('article', { name: 'Player 2 Blake Two' });
    expect(within(blake).getByLabelText('Earned 1')).toBeInTheDocument();
    expect(within(blake).getByLabelText('Gifted 1')).toBeInTheDocument();
  });

  it('aggregates finalized matches for the season without including the live match', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'live';
    document.roster = reportRoster;
    document.currentMatchId = 'live-match';
    document.setup = makeReportSetup('Live Opponent');
    document.draftSetup = document.setup;
    document.rallies = makeReportRallies(document.setup, [
      { winner: 'century', event: 'century_ace' },
      { winner: 'century', event: 'century_ace' },
    ]);
    document.seasonMatches = [libertyReportMatch(), centralReportMatch()];
    renderWithDocument(document);

    await user.click(await screen.findByRole('button', { name: 'Season Reports' }));
    await user.click(screen.getByRole('button', { name: 'Season' }));
    await user.click(screen.getByRole('button', { name: 'Player Report' }));

    expect(screen.getByRole('heading', { name: 'Season Player Report' })).toBeInTheDocument();
    expect(screen.getByText('2 finalized matches')).toBeInTheDocument();
    expect(screen.getByText('Attributed Earned').nextSibling).toHaveTextContent('4');
    expect(screen.getByText('Attributed Assists').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Attributed Gifted').nextSibling).toHaveTextContent('3');
    const avery = screen.getByRole('article', { name: 'Player 12 Avery Twelve' });
    expect(within(avery).getByLabelText('Earned 2')).toBeInTheDocument();
    expect(within(avery).getByLabelText('Assists 2')).toBeInTheDocument();
    expect(within(avery).getByLabelText('Gifted 1')).toBeInTheDocument();
    expect(within(avery).getByLabelText('Net +1')).toBeInTheDocument();
  });

  it('keeps useful empty states and preserves the existing overview report', async () => {
    const user = userEvent.setup();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.lifecycle = 'complete';
    document.roster = reportRoster;
    document.currentMatchId = 'empty-report';
    document.seasonMatches = [{ id: 'empty-report', opponent: 'West', date: '2026-09-03', result: 'Draw', sets: [] }];
    const { unmount } = renderWithDocument(document);

    await user.click(await screen.findByRole('button', { name: 'Season Reports' }));
    expect(screen.getByText('Where Earning')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Player Report' }));
    expect(screen.getByText('No player-attributed events are recorded yet. Every roster player is shown below.')).toBeInTheDocument();
    expect(screen.getAllByRole('article', { name: /^Player / })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.getByText('Where Earning')).toBeInTheDocument();

    unmount();
    localStorage.clear();
    const noRosterDocument = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    noRosterDocument.lifecycle = 'complete';
    noRosterDocument.currentMatchId = 'report-liberty';
    noRosterDocument.seasonMatches = [libertyReportMatch()];
    renderWithDocument(noRosterDocument);
    await user.click(await screen.findByRole('button', { name: 'Season Reports' }));
    await user.click(screen.getByRole('button', { name: 'Player Report' }));
    expect(screen.getByText('No roster yet')).toBeInTheDocument();
    expect(screen.getByText('Player attribution will appear after a roster is added.')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Team or unclear attribution' })).toBeInTheDocument();
  });
});
