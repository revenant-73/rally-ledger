import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import { useMatch } from '../hooks/useMatch';
import { useAccess } from '../hooks/queries/useAccess';
import { createFreshPrototypeDocument, PROTOTYPE_METADATA_KEY } from '../prototype/prototypeCloudState';
import RebuildPrototype from './RebuildPrototype';

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useMatch', () => ({ useMatch: vi.fn() }));
vi.mock('../hooks/queries/useAccess', () => ({ useAccess: vi.fn() }));

describe('RebuildPrototype opponent display', () => {
  beforeEach(() => {
    localStorage.clear();
    const document = createFreshPrototypeDocument(new Date('2026-09-09T12:00:00.000Z'));
    document.setup.opponent = 'Liberty';
    document.draftSetup.opponent = 'Liberty';
    const team = {
      id: 'team-1',
      name: 'CHS Varsity',
      level: 'Varsity',
      season: '2026',
      createdAt: '2026-09-09T12:00:00.000Z',
      updatedAt: '2026-09-09T12:00:00.000Z',
      metadata: { [PROTOTYPE_METADATA_KEY]: document },
    };

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'coach-1', email: 'coach@example.com', name: 'Coach' },
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useAccess).mockReturnValue({
      data: { isAdmin: true, assignments: [], manageableTeamIds: ['team-1'], teams: [team] },
    } as unknown as ReturnType<typeof useAccess>);
    vi.mocked(useMatch).mockReturnValue({
      activeTeam: team,
      teams: [team],
      teamsLoading: false,
      selectTeam: vi.fn(),
      addTeam: vi.fn(),
      updateTeam: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useMatch>);
  });

  it('replaces the previous opponent on the scoreboard when the setup field changes', async () => {
    const user = userEvent.setup();
    render(<RebuildPrototype />);

    expect(await screen.findByText('Liberty')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Setup' }));
    const opponent = screen.getByRole('textbox', { name: 'Opponent' });
    await user.clear(opponent);
    await user.type(opponent, 'Sherwood');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByText('Sherwood')).toBeInTheDocument();
    expect(screen.queryByText('Liberty')).not.toBeInTheDocument();
  });
});
