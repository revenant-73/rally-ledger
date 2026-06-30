import type { Lineup } from '../types';

/**
 * Rotates the lineup clockwise.
 * Pos 1 moves to Pos 6
 * Pos 6 moves to Pos 5
 * Pos 5 moves to Pos 4
 * Pos 4 moves to Pos 3
 * Pos 3 moves to Pos 2
 * Pos 2 moves to Pos 1
 */
export const rotateLineup = (lineup: Lineup): Lineup => {
  return {
    ...lineup,
    position1: lineup.position2,
    position2: lineup.position3,
    position3: lineup.position4,
    position4: lineup.position5,
    position5: lineup.position6,
    position6: lineup.position1,
  };
};

/**
 * Returns the player currently in a specific rotation (1-6)
 * In volleyball, rotation 1 means the lineup is in its starting positions.
 * Rotation 2 means they have rotated once.
 */
export const getPlayerInPosition = (lineup: Lineup, position: number): string => {
  const posKey = `position${position}` as keyof Lineup;
  return lineup[posKey] as string;
};

/**
 * Calculates the current server position based on starting rotation.
 * If rotation is 1, Pos 1 is serving.
 */
export const getCurrentServerPosition = (rotation: number): number => {
  // In rotation 1, position 1 is server.
  // In rotation 2, position 2 moved to 1, so the "starting position 2" player is serving.
  return rotation; 
};
