import type { RallyEvent } from '../types';

export interface AdvancedStats {
  sideOutPercentage: number;
  pointScoringPercentage: number;
  firstBallSideOutPercentage: number;
  totalReceiveOpportunities: number;
  totalServeOpportunities: number;
}

export interface RotationStats extends AdvancedStats {
  rotation: number;
}

export const calculateAdvancedStats = (rallies: RallyEvent[]): AdvancedStats => {
  const receivePoints = rallies.filter(r => r.servingTeam === 'Opponent');
  const servePoints = rallies.filter(r => r.servingTeam === 'Us');

  const sideOuts = receivePoints.filter(r => r.pointWinner === 'Us').length;
  // FBSO is a side out won on the very first attack. 
  // We can approximate this by checking if the point was earned and NOT a long rally (if we had rally length).
  // For now, let's use a stricter definition: Earned point by Us on Opponent serve.
  const fbSideOuts = receivePoints.filter(r => 
    r.pointWinner === 'Us' && 
    r.classification === 'Earned' && 
    r.outcomeType === 'Kill' // Most FBSO are kills
  ).length;

  const pointsScored = servePoints.filter(r => r.pointWinner === 'Us').length;

  return {
    sideOutPercentage: receivePoints.length > 0 ? (sideOuts / receivePoints.length) * 100 : 0,
    pointScoringPercentage: servePoints.length > 0 ? (pointsScored / servePoints.length) * 100 : 0,
    firstBallSideOutPercentage: receivePoints.length > 0 ? (fbSideOuts / receivePoints.length) * 100 : 0,
    totalReceiveOpportunities: receivePoints.length,
    totalServeOpportunities: servePoints.length
  };
};

export const calculateRotationBreakdown = (rallies: RallyEvent[]): RotationStats[] => {
  const breakdown: RotationStats[] = [];

  for (let rot = 1; rot <= 6; rot++) {
    const rotationRallies = rallies.filter(r => r.metadata?.rotation === rot);
    breakdown.push({
      rotation: rot,
      ...calculateAdvancedStats(rotationRallies)
    });
  }

  return breakdown;
};
