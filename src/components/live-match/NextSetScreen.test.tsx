import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Set as MatchSet } from '../../types';
import NextSetScreen from './NextSetScreen';
import { getMatchFormatSettings } from '../../utils/matchFormat';

const completedSet = (overrides: Partial<MatchSet>): MatchSet => ({
  id: 's1',
  matchId: 'm1',
  setNumber: 1,
  ourScore: 25,
  opponentScore: 20,
  status: 'completed',
  startingServerTeam: 'Us',
  finalResult: 'Win',
  createdAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-29T00:00:00.000Z',
  ...overrides,
});

describe('NextSetScreen', () => {
  it('uses the standard target for set 2 in fixed two-set scrimmages', () => {
    render(
      <NextSetScreen
        rallies={[]}
        players={[]}
        sets={[completedSet({ setNumber: 1 })]}
        matchSettings={getMatchFormatSettings({
          metadata: { matchFormat: 'fixed-2', standardSetTarget: 25, decidingSetTarget: 15 },
        })}
        onStartSet={vi.fn()}
        onEndMatch={vi.fn()}
        onBackToHome={vi.fn()}
      />
    );

    expect(screen.getByText('2 Set Scrimmage · set target 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
  });

  it('offers explicit match finish controls when a single-set format has been played', async () => {
    const user = userEvent.setup();
    const onEndMatch = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <NextSetScreen
        rallies={[]}
        players={[]}
        sets={[completedSet({ setNumber: 1 })]}
        matchSettings={getMatchFormatSettings({ metadata: { matchFormat: 'single-set' } })}
        onStartSet={vi.fn()}
        onEndMatch={onEndMatch}
        onBackToHome={vi.fn()}
      />
    );

    expect(screen.getByText('Match Format Complete')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Finish Win/i }));

    expect(onEndMatch).toHaveBeenCalledWith('Win');
  });
});
