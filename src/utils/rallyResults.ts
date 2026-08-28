import type { RallyEvent } from '../types';

export type ServeResult = NonNullable<RallyEvent['serveResult']>;
export type ReceiveResult = NonNullable<RallyEvent['receiveResult']>;

export const getServeResult = (rally: RallyEvent): ServeResult | undefined => {
  if (rally.servingTeam !== 'Us') return undefined;
  if (rally.serveResult) return rally.serveResult;
  if (rally.outcomeType === 'Ace') return 'Ace';
  if (rally.outcomeType === 'Serve Error') return 'Error';
  return undefined;
};

export const getReceiveResult = (rally: RallyEvent): ReceiveResult | undefined => {
  if (rally.servingTeam !== 'Opponent') return undefined;
  if (rally.receiveResult) return rally.receiveResult;
  if (rally.outcomeType === 'Ace' && rally.pointWinner === 'Opponent') return 'Error';
  return undefined;
};

export const getReceivePlayerId = (rally: RallyEvent): string | undefined => {
  if (rally.servingTeam !== 'Opponent') return undefined;
  if (rally.receivePlayerId) return rally.receivePlayerId;

  const receiveResult = getReceiveResult(rally);
  if (receiveResult === 'Error' && rally.outcomeType === 'Ace' && rally.pointWinner === 'Opponent') {
    return rally.playerId;
  }

  return undefined;
};
