import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MoreMenuModal from './MoreMenuModal';

const renderModal = (onEndMatch = vi.fn()) => {
  render(
    <MoreMenuModal
      isOpen
      onClose={vi.fn()}
      setNumber={2}
      ourScore={12}
      opponentScore={18}
      onShowTimeout={vi.fn()}
      onShowStats={vi.fn()}
      onShowNote={vi.fn()}
      onManualScoreChange={vi.fn()}
      onEndSet={vi.fn()}
      onEndMatch={onEndMatch}
      onAbandonMatch={vi.fn()}
      tableMode={false}
      onToggleTableMode={vi.fn()}
      brightGymMode={false}
      onToggleBrightGymMode={vi.fn()}
      scorerFocusMode={false}
      onToggleScorerFocusMode={vi.fn()}
    />
  );
};

describe('MoreMenuModal', () => {
  it('lets scorers explicitly choose a shortened match result', async () => {
    const user = userEvent.setup();
    const onEndMatch = vi.fn();
    renderModal(onEndMatch);

    await user.click(screen.getByRole('button', { name: /Finish Match Now/i }));

    expect(screen.getByText('Current set 2')).toBeInTheDocument();
    expect(screen.getByText('Closes this set and marks the match completed. Rally stats stay in reports.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Finish Win/i }));
    expect(onEndMatch).toHaveBeenCalledWith('Win');
  });
});
