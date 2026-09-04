import { useEffect, useMemo, useState } from 'react';
import {
  type BreakdownItem,
  buildRally,
  deriveSetState,
  eventLabels,
  eventNeedsPlayer,
  getWinnerForEvent,
  summarizeSet,
  TEAM_ATTRIBUTION_ID,
  type ErrorSubtype,
  type LineupSlots,
  type PendingRallyInput,
  type PrototypePlayer,
  type RallyRecord,
  type RallyMode,
  type Rotation,
  type SetSetup,
  type TerminalEvent,
} from '../prototype/matchbookModel';

const storageKey = 'century-matchbook-rebuild-prototype';
const rotations = [1, 2, 3, 4, 5, 6] as const;
type CourtSide = 'left' | 'right';

const mockRoster: PrototypePlayer[] = [
  { id: 'p1', number: '1', name: 'Avery Nguyen', active: true },
  { id: 'p2', number: '2', name: 'Blake Carter', active: true },
  { id: 'p3', number: '3', name: 'Casey Lopez', active: true },
  { id: 'p4', number: '4', name: 'Drew Martin', active: true },
  { id: 'p5', number: '5', name: 'Emerson Hall', active: true },
  { id: 'p6', number: '6', name: 'Finley Reed', active: true },
  { id: 'p7', number: '7', name: 'Gray Wilson', active: true },
  { id: 'p8', number: '8', name: 'Harper Kim', active: true },
  { id: 'p9', number: '9', name: 'Jordan Price', active: true },
  { id: 'p10', number: '10', name: 'Kai Brooks', active: true },
  { id: 'p11', number: '11', name: 'Logan Rivera', active: true },
  { id: 'p12', number: '12', name: 'Morgan Lee', active: true },
  { id: 'p13', number: '13', name: 'Parker Stone', active: true },
  { id: 'p14', number: '14', name: 'Quinn Torres', active: true },
];

const defaultRotationServers = {
  1: 'p1',
  2: 'p2',
  3: 'p3',
  4: 'p4',
  5: 'p5',
  6: 'p6',
} satisfies Partial<Record<Rotation, string>>;

const defaultLineup = {
  1: 'p1',
  2: 'p2',
  3: 'p3',
  4: 'p4',
  5: 'p5',
  6: 'p6',
} satisfies LineupSlots;

const defaultSetup: SetSetup = {
  opponent: 'Liberty',
  setNumber: 1,
  initialMode: 'serving',
  initialRotation: 1,
  initialServerId: 'p1',
  lineup: defaultLineup,
  rotationServers: defaultRotationServers,
};

const centuryEvents: TerminalEvent[] = ['century_ace', 'century_kill', 'century_block', 'opponent_error'];
const opponentEvents: TerminalEvent[] = [
  'opponent_kill',
  'opponent_block',
  'receive_error',
  'serve_error',
  'attack_error',
  'ball_control_error',
  'violation',
];

const inputClass =
  'h-12 rounded border border-white/15 bg-white px-3 text-base font-bold text-slate-950 outline-none focus:border-teal-300';

const actionClass =
  'min-h-14 rounded border border-white/15 px-3 py-2 text-left text-lg font-black uppercase tracking-normal shadow-sm transition active:scale-[0.98] disabled:opacity-50';

interface PersistedPrototype {
  setup: SetSetup;
  rallies: RallyRecord[];
  roster: PrototypePlayer[];
  currentLineup: LineupSlots;
  courtSide: CourtSide;
}

interface PendingSelection {
  event: TerminalEvent;
  mode: 'player' | 'error';
  editingId?: string;
}

interface LineupSelection {
  rotation: Rotation;
  context: 'setup' | 'live';
}

const getInitialPrototype = (): PersistedPrototype => {
  const fallback = { setup: defaultSetup, rallies: [], roster: mockRoster, currentLineup: defaultLineup, courtSide: 'left' as CourtSide };

  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      return fallback;
    }
    const parsed = JSON.parse(saved) as PersistedPrototype;
    return {
      setup: { ...defaultSetup, ...(parsed.setup ?? {}) },
      rallies: parsed.rallies ?? [],
      roster: parsed.roster ?? mockRoster,
      currentLineup: parsed.currentLineup ?? parsed.setup?.lineup ?? defaultLineup,
      courtSide: parsed.courtSide ?? 'left',
    };
  } catch {
    localStorage.removeItem(storageKey);
    return fallback;
  }
};

const getCourtPositions = (courtSide: CourtSide): Rotation[] =>
  courtSide === 'left' ? [5, 4, 6, 3, 1, 2] : [2, 1, 3, 6, 4, 5];

const getLineupRotationForCourtPosition = (currentRotation: Rotation, courtPosition: Rotation): Rotation =>
  (((currentRotation + courtPosition - 2) % rotations.length) + 1) as Rotation;

const getDefaultLineup = (players: PrototypePlayer[]): LineupSlots =>
  rotations.reduce<LineupSlots>((lineup, rotation, index) => {
    const player = players.filter((item) => item.active)[index];
    if (player) {
      lineup[rotation] = player.id;
    }
    return lineup;
  }, {});

const getRotationServers = (lineup: LineupSlots): Partial<Record<Rotation, string>> =>
  rotations.reduce<Partial<Record<Rotation, string>>>((servers, rotation) => {
    const playerId = lineup[rotation];
    if (playerId) {
      servers[rotation] = playerId;
    }
    return servers;
  }, {});

const setLineupSlot = (lineup: LineupSlots, rotation: Rotation, playerId: string): LineupSlots => {
  const nextLineup = { ...lineup };
  const previousPlayerId = nextLineup[rotation];
  const existingRotation = rotations.find((item) => nextLineup[item] === playerId);

  nextLineup[rotation] = playerId;
  if (existingRotation && existingRotation !== rotation) {
    if (previousPlayerId) {
      nextLineup[existingRotation] = previousPlayerId;
    } else {
      delete nextLineup[existingRotation];
    }
  }

  return nextLineup;
};

const getPlayerLabel = (players: PrototypePlayer[], playerId?: string) => {
  if (!playerId) {
    return 'Unassigned';
  }
  const player = players.find((item) => item.id === playerId);
  return player ? `#${player.number} ${getShortPlayerName(player)}` : 'Unknown player';
};

const getShortPlayerName = (player: PrototypePlayer) => {
  const [firstName, lastName = ''] = player.name.trim().split(/\s+/);
  const lastInitial = lastName ? ` ${lastName.charAt(0)}.` : '';
  return `${firstName}${lastInitial}`;
};

const getRallyDescription = (rally: RallyRecord, players: PrototypePlayer[]) => {
  const playerId = rally.creditedPlayerId ?? rally.chargedPlayerId;
  const playerText = rally.teamAttribution ? 'TEAM / UNCLEAR' : getPlayerLabel(players, playerId);
  const extra = rally.errorSubtype ? ` - ${rally.errorSubtype}` : playerId || rally.teamAttribution ? ` - ${playerText}` : '';
  return `${rally.winner === 'century' ? 'Century' : 'Opponent'} ${eventLabels[rally.event]}${extra}`;
};

const getTopPlayers = (
  summary: ReturnType<typeof summarizeSet>,
  players: PrototypePlayer[],
  key: 'earnedPoints' | 'giftsConceded',
) =>
  summary.players
    .filter((item) => item[key] > 0)
    .sort((a, b) => b[key] - a[key] || getPlayerLabel(players, a.playerId).localeCompare(getPlayerLabel(players, b.playerId)))
    .slice(0, 2);

const makeInput = (event: TerminalEvent, playerId?: string, errorSubtype?: ErrorSubtype): PendingRallyInput => {
  const attribution = eventNeedsPlayer(event);
  const teamAttribution = playerId === TEAM_ATTRIBUTION_ID;
  return {
    winner: getWinnerForEvent(event),
    event,
    errorSubtype,
    creditedPlayerId: attribution === 'credited' && !teamAttribution ? playerId : undefined,
    chargedPlayerId: attribution === 'charged' && !teamAttribution ? playerId : undefined,
    teamAttribution: teamAttribution || undefined,
  };
};

const RebuildPrototype = () => {
  const [initialPrototype] = useState<PersistedPrototype>(() => getInitialPrototype());
  const [roster, setRoster] = useState<PrototypePlayer[]>(initialPrototype.roster);
  const [setup, setSetup] = useState(initialPrototype.setup);
  const [draftSetup, setDraftSetup] = useState(initialPrototype.setup);
  const [currentLineup, setCurrentLineup] = useState<LineupSlots>(initialPrototype.currentLineup);
  const [courtSide, setCourtSide] = useState<CourtSide>(initialPrototype.courtSide);
  const [rallies, setRallies] = useState<RallyRecord[]>(initialPrototype.rallies);
  const [restorable, setRestorable] = useState<RallyRecord | null>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [feedback, setFeedback] = useState('Ready');
  const [locked, setLocked] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [lineupSelection, setLineupSelection] = useState<LineupSelection | null>(null);

  useEffect(() => {
    const payload: PersistedPrototype = { setup, rallies, roster, currentLineup, courtSide };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [setup, rallies, roster, currentLineup, courtSide]);

  useEffect(() => {
    if (!locked) {
      return;
    }
    const timeout = window.setTimeout(() => setLocked(false), 260);
    return () => window.clearTimeout(timeout);
  }, [locked]);

  const state = useMemo(() => deriveSetState(setup, rallies), [setup, rallies]);
  const activeRoster = useMemo(() => roster.filter((player) => player.active), [roster]);
  const summary = useMemo(() => summarizeSet(rallies, roster), [rallies, roster]);
  const currentServer = roster.find((player) => player.id === state.serverId);
  const lastRally = [...rallies].reverse().find((rally) => rally.active);
  const activeRallies = rallies.filter((rally) => rally.active);
  const recentRallies = [...activeRallies].reverse().slice(0, 3);

  const recordRally = (input: PendingRallyInput) => {
    if (locked) {
      return;
    }
    const rally = buildRally(setup, rallies, input);
    setRallies((current) => [...current, rally]);
    setRestorable(null);
    setPending(null);
    setFeedback(getRallyDescription(rally, roster));
    setLocked(true);
  };

  const updateLastRally = (input: PendingRallyInput, rallyId: string) => {
    setRallies((current) =>
      current.map((rally) => (rally.id === rallyId ? { ...rally, ...input, createdAt: new Date().toISOString() } : rally)),
    );
    setPending(null);
    setCorrectionOpen(false);
    setFeedback('Last rally corrected');
  };

  const handleEvent = (event: TerminalEvent, editingId?: string) => {
    if (event === 'opponent_error') {
      setPending({ event, mode: 'error', editingId });
      return;
    }

    const playerNeed = eventNeedsPlayer(event);
    if (playerNeed !== 'none') {
      setPending({ event, mode: 'player', editingId });
      return;
    }

    const input = makeInput(event);
    if (editingId) {
      updateLastRally(input, editingId);
    } else {
      recordRally(input);
    }
  };

  const handlePlayer = (playerId: string) => {
    if (!pending) {
      return;
    }
    const input = makeInput(pending.event, playerId);
    if (pending.editingId) {
      updateLastRally(input, pending.editingId);
    } else {
      recordRally(input);
    }
  };

  const handleErrorSubtype = (errorSubtype: ErrorSubtype) => {
    if (!pending) {
      return;
    }
    const input = makeInput(pending.event, undefined, errorSubtype);
    if (pending.editingId) {
      updateLastRally(input, pending.editingId);
    } else {
      recordRally(input);
    }
  };

  const undo = () => {
    const last = [...rallies].reverse().find((rally) => rally.active);
    if (!last) {
      return;
    }
    setRallies((current) => current.map((rally) => (rally.id === last.id ? { ...rally, active: false } : rally)));
    setRestorable(last);
    setFeedback('Last rally undone');
  };

  const restore = () => {
    if (!restorable) {
      return;
    }
    setRallies((current) => current.map((rally) => (rally.id === restorable.id ? { ...rally, active: true } : rally)));
    setFeedback('Rally restored');
    setRestorable(null);
  };

  const startSet = () => {
    const lineup = draftSetup.lineup ?? getDefaultLineup(roster);
    const normalized = {
      ...draftSetup,
      opponent: draftSetup.opponent.trim() || 'Opponent',
      initialServerId: draftSetup.initialMode === 'serving' ? lineup[draftSetup.initialRotation] : undefined,
      lineup,
      rotationServers: getRotationServers(lineup),
    };
    setSetup(normalized);
    setCurrentLineup(normalized.lineup ?? {});
    setRallies([]);
    setRestorable(null);
    setSetupOpen(false);
    setFeedback('Set started');
  };

  const updateDraftLineup = (rotation: Rotation, playerId: string) => {
    const lineup = setLineupSlot(draftSetup.lineup ?? getDefaultLineup(roster), rotation, playerId);
    setDraftSetup({
      ...draftSetup,
      lineup,
      initialServerId: draftSetup.initialMode === 'serving' ? lineup[draftSetup.initialRotation] : draftSetup.initialServerId,
      rotationServers: getRotationServers(lineup),
    });
    setLineupSelection(null);
  };

  const updateLiveLineup = (rotation: Rotation, playerId: string) => {
    const lineup = setLineupSlot(currentLineup, rotation, playerId);
    const nextSetup = {
      ...setup,
      lineup,
      rotationServers: getRotationServers(lineup),
      initialServerId: setup.initialRotation === rotation ? playerId : setup.initialServerId,
    };

    setCurrentLineup(lineup);
    setSetup(nextSetup);
    setDraftSetup(nextSetup);
    setLineupSelection(null);
    setFeedback(`R${rotation} changed to ${getPlayerLabel(roster, playerId)}`);
  };

  const resetPrototype = () => {
    setSetup(defaultSetup);
    setDraftSetup(defaultSetup);
    setRoster(mockRoster);
    setCurrentLineup(defaultLineup);
    setCourtSide('left');
    setRallies([]);
    setRestorable(null);
    setPending(null);
    setFeedback('Prototype reset');
    setSetupOpen(true);
    localStorage.removeItem(storageKey);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-3 sm:px-5 lg:max-h-screen lg:overflow-hidden">
        <header className="grid gap-3 border-b border-white/15 pb-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="rounded bg-teal-400 px-4 py-3 text-slate-950">
              <p className="text-xs font-black uppercase">Century</p>
              <p className="text-5xl font-black leading-none sm:text-6xl">{state.centuryScore}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-black uppercase text-slate-300">Set {setup.setNumber}</p>
              <p className="mt-1 text-2xl font-black text-white">R{state.rotation}</p>
            </div>
            <div className="rounded bg-white px-4 py-3 text-right text-slate-950">
              <p className="text-xs font-black uppercase">{setup.opponent}</p>
              <p className="text-5xl font-black leading-none sm:text-6xl">{state.opponentScore}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[34rem]">
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              className="min-h-14 rounded border border-white/15 bg-white/10 px-3 text-left font-black"
            >
              {state.mode === 'serving' ? 'SERVING' : 'RECEIVING'}
              <span className="block text-xs font-bold text-slate-300">
                {state.mode === 'serving' ? currentServer ? `#${currentServer.number} ${getShortPlayerName(currentServer)}` : 'Pick server' : 'Century receive'}
              </span>
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!lastRally}
              className="min-h-14 rounded bg-slate-200 px-3 text-left font-black text-slate-950 disabled:opacity-50"
            >
              Undo
              <span className="block text-xs font-bold">Immediate</span>
            </button>
            <button
              type="button"
              onClick={() => setCorrectionOpen(true)}
              disabled={!lastRally}
              className="min-h-14 rounded border border-amber-300 bg-amber-300 px-3 text-left font-black text-slate-950 disabled:opacity-50"
            >
              Correct
              <span className="block text-xs font-bold">Edit last rally</span>
            </button>
            <button
              type="button"
              onClick={() => setSummaryOpen((value) => !value)}
              aria-expanded={summaryOpen}
              className="min-h-14 rounded border border-white/15 bg-white/10 px-3 text-left font-black"
            >
              {summaryOpen ? 'Hide Summary' : 'Summary'}
              <span className="block text-xs font-bold text-slate-300">{activeRallies.length} rallies</span>
            </button>
          </div>
        </header>

        <section className="mt-3 flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="grid min-h-0 content-start gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <EventPanel
                title="CENTURY POINT"
                tone="century"
                events={centuryEvents}
                onEvent={(event) => handleEvent(event)}
                disabled={locked}
              />
              <EventPanel
                title="OPPONENT POINT"
                tone="opponent"
                events={opponentEvents}
                onEvent={(event) => handleEvent(event)}
                disabled={locked}
              />
            </div>

            <div className="grid min-h-0 gap-3 md:grid-cols-2 lg:gap-2">
              <section className="rounded border border-white/15 bg-white/5 p-3 lg:p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-300">Current Lineup</h2>
                    <p className="text-lg font-black">{state.mode === 'serving' ? getPlayerLabel(roster, state.serverId) : 'Century receiving'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSetupOpen(true)}
                      className="min-h-10 rounded bg-white px-3 text-sm font-black text-slate-950"
                    >
                      Edit Lineup
                    </button>
                    <SideToggle courtSide={courtSide} onChange={setCourtSide} compact />
                  </div>
                </div>
                <CourtLineupGrid
                  courtSide={courtSide}
                  currentRotation={state.rotation}
                  lineup={currentLineup}
                  roster={roster}
                  onPick={(rotation) => setLineupSelection({ rotation, context: 'live' })}
                />
              </section>

              <section className="min-h-0 rounded border border-white/15 bg-white/5 p-3 lg:p-2">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-300">Recent Rallies</h2>
                    <p className="text-xs font-bold text-slate-500">Last {Math.min(activeRallies.length, 3)} of {activeRallies.length}</p>
                  </div>
                  {restorable ? (
                    <button type="button" onClick={restore} className="rounded bg-teal-300 px-3 py-2 text-sm font-black text-slate-950">
                      Restore
                    </button>
                  ) : null}
                </div>
                <div className="max-h-48 space-y-2 overflow-auto pr-1 lg:max-h-44">
                  {recentRallies.map((rally) => (
                    <div key={rally.id} className="rounded border border-white/10 bg-slate-900 px-3 py-2 lg:py-1.5">
                      <p className="text-sm font-black">{getRallyDescription(rally, roster)}</p>
                      <p className="text-xs font-bold text-slate-400">
                        Rally {rally.sequence} - started {rally.startMode}, R{rally.startRotation}
                      </p>
                    </div>
                  ))}
                  {activeRallies.length === 0 ? <p className="py-6 text-center text-sm font-bold text-slate-400">No rallies yet.</p> : null}
                </div>
              </section>
            </div>
          </div>

          <aside className="grid content-start gap-3">
            <div className="rounded border border-white/15 bg-slate-900 p-3">
              <p className="text-xs font-black uppercase text-slate-400">Recorded</p>
              <p className="mt-1 text-lg font-black">{feedback}</p>
            </div>
          </aside>
        </section>
      </div>

      {summaryOpen ? <SummaryPanel summary={summary} players={roster} onClose={() => setSummaryOpen(false)} /> : null}

      {setupOpen ? (
        <SetupSheet
          setup={draftSetup}
          stateMode={state.mode}
          currentRotation={state.rotation}
          roster={roster}
          activeRoster={activeRoster}
          courtSide={courtSide}
          onChange={setDraftSetup}
          onRosterChange={setRoster}
          onCourtSideChange={setCourtSide}
          onPickLineupSlot={(rotation) => setLineupSelection({ rotation, context: 'setup' })}
          onClose={() => setSetupOpen(false)}
          onStart={startSet}
          onReset={resetPrototype}
        />
      ) : null}

      {pending ? (
        <PickerSheet
          pending={pending}
          players={activeRoster}
          onPlayer={handlePlayer}
          onErrorSubtype={handleErrorSubtype}
          onCancel={() => setPending(null)}
        />
      ) : null}

      {correctionOpen && lastRally ? (
        <CorrectionSheet
          rally={lastRally}
          players={roster}
          onEvent={(event) => handleEvent(event, lastRally.id)}
          onClose={() => setCorrectionOpen(false)}
        />
      ) : null}

      {lineupSelection ? (
        <LineupPickerSheet
          rotation={lineupSelection.rotation}
          context={lineupSelection.context}
          players={activeRoster}
          lineup={lineupSelection.context === 'setup' ? draftSetup.lineup ?? getDefaultLineup(roster) : currentLineup}
          onPlayer={(playerId) => {
            if (lineupSelection.context === 'setup') {
              updateDraftLineup(lineupSelection.rotation, playerId);
            } else {
              updateLiveLineup(lineupSelection.rotation, playerId);
            }
          }}
          onCancel={() => setLineupSelection(null)}
        />
      ) : null}
    </main>
  );
};

interface EventPanelProps {
  title: string;
  tone: 'century' | 'opponent';
  events: TerminalEvent[];
  disabled: boolean;
  onEvent: (event: TerminalEvent) => void;
}

const EventPanel = ({ title, tone, events, disabled, onEvent }: EventPanelProps) => (
  <section className={`rounded border p-3 ${tone === 'century' ? 'border-teal-300 bg-teal-950/60' : 'border-slate-300 bg-slate-800'}`}>
    <h2 className="mb-3 text-base font-black uppercase">{title}</h2>
    <div className="grid grid-cols-2 gap-2">
      {events.map((event) => (
        <button
          key={event}
          type="button"
          disabled={disabled}
          onClick={() => onEvent(event)}
          className={`${actionClass} ${
            tone === 'century' ? 'bg-teal-300 text-slate-950 hover:bg-teal-200' : 'bg-white text-slate-950 hover:bg-slate-100'
          } ${event === 'ball_control_error' || event === 'violation' ? 'text-base' : ''}`}
        >
          {eventLabels[event]}
          {eventNeedsPlayer(event) !== 'none' ? <span className="block text-xs font-bold opacity-75">Pick player next</span> : null}
          {event === 'opponent_error' ? <span className="block text-xs font-bold opacity-75">Pick type next</span> : null}
        </button>
      ))}
    </div>
  </section>
);

interface SideToggleProps {
  courtSide: CourtSide;
  compact?: boolean;
  onChange: (courtSide: CourtSide) => void;
}

const SideToggle = ({ courtSide, compact = false, onChange }: SideToggleProps) => (
  <div className={`grid grid-cols-2 rounded bg-slate-800 p-1 ${compact ? 'w-28' : 'w-36'}`}>
    {(['left', 'right'] satisfies CourtSide[]).map((side) => (
      <button
        key={side}
        type="button"
        onClick={() => onChange(side)}
        className={`min-h-8 rounded px-2 text-xs font-black uppercase ${
          courtSide === side ? 'bg-teal-300 text-slate-950' : 'text-slate-200'
        }`}
      >
        {side}
      </button>
    ))}
  </div>
);

interface CourtLineupGridProps {
  courtSide: CourtSide;
  currentRotation: Rotation;
  lineup: LineupSlots;
  roster: PrototypePlayer[];
  variant?: 'dark' | 'light';
  actionLabel?: 'Set' | 'Substitute';
  onPick: (rotation: Rotation) => void;
}

const CourtLineupGrid = ({
  courtSide,
  currentRotation,
  lineup,
  roster,
  variant = 'dark',
  actionLabel = 'Substitute',
  onPick,
}: CourtLineupGridProps) => {
  const light = variant === 'light';
  const positions = getCourtPositions(courtSide);

  return (
    <div className={`mt-3 rounded border p-2 lg:mt-2 lg:p-1.5 ${light ? 'border-slate-300 bg-slate-100' : 'border-white/15 bg-slate-950'}`}>
      <div className={`mb-2 flex items-center lg:mb-1.5 ${courtSide === 'left' ? 'justify-end' : 'justify-start'}`}>
        <span className={`rounded px-2 py-1 text-[0.65rem] font-black uppercase ${light ? 'bg-slate-300 text-slate-900' : 'bg-white/10 text-slate-300'}`}>
          Net
        </span>
      </div>
      <div className={`grid grid-cols-2 gap-2 border-teal-300 lg:gap-1.5 ${courtSide === 'left' ? 'border-r-4 pr-2 lg:pr-1.5' : 'border-l-4 pl-2 lg:pl-1.5'}`}>
        {positions.map((courtPosition) => {
          const lineupRotation = getLineupRotationForCourtPosition(currentRotation, courtPosition);
          const active = courtPosition === 1;
          const playerId = lineup[lineupRotation];
          const player = roster.find((item) => item.id === playerId);

          return (
            <button
              key={courtPosition}
              type="button"
              aria-label={`${actionLabel} position ${courtPosition} ${getPlayerLabel(roster, playerId)}`}
              onClick={() => onPick(lineupRotation)}
              className={`relative min-h-12 rounded border px-2 py-1.5 text-left lg:min-h-11 lg:py-1 ${
                active
                  ? 'border-teal-600 bg-teal-300 text-slate-950'
                  : light
                    ? 'border-slate-300 bg-white text-slate-950'
                    : 'border-white/15 bg-slate-900 text-white'
              }`}
            >
              <span className="absolute right-1.5 top-1.5 rounded bg-black/10 px-1.5 py-0.5 text-[0.65rem] font-black">P{courtPosition}</span>
              <span className="block text-xl font-black leading-none">{player ? `#${player.number}` : 'Empty'}</span>
              <span className={`mt-0.5 block truncate text-xs font-black ${active || light ? 'text-slate-700' : 'text-slate-300'}`}>
                {player ? getShortPlayerName(player) : 'Tap to set'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface SetupSheetProps {
  setup: SetSetup;
  stateMode: RallyMode;
  currentRotation: Rotation;
  roster: PrototypePlayer[];
  activeRoster: PrototypePlayer[];
  courtSide: CourtSide;
  onChange: (setup: SetSetup) => void;
  onRosterChange: (roster: PrototypePlayer[]) => void;
  onCourtSideChange: (courtSide: CourtSide) => void;
  onPickLineupSlot: (rotation: Rotation) => void;
  onClose: () => void;
  onStart: () => void;
  onReset: () => void;
}

const SetupSheet = ({
  setup,
  stateMode,
  currentRotation,
  roster,
  activeRoster,
  courtSide,
  onChange,
  onRosterChange,
  onCourtSideChange,
  onPickLineupSlot,
  onClose,
  onStart,
  onReset,
}: SetupSheetProps) => {
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [editor, setEditor] = useState<'roster' | 'lineup' | null>(null);
  const lineup = setup.lineup ?? getDefaultLineup(roster);

  const addPlayer = () => {
    const number = newNumber.trim();
    const name = newName.trim();
    if (!number || !name) {
      return;
    }
    onRosterChange([...roster, { id: `p-${Date.now()}`, number, name, active: true }]);
    setNewNumber('');
    setNewName('');
  };

  const togglePlayer = (playerId: string) => {
    onRosterChange(roster.map((player) => (player.id === playerId ? { ...player, active: !player.active } : player)));
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
      <section className="max-h-[92vh] w-full overflow-auto rounded bg-slate-100 p-4 text-slate-950 shadow-xl sm:max-w-4xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Start Set</h2>
            <p className="text-sm font-bold text-slate-600">{activeRoster.length} active players. Lineup and roster are saved on this device.</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-12 rounded bg-slate-950 px-4 font-black text-white">
            Done
          </button>
        </div>

        <section className="mt-4 rounded border border-slate-300 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_0.6fr]">
            <label className="grid gap-1">
              <span className="text-xs font-black uppercase text-slate-600">Opponent</span>
              <input className={inputClass} value={setup.opponent} onChange={(event) => onChange({ ...setup, opponent: event.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-black uppercase text-slate-600">Set</span>
              <input
                className={inputClass}
                type="number"
                min={1}
                value={setup.setNumber}
                onChange={(event) => onChange({ ...setup, setNumber: Number(event.target.value) || 1 })}
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.2fr_1fr]">
            <div>
              <p className="mb-2 text-xs font-black uppercase text-slate-600">Starts</p>
              <div className="grid grid-cols-2 rounded bg-slate-900 p-1">
                {(['serving', 'receiving'] satisfies RallyMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onChange({ ...setup, initialMode: mode })}
                    className={`min-h-12 rounded text-sm font-black uppercase ${
                      setup.initialMode === mode ? 'bg-teal-500 text-slate-950' : 'text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase text-slate-600">Starting Rotation</p>
              <div className="grid grid-cols-6 gap-2">
                {rotations.map((rotation) => (
                  <button
                    key={rotation}
                    type="button"
                    aria-label={`Starting rotation R${rotation}`}
                    onClick={() => onChange({ ...setup, initialRotation: rotation, initialServerId: setup.lineup?.[rotation] ?? setup.initialServerId })}
                    className={`min-h-12 rounded border text-base font-black ${
                      setup.initialRotation === rotation ? 'border-teal-700 bg-teal-500 text-slate-950' : 'border-slate-300 bg-white'
                    }`}
                  >
                    R{rotation}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-black uppercase text-slate-600">Court Side</p>
              <SideToggle courtSide={courtSide} onChange={onCourtSideChange} />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="rounded border border-slate-300 bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-600">
                {stateMode === 'serving' ? `Server for current R${currentRotation}` : 'Starting server if Century serves'}
              </p>
              <p className="mt-1 text-xl font-black">{getPlayerLabel(roster, lineup[setup.initialRotation])}</p>
            </div>
            <button type="button" onClick={onStart} className="min-h-14 rounded bg-teal-500 px-5 font-black text-slate-950">
              Start Set
            </button>
          </div>
        </section>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setEditor((value) => (value === 'roster' ? null : 'roster'))}
            className={`min-h-12 rounded px-3 font-black ${editor === 'roster' ? 'bg-teal-500 text-slate-950' : 'bg-white text-slate-950'}`}
          >
            Edit Roster
          </button>
          <button
            type="button"
            onClick={() => setEditor((value) => (value === 'lineup' ? null : 'lineup'))}
            className={`min-h-12 rounded px-3 font-black ${editor === 'lineup' ? 'bg-teal-500 text-slate-950' : 'bg-white text-slate-950'}`}
          >
            Edit Lineup
          </button>
          <button type="button" onClick={onReset} className="min-h-12 rounded bg-slate-950 px-3 font-black text-white">
            Reset Prototype
          </button>
        </div>

        {editor === 'roster' ? (
          <section className="mt-3 rounded border border-slate-300 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-600">Roster</h3>
                <p className="text-xs font-bold text-slate-500">{activeRoster.length} active players</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onRosterChange([]);
                    onChange({ ...setup, lineup: {}, initialServerId: undefined, rotationServers: {} });
                  }}
                  className="min-h-10 rounded bg-slate-200 px-3 text-sm font-black"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRosterChange(mockRoster);
                    onChange({ ...setup, lineup: defaultLineup, initialServerId: defaultLineup[setup.initialRotation], rotationServers: defaultRotationServers });
                  }}
                  className="min-h-10 rounded bg-slate-200 px-3 text-sm font-black"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[5rem_1fr_auto] gap-2">
              <input
                className={inputClass}
                placeholder="#"
                value={newNumber}
                onChange={(event) => setNewNumber(event.target.value)}
                aria-label="New player number"
              />
              <input
                className={inputClass}
                placeholder="Player name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                aria-label="New player name"
              />
              <button type="button" onClick={addPlayer} className="min-h-12 rounded bg-teal-500 px-4 font-black text-slate-950">
                Add
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {roster.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  aria-label={`Toggle active ${getPlayerLabel(roster, player.id)}`}
                  onClick={() => togglePlayer(player.id)}
                  className={`min-h-14 rounded border px-2 py-1 text-left ${
                    player.active ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-slate-200 text-slate-500'
                  }`}
                >
                  <span className="block text-xl font-black leading-none">#{player.number}</span>
                  <span className="block truncate text-xs font-bold">{getShortPlayerName(player)}</span>
                  <span className="block text-[0.65rem] font-black uppercase">{player.active ? 'Active' : 'Inactive'}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {editor === 'lineup' ? (
          <section className="mt-3 rounded border border-slate-300 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-600">Starting Lineup</h3>
                <p className="text-xs font-bold text-slate-500">Court view follows Century's side of the net.</p>
              </div>
              <SideToggle courtSide={courtSide} onChange={onCourtSideChange} />
            </div>
            <CourtLineupGrid
              courtSide={courtSide}
              currentRotation={setup.initialRotation}
              lineup={lineup}
              roster={roster}
              variant="light"
              actionLabel="Set"
              onPick={onPickLineupSlot}
            />
            <button
              type="button"
              onClick={() => {
                const nextLineup = getDefaultLineup(roster);
                onChange({
                  ...setup,
                  lineup: nextLineup,
                  initialServerId: nextLineup[setup.initialRotation],
                  rotationServers: getRotationServers(nextLineup),
                });
              }}
              className="mt-2 min-h-12 w-full rounded bg-slate-200 px-3 font-black"
            >
              Fill First Six Active
            </button>
          </section>
        ) : null}
      </section>
    </div>
  );
};

interface PickerSheetProps {
  pending: PendingSelection;
  players: PrototypePlayer[];
  onPlayer: (playerId: string) => void;
  onErrorSubtype: (subtype: ErrorSubtype) => void;
  onCancel: () => void;
}

const PickerSheet = ({ pending, players, onPlayer, onErrorSubtype, onCancel }: PickerSheetProps) => (
  <div className="fixed inset-0 z-30 flex items-end bg-black/70 p-3">
    <section className="w-full rounded bg-slate-100 p-3 text-slate-950 shadow-xl sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black sm:text-xl">{pending.mode === 'player' ? `Player for ${eventLabels[pending.event]}` : 'Their Error Type'}</h2>
        <button type="button" onClick={onCancel} className="min-h-14 rounded bg-slate-950 px-4 font-black text-white">
          Back
        </button>
      </div>
      {pending.mode === 'error' ? (
        <div className="grid grid-cols-3 gap-2">
          {(['Serve', 'Attack', 'Other'] satisfies ErrorSubtype[]).map((subtype) => (
            <button key={subtype} type="button" onClick={() => onErrorSubtype(subtype)} className="min-h-20 rounded bg-teal-500 text-xl font-black">
              {subtype}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 xl:grid-cols-8">
          {eventNeedsPlayer(pending.event) === 'charged' || pending.event === 'century_block' ? (
            <button type="button" onClick={() => onPlayer(TEAM_ATTRIBUTION_ID)} className="min-h-14 rounded bg-slate-950 px-2 text-center text-white">
              <span className="block text-sm font-black leading-tight">TEAM</span>
              <span className="block text-[0.65rem] font-bold leading-tight text-slate-300">UNCLEAR</span>
            </button>
          ) : null}
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              aria-label={`Choose ${getPlayerLabel(players, player.id)}`}
              onClick={() => onPlayer(player.id)}
              className="min-h-14 rounded border border-slate-300 bg-white px-2 py-1 text-center shadow-sm"
            >
              <span className="block text-2xl font-black leading-none sm:text-3xl">#{player.number}</span>
              <span className="mt-1 block truncate text-[0.68rem] font-bold leading-tight text-slate-600 sm:text-xs">{getShortPlayerName(player)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  </div>
);

interface LineupPickerSheetProps {
  rotation: Rotation;
  context: 'setup' | 'live';
  players: PrototypePlayer[];
  lineup: LineupSlots;
  onPlayer: (playerId: string) => void;
  onCancel: () => void;
}

const LineupPickerSheet = ({ rotation, context, players, lineup, onPlayer, onCancel }: LineupPickerSheetProps) => (
  <div className="fixed inset-0 z-30 flex items-end bg-black/70 p-3">
    <section className="w-full rounded bg-slate-100 p-3 text-slate-950 shadow-xl sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black sm:text-xl">{context === 'setup' ? `Set R${rotation}` : `Substitute R${rotation}`}</h2>
          <p className="text-xs font-bold text-slate-600">Choosing a player already in the lineup swaps the two spots.</p>
        </div>
        <button type="button" onClick={onCancel} className="min-h-14 rounded bg-slate-950 px-4 font-black text-white">
          Back
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 xl:grid-cols-8">
        {players.map((player) => {
          const playerRotation = rotations.find((item) => lineup[item] === player.id);
          const selected = lineup[rotation] === player.id;

          return (
            <button
              key={player.id}
              type="button"
              aria-label={`Choose lineup ${getPlayerLabel(players, player.id)}`}
              onClick={() => onPlayer(player.id)}
              className={`min-h-14 rounded border px-2 py-1 text-center shadow-sm ${
                selected
                  ? 'border-teal-700 bg-teal-500 text-slate-950'
                  : playerRotation
                    ? 'border-amber-400 bg-amber-100 text-slate-950'
                    : 'border-slate-300 bg-white'
              }`}
            >
              <span className="block text-2xl font-black leading-none sm:text-3xl">#{player.number}</span>
              <span className="mt-1 block truncate text-[0.68rem] font-bold leading-tight sm:text-xs">{getShortPlayerName(player)}</span>
              {playerRotation ? <span className="block text-[0.6rem] font-black uppercase leading-tight">R{playerRotation}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  </div>
);

interface CorrectionSheetProps {
  rally: RallyRecord;
  players: PrototypePlayer[];
  onEvent: (event: TerminalEvent) => void;
  onClose: () => void;
}

const CorrectionSheet = ({ rally, players, onEvent, onClose }: CorrectionSheetProps) => (
  <div className="fixed inset-0 z-20 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
    <section className="w-full rounded bg-slate-100 p-4 text-slate-950 shadow-xl sm:max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Correct Last Rally</h2>
          <p className="text-sm font-bold text-slate-600">{getRallyDescription(rally, players)}</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-14 rounded bg-slate-950 px-4 font-black text-white">
          Close
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <EventPanel title="CENTURY POINT" tone="century" events={centuryEvents} onEvent={onEvent} disabled={false} />
        <EventPanel title="OPPONENT POINT" tone="opponent" events={opponentEvents} onEvent={onEvent} disabled={false} />
      </div>
    </section>
  </div>
);

interface SummaryPanelProps {
  summary: ReturnType<typeof summarizeSet>;
  players: PrototypePlayer[];
  onClose: () => void;
}

const SummaryPanel = ({ summary, players, onClose }: SummaryPanelProps) => (
  <div className="fixed inset-0 z-30 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
    <section className="max-h-[86vh] w-full overflow-auto rounded bg-slate-100 p-3 text-slate-950 shadow-xl sm:max-w-3xl sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Set / Match Live Read</h2>
          <p className="text-sm font-bold text-slate-600">Current scoring balance from the rally log.</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-14 rounded bg-slate-950 px-4 font-black text-white">
          Back
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Earned" value={summary.team.earnedPoints} />
        <Metric label="Gifts In" value={summary.team.giftsReceived} />
        <Metric label="Gifts Out" value={summary.team.giftsConceded} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Metric label="BP" value={summary.team.breakpoint.label} compact />
        <Metric label="Sideout" value={summary.team.sideout.label} compact />
        <Metric label="Serve IN" value={summary.team.serveIn.label} compact />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-3">
          <BreakdownBlock title="Where Earning" emptyText="No earned points yet" items={summary.team.earnedByType} tone="good" />
          <PlayerBlock title="Who Earning" emptyText="No player-earned points yet" players={players} summary={summary} mode="earnedPoints" />
        </div>
        <div className="grid content-start gap-3">
          <BreakdownBlock title="Where Gifting" emptyText="No Century gifts conceded" items={summary.team.giftsConcededByType} tone="warn" />
          <PlayerBlock title="Who Gifting" emptyText="No player gifts charged" players={players} summary={summary} mode="giftsConceded" />
        </div>
      </div>
    </section>
  </div>
);

const Metric = ({ label, value, compact = false }: { label: string; value: string | number; compact?: boolean }) => (
  <div className="rounded bg-slate-900 p-2 text-white">
    <p className="text-xs font-black uppercase text-slate-300">{label}</p>
    <p className={`${compact ? 'text-xl' : 'text-2xl'} font-black`}>{value}</p>
  </div>
);

const BreakdownBlock = ({
  title,
  emptyText,
  items,
  tone,
}: {
  title: string;
  emptyText: string;
  items: BreakdownItem[];
  tone: 'good' | 'warn' | 'neutral';
}) => (
  <div>
    <h3 className="text-xs font-black uppercase text-slate-600">{title}</h3>
    <div className="mt-1.5 space-y-1.5">
      {items.length > 0 ? (
        items.map((item) => <InsightRow key={item.key} label={item.label} value={item.total} tone={tone} />)
      ) : (
        <p className="rounded bg-white p-2 text-sm font-bold text-slate-500">{emptyText}</p>
      )}
    </div>
  </div>
);

const PlayerBlock = ({
  title,
  emptyText,
  players,
  summary,
  mode,
}: {
  title: string;
  emptyText: string;
  players: PrototypePlayer[];
  summary: ReturnType<typeof summarizeSet>;
  mode: 'earnedPoints' | 'giftsConceded';
}) => {
  const topPlayers = getTopPlayers(summary, players, mode);

  return (
    <div>
      <h3 className="text-xs font-black uppercase text-slate-600">{title}</h3>
      <div className="mt-1.5 space-y-1.5">
        {topPlayers.length > 0 ? (
          topPlayers.map((item) => {
            return (
              <InsightRow
                key={item.playerId}
                label={getPlayerLabel(players, item.playerId)}
                value={item[mode]}
                tone={mode === 'earnedPoints' ? 'good' : 'warn'}
              />
            );
          })
        ) : (
          <p className="rounded bg-white p-2 text-sm font-bold text-slate-500">{emptyText}</p>
        )}
      </div>
    </div>
  );
};

const InsightRow = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'good' | 'warn' | 'neutral';
}) => {
  const toneClass =
    tone === 'good'
      ? 'bg-teal-300 text-slate-950'
      : tone === 'warn'
        ? 'bg-amber-300 text-slate-950'
        : 'bg-slate-200 text-slate-950';

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 rounded bg-white px-2 py-1.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-black">{label}</p>
      </div>
      <span className={`flex h-7 min-w-7 items-center justify-center rounded px-2 text-sm font-black ${toneClass}`}>{value}</span>
    </div>
  );
};

export default RebuildPrototype;
