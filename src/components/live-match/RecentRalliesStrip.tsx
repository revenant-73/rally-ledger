import React, { useMemo } from 'react';
import { History } from 'lucide-react';
import type { Player, RallyEvent } from '../../types';
import { getReceivePlayerId, getReceiveResult, getServeResult } from '../../utils/rallyResults';

interface RecentRalliesStripProps {
  rallies: RallyEvent[];
  players: Player[];
  activeSetId: string;
  brightGymMode?: boolean;
  compact?: boolean;
}

const playerShortLabel = (player?: Player) => {
  if (!player) return 'No player';
  return `#${player.jerseyNumber} ${player.firstName}`;
};

const qualityLabel = (rally: RallyEvent) => {
  const serveResult = getServeResult(rally);
  if (serveResult) return `Serve ${serveResult}`;

  const receiveResult = getReceiveResult(rally);
  if (receiveResult) return `Receive ${receiveResult}`;

  return rally.classification;
};

const actionPlayerId = (rally: RallyEvent) => {
  if (rally.playerId) return rally.playerId;
  if (rally.serverPlayerId) return rally.serverPlayerId;
  return getReceivePlayerId(rally);
};

const RecentRalliesStrip: React.FC<RecentRalliesStripProps> = ({
  rallies,
  players,
  activeSetId,
  brightGymMode = false,
  compact = false,
}) => {
  const playerMap = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);
  const recentRallies = useMemo(() => {
    return rallies
      .filter(rally => rally.setId === activeSetId)
      .sort((a, b) => b.rallyNumber - a.rallyNumber)
      .slice(0, 5);
  }, [activeSetId, rallies]);

  const panelClass = brightGymMode
    ? 'border-slate-300 bg-white text-slate-950 shadow-sm'
    : 'border-brand-gray/40 bg-[#0f1117] text-brand-text';
  const mutedTextClass = brightGymMode ? 'text-slate-600' : 'text-brand-text-secondary';
  const itemClass = brightGymMode
    ? 'border-slate-200 bg-slate-50'
    : 'border-brand-gray/30 bg-brand-bg';

  return (
    <section className={`live-recent-rallies mx-3 mb-1 rounded-xl border ${panelClass} ${compact ? 'p-1.5' : 'p-2'}`} aria-label="Recent rally audit">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-brand-teal">
          <History size={compact ? 12 : 14} />
          Last Rallies
        </h3>
        <span className={`text-[8px] font-black uppercase tracking-widest ${mutedTextClass}`}>
          Undo = latest
        </span>
      </div>

      {recentRallies.length === 0 ? (
        <p className={`rounded-lg border border-dashed px-2 py-2 text-center text-[10px] font-bold ${mutedTextClass} ${brightGymMode ? 'border-slate-300' : 'border-brand-gray/30'}`}>
          No rallies entered yet.
        </p>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {recentRallies.map((rally, index) => {
            const player = playerMap.get(actionPlayerId(rally) ?? '');
            const rotation = typeof rally.metadata?.rotation === 'number' ? rally.metadata.rotation : null;
            const isUndoTarget = index === 0;
            const winnerClass = rally.pointWinner === 'Us' ? 'text-brand-green' : 'text-brand-red';

            return (
              <article
                key={rally.id}
                className={`live-recent-rally-card min-w-[142px] rounded-lg border px-2 py-1.5 ${itemClass} ${isUndoTarget ? 'ring-1 ring-brand-teal/70' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-black text-brand-teal">#{rally.rallyNumber}</span>
                  {isUndoTarget && (
                    <span className="rounded bg-brand-teal px-1 py-0.5 text-[7px] font-black uppercase leading-none text-brand-bg">
                      Undo target
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-black leading-none">
                  {rally.scoreBeforeUs}-{rally.scoreBeforeOpponent}
                  <span className={`px-1 text-[10px] ${mutedTextClass}`}>to</span>
                  {rally.scoreAfterUs}-{rally.scoreAfterOpponent}
                </p>
                <p className={`mt-1 text-[9px] font-black uppercase tracking-wide ${winnerClass}`}>
                  {rally.pointWinner === 'Us' ? 'Us' : 'Them'} point
                </p>
                <p className="truncate text-[10px] font-bold">{rally.outcomeType} - {playerShortLabel(player)}</p>
                <p className={`truncate text-[9px] font-bold ${mutedTextClass}`}>
                  {qualityLabel(rally)}{rotation ? ` / Rot ${rotation}` : ''}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RecentRalliesStrip;
