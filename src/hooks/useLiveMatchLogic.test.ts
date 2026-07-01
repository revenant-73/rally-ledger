import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLiveMatchLogic } from './useLiveMatchLogic';
import type { Match, Set, RallyEvent } from '../types';

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
  };

  const mockAddRally = vi.fn().mockResolvedValue(undefined);
  const mockUndoLastRally = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSet = vi.fn().mockResolvedValue(undefined);

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));
    
    expect(result.current.pointWinner).toBeNull();
    expect(result.current.servingTeam).toBe('Us');
  });

  it('should complete a rally and update scores', async () => {
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));

    await act(async () => {
      result.current.setPointWinner('Us');
      result.current.setOutcome('Kill');
      await result.current.completeRally('Earned');
    });

    expect(mockAddRally).toHaveBeenCalledWith(expect.objectContaining({
      pointWinner: 'Us',
      scoreAfterUs: 11,
      scoreAfterOpponent: 10,
      classification: 'Earned',
      outcomeType: 'Kill',
    }));
    
    expect(result.current.servingTeam).toBe('Us');
    expect(result.current.pointWinner).toBeNull();
  });

  it('should switch serving team when opponent wins a point', async () => {
    const { result } = renderHook(() => useLiveMatchLogic(mockMatch, mockSet, [], mockAddRally, mockUndoLastRally, mockUpdateSet));

    await act(async () => {
      result.current.setPointWinner('Opponent');
      result.current.setOutcome('Attack Error');
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
});
