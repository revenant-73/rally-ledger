import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RotationDisplay from './RotationDisplay';
import type { Lineup, Player } from '../../../types';

const makePlayer = (n: number): Player => ({
  id: `p${n}`,
  teamId: 't1',
  firstName: `Player${n}`,
  lastName: 'Test',
  jerseyNumber: String(n),
  position: 'OH',
  active: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
});

describe('RotationDisplay rotation math', () => {
  const players = [1, 2, 3, 4, 5, 6, 7].map(makePlayer);

  const lineup: Lineup = {
    position1: 'p1',
    position2: 'p2',
    position3: 'p3',
    position4: 'p4',
    position5: 'p5',
    position6: 'p6',
  };

  it('rotation 1: player 1 is in physical zone 1 (the server position)', () => {
    render(
      <RotationDisplay
        lineup={lineup}
        players={players}
        currentRotation={1}
        servingTeam="Us"
      />
    );

    // Position 1 is the server slot; in rotation 1 that's still player 1.
    expect(screen.getByLabelText(/Position 1: #1 /)).toBeInTheDocument();
    expect(screen.getByLabelText(/Position 1: #1 .*serving/)).toBeInTheDocument();
  });

  it('rotation 2: player 1 has rotated out of the server position into zone 6', () => {
    render(
      <RotationDisplay
        lineup={lineup}
        players={players}
        currentRotation={2}
        servingTeam="Us"
      />
    );

    // Player 1 should now show up in physical position 6, not 1.
    expect(screen.getByLabelText(/Position 6: #1 /)).toBeInTheDocument();
    // Player 2 has rotated into the server slot (position 1) and should be marked serving.
    expect(screen.getByLabelText(/Position 1: #2 .*serving/)).toBeInTheDocument();
  });

  it('does not mark anyone as serving when the opponent is serving', () => {
    render(
      <RotationDisplay
        lineup={lineup}
        players={players}
        currentRotation={1}
        servingTeam="Opponent"
      />
    );

    expect(screen.queryByLabelText(/serving/)).not.toBeInTheDocument();
  });

  it('calls onPlayerClick with the resolved player index, not the physical zone', () => {
    const onPlayerClick = vi.fn();
    render(
      <RotationDisplay
        lineup={lineup}
        players={players}
        currentRotation={2}
        servingTeam="Us"
        onPlayerClick={onPlayerClick}
      />
    );

    // Physical zone 1 in rotation 2 holds player index 2.
    screen.getByLabelText(/Position 1: #2 /).click();
    expect(onPlayerClick).toHaveBeenCalledWith(2);
  });

  it('marks players who are substituted in for the original starter', () => {
    const currentLineup: Lineup = {
      ...lineup,
      position3: 'p7',
    };

    render(
      <RotationDisplay
        lineup={currentLineup}
        startingLineup={lineup}
        players={players}
        currentRotation={1}
        servingTeam="Opponent"
      />
    );

    expect(screen.getByLabelText(/Position 3: #7 .*substituted for #3/)).toBeInTheDocument();
    expect(screen.getByText('Sub')).toBeInTheDocument();
    expect(screen.getByText('for #3')).toBeInTheDocument();
  });
});
