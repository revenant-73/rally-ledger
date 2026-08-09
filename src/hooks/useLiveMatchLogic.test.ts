import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLiveMatchLogic } from './useLiveMatchLogic';
import type { Match, Set, RallyEvent, Lineup } from '../types';

vi.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

describe('useLiveMatchLogic', () => {
  const mockMatch: Match = {
    id: 'm1',
    teamId: 't1',
    opponentName: 'Opponent',
    matchDate: '2024-01-01',
    location: 'Home',
    matchType: 'Tournament',
    status: 'active',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const mockLineup: Lineup = {
    position1: 'p1',
    position2: 'p2',
    position3: 'p3',
    position4: 'p4',
    position5: 'p5',
    position6: 'p6',
    libero1: 'p7',
  };

  const mockSet: Set = {
    id: 's1',
    matchId: 'm1',
    setNumber: 1,
    ourScore: 10,
    opponentScore: 10,
    status: 'active',
    startingServerTeam: 'Us',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    metadata: {
      startingLineup: mockLineup,
      currentLineup: mockLineup,
    },
  };

  const mockAddRally = vi.fn().mockResolvedValue(undefined);
  const mockUndoLastRally = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSet = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockAddRally.mockClear();
    mockUndoLastRally.mockClear();
    mockUpdateSet.mockClear();
    mockUpdateSet.mockResolvedValue(undefined);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));
    
    expect(result.current.pointWinner).toBeNull();
    expect(result.current.servingTeam).toBe('Us');
  });

  it('should complete a rally and update scores', async () => {
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));

    act(() => {
      result.current.setPointWinner('Us');
      result.current.setOutcome('Kill');
    });

    await act(async () => {
      await result.current.completeRally('Earned');
    });

    expect(mockAddRally).toHaveBeenCalledWith(
      expect.objectContaining({
        pointWinner: 'Us',
        scoreAfterUs: 11,
        scoreAfterOpponent: 10,
        classification: 'Earned',
        outcomeType: 'Kill',
      }),
      expect.objectContaining({
        currentRotation: 1,
        servingTeam: 'Us',
      })
    );
    
    expect(result.current.servingTeam).toBe('Us');
    expect(result.current.pointWinner).toBeNull();
  });

  it('should switch serving team when opponent wins a point', async () => {
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));

    act(() => {
      result.current.setPointWinner('Opponent');
      result.current.setOutcome('Attack Error');
    });

    await act(async () => {
      await result.current.completeRally('Gifted');
    });

    expect(result.current.servingTeam).toBe('Opponent');
  });

  it('should undo last rally and restore serving team', async () => {
    const rallies: RallyEvent[] = [{
      id: 'r1',
      matchId: 'm1',
      setId: 's1',
      rallyNumber: 1,
      scoreBeforeUs: 0,
      scoreBeforeOpponent: 0,
      scoreAfterUs: 0,
      scoreAfterOpponent: 1,
      pointWinner: 'Opponent',
      servingTeam: 'Us',
      outcomeType: 'Serve Error',
      classification: 'Gifted',
      createdAt: '2024-01-01',
    }];

    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, rallies, mockAddRally, mockUndoLastRally, mockUpdateSet));

    await act(async () => {
      await result.current.undoLastRallyWithLogic();
    });

    expect(mockUndoLastRally).toHaveBeenCalled();
    expect(result.current.servingTeam).toBe('Us');
  });

  it('undo persists the restored rotation/lineup/servingTeam back to Set.metadata', async () => {
    const rallies: RallyEvent[] = [{
      id: 'r1',
      matchId: 'm1',
      setId: 's1',
      rallyNumber: 1,
      scoreBeforeUs: 0,
      scoreBeforeOpponent: 0,
      scoreAfterUs: 0,
      scoreAfterOpponent: 1,
      pointWinner: 'Opponent',
      servingTeam: 'Opponent',
      outcomeType: 'Serve Error',
      classification: 'Gifted',
      createdAt: '2024-01-01',
      metadata: { rotation: 3, lineup: mockLineup },
    }];

    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, rallies, mockAddRally, mockUndoLastRally, mockUpdateSet));

    await act(async () => {
      await result.current.undoLastRallyWithLogic();
    });

    expect(mockUndoLastRally).toHaveBeenCalledWith(
      expect.objectContaining({
        servingTeam: 'Opponent',
        currentRotation: 3,
        currentLineup: mockLineup,
      })
    );
    expect(result.current.currentRotation).toBe(3);
  });

  it('does not undo a rally from another set', async () => {
    const rallies: RallyEvent[] = [{
      id: 'r1',
      matchId: 'm1',
      setId: 'previous-set',
      rallyNumber: 1,
      scoreBeforeUs: 0,
      scoreBeforeOpponent: 0,
      scoreAfterUs: 0,
      scoreAfterOpponent: 1,
      pointWinner: 'Opponent',
      servingTeam: 'Us',
      outcomeType: 'Serve Error',
      classification: 'Gifted',
      createdAt: '2024-01-01',
    }];

    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, rallies, mockAddRally, mockUndoLastRally, mockUpdateSet));

    await act(async () => {
      await result.current.undoLastRallyWithLogic();
    });

    expect(mockUndoLastRally).not.toHaveBeenCalled();
  });

  it('substitutes a player into the lineup and persists it', async () => {
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));

    await act(async () => {
      await result.current.handleSubstitution(2, 'newPlayer');
    });

    expect(result.current.currentLineup?.position2).toBe('newPlayer');
    expect(mockUpdateSet).toHaveBeenCalledWith('s1', expect.objectContaining({
      metadata: expect.objectContaining({
        currentLineup: expect.objectContaining({ position2: 'newPlayer' }),
      }),
    }));
  });

  it('rolls back the lineup and rethrows if a substitution fails to save', async () => {
    mockUpdateSet.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));

    await expect(
      act(async () => {
        await result.current.handleSubstitution(2, 'newPlayer');
      })
    ).rejects.toThrow('network down');

    expect(result.current.currentLineup?.position2).toBe('p2');
  });

  it('swaps a libero into a position and back out to the starting player', async () => {
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));

    await act(async () => {
      await result.current.handleLiberoSwap(5, 'p7');
    });
    expect(result.current.currentLineup?.position5).toBe('p7');

    await act(async () => {
      await result.current.handleLiberoSwap(5, null);
    });
    expect(result.current.currentLineup?.position5).toBe('p5');
  });

  it('rolls back liberoServingPosition and rethrows if the save fails', async () => {
    mockUpdateSet.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));

    await expect(
      act(async () => {
        await result.current.handleSetLiberoServing(true, 5);
      })
    ).rejects.toThrow('network down');

    expect(result.current.liberoServingPosition).toBeUndefined();
  });

  it('records a manual score adjustment as a Neutral rally, excluded from earned/gifted stats', async () => {
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));

    await act(async () => {
      await result.current.handleManualScoreAdjustment('Us', 1);
    });

    expect(mockAddRally).toHaveBeenCalledWith(expect.objectContaining({
      pointWinner: 'Us',
      scoreBeforeUs: 10,
      scoreAfterUs: 11,
      scoreAfterOpponent: 10,
      classification: 'Neutral',
      outcomeType: 'Manual Adjustment',
    }));
  });

  it('clamps a manual score decrement at zero', async () => {
    const zeroScoreSet: Set = { ...mockSet, ourScore: 0 };
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, zeroScoreSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));

    await act(async () => {
      await result.current.handleManualScoreAdjustment('Us', -1);
    });

    expect(mockAddRally).toHaveBeenCalledWith(expect.objectContaining({
      scoreBeforeUs: 0,
      scoreAfterUs: 0,
    }));
  });
});
