import React, { useMemo, useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import type { Classification, OutcomeType, Player, RallyEvent, Set as MatchSet } from '../../types';

type SetFilter = 'all' | string;
type PlayerFilter = 'all' | string;
type OutcomeFilter = 'all' | OutcomeType;
type ClassificationFilter = 'all' | Classification;
type ServingFilter = 'all' | RallyEvent['servingTeam'];
type RotationFilter = 'all' | string;

interface RallyLogCardProps {
  rallies: RallyEvent[];
  players: Player[];
  sets: MatchSet[];
}

const playerLabel = (player?: Player) => {
  if (!player) return 'Unassigned';
  return `#${player.jerseyNumber} ${player.firstName}`;
};

const pointSourceLabel = (rally: RallyEvent) => {
  if (rally.pointWinner === 'Us' && rally.classification === 'Earned') return 'Our earn';
  if (rally.pointWinner === 'Opponent' && rally.classification === 'Gifted') return 'Our gift';
  if (rally.pointWinner === 'Opponent' && rally.classification === 'Earned') return 'Opponent earn';
  if (rally.pointWinner === 'Us' && rally.classification === 'Gifted') return 'Opponent gift';
  return 'Neutral';
};

const resultLabel = (rally: RallyEvent) => {
  if (rally.servingTeam === 'Us' && rally.serveResult) return rally.serveResult;
  if (rally.servingTeam === 'Opponent' && rally.receiveResult) return rally.receiveResult;
  return 'Not tracked';
};

const RallyLogCard: React.FC<RallyLogCardProps> = ({ rallies, players, sets }) => {
  const [setFilter, setSetFilter] = useState<SetFilter>('all');
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [classificationFilter, setClassificationFilter] = useState<ClassificationFilter>('all');
  const [servingFilter, setServingFilter] = useState<ServingFilter>('all');
  const [rotationFilter, setRotationFilter] = useState<RotationFilter>('all');

  const playerMap = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);
  const setMap = useMemo(() => new Map(sets.map(set => [set.id, set])), [sets]);

  const filterOptions = useMemo(() => {
    const setIds = new Set(rallies.map(rally => rally.setId));
    const outcomeTypes = Array.from(new Set(rallies.map(rally => rally.outcomeType))).sort();
    const rotations = Array.from(new Set(
      rallies
        .map(rally => rally.metadata?.rotation)
        .filter((rotation): rotation is number => typeof rotation === 'number')
    )).sort((a, b) => a - b);

    const involvedPlayerIds = new Set<string>();
    rallies.forEach((rally) => {
      [rally.playerId, rally.serverPlayerId, rally.receivePlayerId].forEach((id) => {
        if (id) involvedPlayerIds.add(id);
      });
    });

    return {
      sets: Array.from(setIds)
        .map(setId => setMap.get(setId))
        .filter((set): set is MatchSet => Boolean(set))
        .sort((a, b) => a.setNumber - b.setNumber),
      outcomeTypes,
      rotations,
      players: players
        .filter(player => involvedPlayerIds.has(player.id))
        .sort((a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber) || a.firstName.localeCompare(b.firstName)),
    };
  }, [players, rallies, setMap]);

  const filteredRallies = useMemo(() => {
    return rallies
      .filter((rally) => {
        if (setFilter !== 'all' && rally.setId !== setFilter) return false;
        if (playerFilter !== 'all' && ![rally.playerId, rally.serverPlayerId, rally.receivePlayerId].includes(playerFilter)) return false;
        if (outcomeFilter !== 'all' && rally.outcomeType !== outcomeFilter) return false;
        if (classificationFilter !== 'all' && rally.classification !== classificationFilter) return false;
        if (servingFilter !== 'all' && rally.servingTeam !== servingFilter) return false;
        if (rotationFilter !== 'all' && String(rally.metadata?.rotation ?? '') !== rotationFilter) return false;
        return true;
      })
      .sort((a, b) => b.rallyNumber - a.rallyNumber);
  }, [classificationFilter, outcomeFilter, playerFilter, rallies, rotationFilter, servingFilter, setFilter]);

  const filtersActive = [
    setFilter,
    playerFilter,
    outcomeFilter,
    classificationFilter,
    servingFilter,
    rotationFilter,
  ].some(value => value !== 'all');

  const resetFilters = () => {
    setSetFilter('all');
    setPlayerFilter('all');
    setOutcomeFilter('all');
    setClassificationFilter('all');
    setServingFilter('all');
    setRotationFilter('all');
  };

  return (
    <section className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-teal">Review Detail</p>
          <h3 className="mt-1 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-text-secondary">
            <Filter size={16} className="text-brand-teal" />
            Filtered Rally Log
          </h3>
          <p className="mt-2 text-xs font-semibold text-brand-text-secondary">
            Showing {filteredRallies.length} of {rallies.length} rallies.
          </p>
        </div>
        {filtersActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="print-hide inline-flex items-center gap-2 rounded-xl border border-brand-gray/10 bg-brand-bg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-brand-text-secondary hover:border-brand-teal/40 hover:text-brand-teal"
          >
            <RotateCcw size={14} />
            Clear
          </button>
        )}
      </div>

      <div className="print-hide mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <label className="space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-text-secondary">Set</span>
          <select value={setFilter} onChange={event => setSetFilter(event.target.value)} className="w-full rounded-xl border border-brand-gray/10 bg-brand-bg px-3 py-2 text-xs font-bold text-brand-text">
            <option value="all">All sets</option>
            {filterOptions.sets.map(set => (
              <option key={set.id} value={set.id}>Set {set.setNumber}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-text-secondary">Player</span>
          <select value={playerFilter} onChange={event => setPlayerFilter(event.target.value)} className="w-full rounded-xl border border-brand-gray/10 bg-brand-bg px-3 py-2 text-xs font-bold text-brand-text">
            <option value="all">All players</option>
            {filterOptions.players.map(player => (
              <option key={player.id} value={player.id}>{playerLabel(player)}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-text-secondary">Outcome</span>
          <select value={outcomeFilter} onChange={event => setOutcomeFilter(event.target.value as OutcomeFilter)} className="w-full rounded-xl border border-brand-gray/10 bg-brand-bg px-3 py-2 text-xs font-bold text-brand-text">
            <option value="all">All outcomes</option>
            {filterOptions.outcomeTypes.map(outcome => (
              <option key={outcome} value={outcome}>{outcome}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-text-secondary">Class</span>
          <select value={classificationFilter} onChange={event => setClassificationFilter(event.target.value as ClassificationFilter)} className="w-full rounded-xl border border-brand-gray/10 bg-brand-bg px-3 py-2 text-xs font-bold text-brand-text">
            <option value="all">All classes</option>
            <option value="Earned">Earned</option>
            <option value="Gifted">Gifted</option>
            <option value="Neutral">Neutral</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-text-secondary">Serve</span>
          <select value={servingFilter} onChange={event => setServingFilter(event.target.value as ServingFilter)} className="w-full rounded-xl border border-brand-gray/10 bg-brand-bg px-3 py-2 text-xs font-bold text-brand-text">
            <option value="all">Either team</option>
            <option value="Us">We served</option>
            <option value="Opponent">They served</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-text-secondary">Rotation</span>
          <select value={rotationFilter} onChange={event => setRotationFilter(event.target.value)} className="w-full rounded-xl border border-brand-gray/10 bg-brand-bg px-3 py-2 text-xs font-bold text-brand-text">
            <option value="all">All rotations</option>
            {filterOptions.rotations.map(rotation => (
              <option key={rotation} value={rotation}>Rotation {rotation}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-brand-gray/10 text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">
              <th className="pb-3">Rally</th>
              <th className="pb-3">Set</th>
              <th className="pb-3">Score</th>
              <th className="pb-3">Source</th>
              <th className="pb-3">Outcome</th>
              <th className="pb-3">Player</th>
              <th className="pb-3">Serve</th>
              <th className="pb-3 text-right">Rot</th>
            </tr>
          </thead>
          <tbody>
            {filteredRallies.map((rally) => {
              const set = setMap.get(rally.setId);
              const player = playerMap.get(rally.playerId ?? rally.serverPlayerId ?? rally.receivePlayerId ?? '');
              const source = pointSourceLabel(rally);
              const rotation = rally.metadata?.rotation;

              return (
                <tr key={rally.id} className="border-b border-brand-gray/10 last:border-0">
                  <td className="py-3 text-sm font-black text-brand-text">#{rally.rallyNumber}</td>
                  <td className="py-3 text-sm font-bold text-brand-text-secondary">{set ? set.setNumber : '-'}</td>
                  <td className="py-3 text-sm font-bold text-brand-text">
                    {rally.scoreBeforeUs}-{rally.scoreBeforeOpponent}
                    <span className="mx-1 text-brand-text-secondary">to</span>
                    {rally.scoreAfterUs}-{rally.scoreAfterOpponent}
                  </td>
                  <td className={`py-3 text-xs font-black ${source.includes('gift') ? 'text-brand-red' : source.includes('earn') ? 'text-brand-green' : 'text-brand-text-secondary'}`}>
                    {source}
                  </td>
                  <td className="py-3">
                    <p className="text-sm font-black text-brand-text">{rally.outcomeType}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-brand-text-secondary">{rally.classification}</p>
                  </td>
                  <td className="py-3 text-sm font-bold text-brand-text">{playerLabel(player)}</td>
                  <td className="py-3">
                    <p className="text-sm font-bold text-brand-text">{rally.servingTeam === 'Us' ? 'Us' : 'Them'}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-brand-text-secondary">{resultLabel(rally)}</p>
                  </td>
                  <td className="py-3 text-right text-sm font-black text-brand-teal">
                    {typeof rotation === 'number' ? rotation : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredRallies.length === 0 && (
        <p className="mt-5 rounded-2xl border border-brand-gray/10 bg-brand-bg p-4 text-center text-sm font-semibold text-brand-text-secondary">
          No rallies match these filters.
        </p>
      )}
    </section>
  );
};

export default RallyLogCard;
