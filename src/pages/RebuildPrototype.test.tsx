import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import { useMatch } from '../hooks/useMatch';
import { useAccess } from '../hooks/queries/useAccess';
import { buildRally, type PrototypeMatchInput } from '../prototype/matchbookModel';
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
});
