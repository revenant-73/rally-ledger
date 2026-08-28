import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Lineup, Player } from '../../../types';
import SubstitutionModal from './SubstitutionModal';

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

describe('SubstitutionModal', () => {
  const players = [1, 2, 3, 4, 5, 6, 7].map(makePlayer);
  const lineup: Lineup = {
    position1: 'p1',
    position2: 'p2',
    position3: 'p3',
    position4: 'p4',
    position5: 'p5',
    position6: 'p6',
  };

  it('shows both tapped court zone and rotation position when they differ', () => {
    render(
      <SubstitutionModal
        isOpen
        onClose={vi.fn()}
        players={players}
        lineup={lineup}
        positionIdx={4}
        courtZone={2}
        onSubstitute={vi.fn()}
        onLiberoSwap={vi.fn()}
        onSetLiberoServing={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Court Zone 2' })).toBeInTheDocument();
    expect(screen.getByText(/Court Zone 2 \/ Rotation Position 4/)).toBeInTheDocument();
  });
});
