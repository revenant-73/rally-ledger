import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, BarChart2, MessageSquare, MoreVertical, X, Trophy, AlertCircle, Zap, Plus, Minus, Sun, Cloud, CloudRain } from 'lucide-react';
import { useMatch } from '../hooks/useMatch';
import type { OutcomeType, Classification, RallyEvent, Set } from '../types';
import { v4 as uuidv4 } from 'uuid';

const LiveMatch: React.FC = () => {
  const navigate = useNavigate();
  const { activeMatch, activeSet, activeTeam, rallies, addRally, undoLastRally, startSet, players, endSet, updateMatch, updateSet } = useMatch();
  
  const [pointWinner, setPointWinner] = useState<'Us' | 'Opponent' | null>(null);
  const [outcome, setOutcome] = useState<OutcomeType | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [serverPlayerId, setServerPlayerId] = useState<string | null>(null);
  const [serveResult, setServeResult] = useState<'Ace' | 'Error' | 'In-System' | 'Out-of-System' | null>(null);
  const [receiveResult, setReceiveResult] = useState<'Error' | 'Overpass' | 'In-System' | 'Out-of-System' | null>(null);
  const [receivePlayerId, setReceivePlayerId] = useState<string | null>(null);
  const [showReceivePlayerSelection, setShowReceivePlayerSelection] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [showServerSelection, setShowServerSelection] = useState(false);
  const [showClassification, setShowClassification] = useState(false);
  const [servingTeam, setServingTeam] = useState<'Us' | 'Opponent'>('Us');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState(activeMatch?.notes || '');
  const [toast, setToast] = useState<string | null>(null);
  const [pendingSetNumber, setPendingSetNumber] = useState(1);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!activeMatch) {
      navigate('/');
    }
  }, [activeMatch, navigate]);

  if (!activeMatch) return null;

  // Initialize next set if none exists
  if (!activeSet) {
    const lastSetRallies = rallies.length > 0 ? rallies.filter(r => {
      // Find the highest set number in rallies
      const maxSetRally = rallies.reduce((prev, current) => {
        // We don't have setId in the rally type as a simple number, but we can compare them
        return (prev.rallyNumber > current.rallyNumber) ? prev : current;
      });
      return r.setId === maxSetRally.setId;
    }) : [];

    const lastSetMetrics = lastSetRallies.length > 0 ? {
      ourScore: lastSetRallies[lastSetRallies.length - 1].scoreAfterUs,
      oppScore: lastSetRallies[lastSetRallies.length - 1].scoreAfterOpponent,
      ourEarned: lastSetRallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned').length,
      ourGifted: lastSetRallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length,
    } : null;

    return (
      <div className="min-h-screen bg-brand-bg text-brand-text p-6 flex flex-col items-center justify-center text-center">
        {lastSetMetrics ? (
          <div className="mb-12 w-full max-w-sm">
            <h3 className="text-sm font-black text-brand-teal uppercase tracking-widest mb-4">Last Set Summary</h3>
            <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
              <div className="flex items-center justify-center gap-8 mb-6">
                <div className="flex flex-col">
                  <span className="text-4xl font-black text-brand-teal">{lastSetMetrics.ourScore}</span>
                  <span className="text-[10px] font-bold text-brand-text-secondary uppercase">Us</span>
                </div>
                <div className="h-8 w-px bg-brand-gray/20" />
                <div className="flex flex-col">
                  <span className="text-4xl font-black text-brand-red">{lastSetMetrics.oppScore}</span>
                  <span className="text-[10px] font-bold text-brand-text-secondary uppercase">Them</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xl font-black text-brand-green">+{lastSetMetrics.ourEarned}</p>
                  <p className="text-[10px] font-bold text-brand-text-secondary uppercase">Earned</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-brand-amber">-{lastSetMetrics.ourGifted}</p>
                  <p className="text-[10px] font-bold text-brand-text-secondary uppercase">Gifted</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-12">
            <Trophy size={64} className="mx-auto text-brand-teal/20 mb-4" />
          </div>
        )}

        <h2 className="text-3xl font-bold mb-2">Ready for Next Set?</h2>
        <p className="text-brand-text-secondary mb-8 text-lg">Select set number to begin</p>
        
        <div className="grid grid-cols-5 gap-3 mb-8 w-full max-w-xs">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setPendingSetNumber(n)}
              className={`aspect-square rounded-xl font-black text-xl flex items-center justify-center transition-all ${
                pendingSetNumber === n ? 'bg-brand-teal text-brand-bg scale-110 shadow-lg' : 'bg-brand-gray/10 text-brand-text-secondary'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <button
          onClick={async () => {
            const newSet: Set = {
              id: uuidv4(),
              matchId: activeMatch.id,
              setNumber: pendingSetNumber,
              ourScore: 0,
              opponentScore: 0,
              status: 'active',
              startingServerTeam: 'Us',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await startSet(newSet);
          }}
          className="bg-brand-teal text-brand-bg font-bold py-5 px-12 rounded-2xl text-xl shadow-xl active:scale-[0.98] transition-all"
        >
          Begin Set {pendingSetNumber}
        </button>
        
        <button 
          onClick={() => navigate('/')}
          className="mt-8 text-brand-text-secondary font-bold flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>
      </div>
    );
  }

  const handleServerClick = (playerId: string | 'none') => {
    setServerPlayerId(playerId === 'none' ? null : playerId);
    setShowServerSelection(false);
  };

  const handleServeQualityClick = (quality: 'Ace' | 'Error' | 'In-System' | 'Out-of-System') => {
    setServeResult(quality);
    if (quality === 'Ace') {
      setPointWinner('Us');
      setOutcome('Ace');
      if (serverPlayerId) {
        completeRally('Earned', 'Us', 'Ace', serverPlayerId);
      } else if (players.length > 0) {
        setShowPlayerSelection(true);
      } else {
        completeRally('Earned', 'Us', 'Ace');
      }
    } else if (quality === 'Error') {
      setPointWinner('Opponent');
      setOutcome('Serve Error');
      if (serverPlayerId) {
        completeRally('Gifted', 'Opponent', 'Serve Error', serverPlayerId);
      } else if (players.length > 0) {
        setShowPlayerSelection(true);
      } else {
        completeRally('Gifted', 'Opponent', 'Serve Error');
      }
    } else {
      setPointWinner(null); 
    }
  };

  const handleReceiveQualityClick = (quality: 'Error' | 'Overpass' | 'In-System' | 'Out-of-System') => {
    setReceiveResult(quality);
    if (players.length > 0) {
      setShowReceivePlayerSelection(true);
    } else if (quality === 'Error') {
      setPointWinner('Opponent');
      setOutcome('Ace');
      setShowClassification(true);
    }
  };

  const handleReceivePlayerClick = (playerId: string | 'none') => {
    const pId = playerId === 'none' ? null : playerId;
    setReceivePlayerId(pId);
    setSelectedPlayerId(pId);
    setShowReceivePlayerSelection(false);
    if (receiveResult === 'Error') {
      setPointWinner('Opponent');
      setOutcome('Ace');
      setShowClassification(true);
    }
  };

  const handlePointClick = (winner: 'Us' | 'Opponent') => {
    setPointWinner(winner);
  };

  const positiveOutcomes: OutcomeType[] = ['Ace', 'Kill', 'Block', 'Forced Error'];
  const errorOutcomes: OutcomeType[] = [
    'Serve Error', 'Attack Error', 'Ball Handling Error',
    'Net / Line Violation', 'Free Ball Error', 'Other'
  ];

  const handleOutcomeClick = (type: OutcomeType) => {
    setOutcome(type);
    const isPositive = positiveOutcomes.includes(type);
    const classification = isPositive ? 'Earned' : 'Gifted';
    
    // Logic: 
    // - If WE earn a point (Kill/Block/etc), we want to know WHO earned it.
    // - If THEY error (Gifted to us), we don't need to select one of our players.
    // - If THEY earn a point (Earned by them), we don't track their players.
    // - If WE error (Gifted to them), we want to know WHO erred (leak tracking).
    const shouldSelectPlayer = (pointWinner === 'Us' && isPositive) || (pointWinner === 'Opponent' && !isPositive);

    if (players.length > 0 && shouldSelectPlayer) {
      setShowPlayerSelection(true);
    } else {
      completeRally(classification, undefined, type, null);
    }
  };

  const handlePlayerClick = (playerId: string | 'none') => {
    const pId = playerId === 'none' ? null : playerId;
    setSelectedPlayerId(pId);
    setShowPlayerSelection(false);
    
    // Auto-classify based on outcome
    if (outcome) {
      const classification = positiveOutcomes.includes(outcome) ? 'Earned' : 'Gifted';
      completeRally(classification, undefined, undefined, pId);
    }
  };

  const completeRally = (
    classification: Classification, 
    winnerOverride?: 'Us' | 'Opponent', 
    outcomeOverride?: OutcomeType,
    playerOverride?: string | null
  ) => {
    const winner = winnerOverride || pointWinner;
    const finalOutcome = outcomeOverride || outcome;
    const finalPlayerId = playerOverride !== undefined ? playerOverride : selectedPlayerId;

    if (!winner || !finalOutcome || !activeSet) return;

    const newRally: RallyEvent = {
      id: uuidv4(),
      matchId: activeMatch.id,
      setId: activeSet.id,
      rallyNumber: rallies.length + 1,
      scoreBeforeUs: activeSet.ourScore,
      scoreBeforeOpponent: activeSet.opponentScore,
      scoreAfterUs: winner === 'Us' ? activeSet.ourScore + 1 : activeSet.ourScore,
      scoreAfterOpponent: winner === 'Opponent' ? activeSet.opponentScore + 1 : activeSet.opponentScore,
      pointWinner: winner,
      servingTeam,
      serverPlayerId: serverPlayerId || undefined,
      outcomeType: finalOutcome,
      classification,
      playerId: finalPlayerId || undefined,
      serveResult: serveResult || undefined,
      receiveResult: receiveResult || undefined,
      receivePlayerId: receivePlayerId || undefined,
      createdAt: new Date().toISOString(),
    };

    if (winner === 'Us') {
      if (servingTeam === 'Opponent') {
        setToast(`Point Us!`);
      }
      setServingTeam('Us');
    } else {
      setServingTeam('Opponent');
    }

    addRally(newRally);
    resetEntry();
  };

  const handleClassificationClick = (classification: Classification) => {
    completeRally(classification);
  };

  const handleManualScoreChange = async (team: 'Us' | 'Opponent', delta: number) => {
    if (!activeSet) return;
    const updates = team === 'Us' 
      ? { ourScore: Math.max(0, activeSet.ourScore + delta) }
      : { opponentScore: Math.max(0, activeSet.opponentScore + delta) };
    
    await updateSet(activeSet.id, updates);
    setToast(`Score adjusted for ${team}`);
  };

  const resetEntry = () => {
    setPointWinner(null);
    setOutcome(null);
    setSelectedPlayerId(null);
    setServerPlayerId(null);
    setServeResult(null);
    setReceiveResult(null);
    setReceivePlayerId(null);
    setShowReceivePlayerSelection(false);
    setShowPlayerSelection(false);
    setShowServerSelection(false);
    setShowClassification(false);
  };

  const undoWithFeedback = async () => {
    if (rallies.length === 0) return;
    const lastRally = rallies[rallies.length - 1];
    
    setServingTeam(lastRally.servingTeam);
    
    setToast(`Undid: ${lastRally.outcomeType} by ${lastRally.pointWinner === 'Us' ? 'Us' : 'Them'}`);
    await undoLastRally();
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-brand-teal text-brand-bg px-6 py-3 rounded-full font-bold shadow-2xl animate-bounce">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-brand-gray/10">
        <button onClick={() => navigate('/')} className="text-brand-text-secondary">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-medium text-brand-text-secondary uppercase tracking-wider">Set {activeSet.setNumber}</h2>
          <p className="font-bold">vs {activeMatch.opponentName}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowTimeout(true)} 
            className="text-brand-text-secondary active:text-brand-teal p-1 flex flex-col items-center"
          >
            <RotateCcw size={20} className="rotate-90" />
            <span className="text-[8px] font-black uppercase mt-0.5">Timeout</span>
          </button>
          <button onClick={() => navigate('/match/dashboard')} className="text-brand-text-secondary active:text-brand-teal p-1 flex flex-col items-center">
            <BarChart2 size={24} />
            <span className="text-[8px] font-black uppercase mt-0.5">Stats</span>
          </button>
          <button onClick={() => setShowMoreMenu(true)} className="text-brand-text-secondary active:text-brand-teal p-1 flex flex-col items-center">
            <MoreVertical size={24} />
            <span className="text-[8px] font-black uppercase mt-0.5">More</span>
          </button>
        </div>
      </header>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[130] bg-brand-bg/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="flex-1 flex flex-col max-w-sm mx-auto w-full pt-12">
            <header className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-brand-teal">MATCH NOTE</h2>
              <button onClick={() => setShowNoteModal(false)} className="text-brand-text-secondary"><X size={28} /></button>
            </header>
            
            <p className="text-brand-text-secondary text-sm mb-4">Add a coaching note, commitment, or observation for this match.</p>
            
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note here..."
              className="flex-1 bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6 text-xl font-medium focus:border-brand-teal/50 outline-none resize-none"
              autoFocus
            />
            
            <button 
              onClick={async () => {
                if (activeMatch) {
                  await updateMatch(activeMatch.id, { notes: noteText });
                  setShowNoteModal(false);
                  setToast('Note saved!');
                }
              }}
              className="mt-8 bg-brand-teal text-brand-bg font-black py-6 rounded-2xl text-xl shadow-2xl active:scale-[0.98] transition-all"
            >
              SAVE NOTE
            </button>
          </div>
        </div>
      )}

      {/* Timeout Modal */}
      {showTimeout && (
        <div className="fixed inset-0 z-[120] bg-brand-bg/95 backdrop-blur-md p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
          <div className="w-full max-w-sm space-y-8">
            <header className="text-center">
              <h2 className="text-4xl font-black text-brand-teal mb-2">TIMEOUT</h2>
              <p className="text-brand-text-secondary uppercase tracking-widest font-bold">Match Weather Update</p>
            </header>

            <div className="bg-brand-gray/5 border border-brand-teal/20 rounded-3xl p-8 space-y-8">
              <div className="flex items-center justify-center gap-12">
                <div className="text-center">
                  <p className="text-5xl font-black text-brand-teal">{activeSet.ourScore}</p>
                  <p className="text-xs font-bold text-brand-text-secondary uppercase mt-2">Us</p>
                </div>
                <div className="text-center">
                  <p className="text-5xl font-black text-brand-red">{activeSet.opponentScore}</p>
                  <p className="text-xs font-bold text-brand-text-secondary uppercase mt-2">Them</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-brand-bg rounded-2xl border border-brand-gray/10">
                  <div className="flex items-center gap-3">
                    <Zap size={20} className="text-brand-green" />
                    <span className="text-sm font-bold">Earned Balance</span>
                  </div>
                  <span className="font-black text-brand-green">
                    +{rallies.filter(r => r.pointWinner === 'Us' && r.classification === 'Earned').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-brand-bg rounded-2xl border border-brand-gray/10">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-brand-amber" />
                    <span className="text-sm font-bold">Gifted Balance</span>
                  </div>
                  <span className="font-black text-brand-amber">
                    -{rallies.filter(r => r.pointWinner === 'Opponent' && r.classification === 'Gifted').length}
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowTimeout(false)}
              className="w-full bg-brand-teal text-brand-bg font-black py-6 rounded-2xl text-xl shadow-2xl active:scale-[0.98] transition-all"
            >
              RESUME TRACKING
            </button>
          </div>
        </div>
      )}

      {/* More Menu Modal */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[110] bg-brand-bg/90 backdrop-blur-sm p-6 flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-brand-gray/5 border border-brand-gray/20 rounded-3xl p-6 space-y-4 max-w-sm mx-auto w-full mb-20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold">Match Actions</h3>
              <button onClick={() => setShowMoreMenu(false)} className="text-brand-text-secondary"><X size={24} /></button>
            </div>
            
            <button 
              onClick={() => {
                const winner = activeSet.ourScore > activeSet.opponentScore ? 'Win' : 'Loss';
                if (window.confirm(`End Set ${activeSet.setNumber} as a ${winner}?`)) {
                  endSet(winner);
                  setShowMoreMenu(false);
                  setToast(`Set ${activeSet.setNumber} completed!`);
                }
              }}
              className="w-full flex items-center justify-between p-4 bg-brand-teal/10 text-brand-teal rounded-2xl font-bold"
            >
              <div className="flex items-center gap-3">
                <Trophy size={20} />
                <span>End Set {activeSet.setNumber}</span>
              </div>
              <span className="text-xs uppercase opacity-60">{activeSet.ourScore} - {activeSet.opponentScore}</span>
            </button>

            <button 
              onClick={() => {
                if (window.confirm("Abandon match? Current set data will be lost.")) {
                  navigate('/');
                }
              }}
              className="w-full flex items-center gap-3 p-4 bg-brand-red/10 text-brand-red rounded-2xl font-bold"
            >
              <AlertCircle size={20} />
              <span>Abandon Match</span>
            </button>
          </div>
        </div>
      )}

      {/* Score Display */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Us Score */}
          <div className="flex flex-col gap-2">
            <div className="bg-brand-gray/5 rounded-2xl flex flex-col items-center justify-center border border-brand-teal/20 h-28 relative">
              <span className="text-xs text-brand-text-secondary font-bold uppercase">Us</span>
              <span className="text-5xl font-black text-brand-teal">{activeSet.ourScore}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleManualScoreChange('Us', -1)}
                className="flex-1 bg-brand-gray/10 h-14 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-red/20 active:text-brand-red transition-all"
              >
                <Minus size={24} />
              </button>
              <button 
                onClick={() => handleManualScoreChange('Us', 1)}
                className="flex-1 bg-brand-gray/10 h-14 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-teal/20 active:text-brand-teal transition-all"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>

          {/* Them Score */}
          <div className="flex flex-col gap-2">
            <div className="bg-brand-gray/5 rounded-2xl flex flex-col items-center justify-center border border-brand-red/20 h-28 relative">
              <span className="text-xs text-brand-text-secondary font-bold uppercase">Them</span>
              <span className="text-5xl font-black text-brand-red">{activeSet.opponentScore}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleManualScoreChange('Opponent', -1)}
                className="flex-1 bg-brand-gray/10 h-14 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-red/20 active:text-brand-red transition-all"
              >
                <Minus size={24} />
              </button>
              <button 
                onClick={() => handleManualScoreChange('Opponent', 1)}
                className="flex-1 bg-brand-gray/10 h-14 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-teal/20 active:text-brand-teal transition-all"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Server Status */}
        <div className="flex gap-2 pt-2">
          <button 
            onClick={() => setServingTeam(servingTeam === 'Us' ? 'Opponent' : 'Us')}
            className={`flex-1 border rounded-2xl p-5 flex flex-col items-center justify-center active:scale-[0.98] transition-all ${
              servingTeam === 'Us' ? 'bg-brand-teal/20 border-brand-teal text-brand-teal' : 'bg-brand-red/20 border-brand-red text-brand-red'
            }`}
          >
            <span className="text-[10px] font-bold uppercase opacity-60">Currently Serving</span>
            <span className="text-2xl font-black uppercase tracking-tight">
              {servingTeam === 'Us' ? (activeTeam?.name || 'WE ARE') : activeMatch.opponentName}
            </span>
          </button>
        </div>

        {/* Input Area */}
        <div className="flex-1 bg-brand-gray/5 rounded-3xl p-4 flex flex-col">
          {servingTeam === 'Us' && !serverPlayerId ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold uppercase tracking-tight">Who is serving?</h3>
                <button onClick={() => setServerPlayerId('none')} className="text-brand-teal text-sm font-bold uppercase">Skip</button>
              </div>
              <div className="flex-1 grid grid-cols-4 gap-1.5 overflow-y-auto pb-4 content-start">
                {players.sort((a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber)).map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleServerClick(player.id)}
                    className="bg-brand-gray/10 border border-brand-gray/20 py-2 rounded-xl flex flex-col items-center justify-center active:scale-[0.95] transition-all"
                  >
                    <span className="text-base font-black text-brand-teal leading-none">{player.jerseyNumber}</span>
                    <span className="text-[8px] font-bold uppercase mt-0.5 truncate w-full px-1 text-center">{player.firstName}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (!serveResult && !receiveResult) ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">
                  {servingTeam === 'Us' ? 'How was the serve?' : 'How was the receive?'}
                </h3>
                <button onClick={resetEntry} className="text-brand-text-secondary text-sm">Reset</button>
              </div>
              <div className="flex-1 grid grid-cols-1 gap-3">
                {servingTeam === 'Us' ? (
                  <>
                    <button onClick={() => handleServeQualityClick('Ace')} className="bg-brand-green/20 border border-brand-green/50 py-4 rounded-xl font-black text-brand-green text-xl shadow-sm active:scale-95 transition-all">ACE</button>
                    <button onClick={() => handleServeQualityClick('In-System')} className="bg-brand-teal/10 border border-brand-teal/30 py-4 rounded-xl font-bold text-xl active:scale-95 transition-all">InSys</button>
                    <button onClick={() => handleServeQualityClick('Out-of-System')} className="bg-brand-amber/10 border border-brand-amber/30 py-4 rounded-xl font-bold text-xl active:scale-95 transition-all">KO</button>
                    <button onClick={() => handleServeQualityClick('Error')} className="bg-brand-red/20 border border-brand-red/50 py-4 rounded-xl font-black text-brand-red text-xl shadow-sm active:scale-95 transition-all">ERR</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleReceiveQualityClick('In-System')} className="bg-brand-teal/10 border border-brand-teal/30 py-4 rounded-xl font-bold text-xl active:scale-95 transition-all">InSys</button>
                    <button onClick={() => handleReceiveQualityClick('Out-of-System')} className="bg-brand-amber/10 border border-brand-amber/30 py-4 rounded-xl font-bold text-xl active:scale-95 transition-all">KO</button>
                    <button onClick={() => handleReceiveQualityClick('Overpass')} className="bg-brand-orange/10 border border-brand-orange/30 py-4 rounded-xl font-bold text-xl active:scale-95 transition-all">OVER</button>
                    <button onClick={() => handleReceiveQualityClick('Error')} className="bg-brand-red/20 border border-brand-red/50 py-4 rounded-xl font-black text-brand-red text-xl shadow-sm active:scale-95 transition-all">ACE</button>
                    <button 
                      onClick={() => completeRally('Gifted', 'Us', 'Serve Error', null)} 
                      className="mt-2 bg-brand-gray/10 border border-brand-gray/30 py-4 rounded-xl font-black text-brand-text-secondary text-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <X size={20} />
                      OPP SERVE ERR
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : showReceivePlayerSelection ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Who received?</h3>
                <div className="flex gap-4">
                  <button onClick={() => handleReceivePlayerClick('none')} className="text-brand-teal text-sm font-bold">Skip</button>
                  <button onClick={() => { setShowReceivePlayerSelection(false); setReceiveResult(null); }} className="text-brand-text-secondary text-sm">Back</button>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-4 gap-1.5 overflow-y-auto pb-4 content-start">
                {players.sort((a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber)).map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleReceivePlayerClick(player.id)}
                    className="bg-brand-gray/10 border border-brand-gray/20 py-2 rounded-xl flex flex-col items-center justify-center active:scale-[0.95] transition-all"
                  >
                    <span className="text-base font-black text-brand-teal leading-none">{player.jerseyNumber}</span>
                    <span className="text-[8px] font-bold uppercase mt-0.5 truncate w-full px-1 text-center">{player.firstName}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : !pointWinner ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Who won the point?</h3>
                <button onClick={() => {
                  if (servingTeam === 'Us') setServeResult(null);
                  else setShowReceivePlayerSelection(true);
                }} className="text-brand-text-secondary text-sm">Back</button>
              </div>
              <div className="flex-1 grid grid-cols-1 gap-4">
                <button
                  onClick={() => handlePointClick('Us')}
                  className="bg-brand-teal text-brand-bg text-3xl font-black rounded-3xl active:scale-[0.96] transition-all flex flex-col items-center justify-center gap-2 py-8 shadow-xl active:shadow-inner"
                >
                  <Trophy size={32} />
                  WE WON
                </button>
                <button
                  onClick={() => handlePointClick('Opponent')}
                  className="bg-brand-red text-brand-bg text-3xl font-black rounded-3xl active:scale-[0.96] transition-all flex flex-col items-center justify-center gap-2 py-8 shadow-xl active:shadow-inner"
                >
                  <X size={32} />
                  THEY WON
                </button>
              </div>
            </div>
          ) : showPlayerSelection ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Who was involved?</h3>
                <div className="flex gap-4">
                  <button onClick={() => handlePlayerClick('none')} className="text-brand-teal text-sm font-bold">Skip</button>
                  <button onClick={() => { setShowPlayerSelection(false); setOutcome(null); }} className="text-brand-text-secondary text-sm">Back</button>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-4 gap-1.5 overflow-y-auto pb-4 content-start">
                {players.sort((a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber)).map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerClick(player.id)}
                    className="bg-brand-gray/10 border border-brand-gray/20 py-2 rounded-xl flex flex-col items-center justify-center active:scale-[0.95] transition-all"
                  >
                    <span className="text-base font-black text-brand-teal leading-none">{player.jerseyNumber}</span>
                    <span className="text-[8px] font-bold uppercase mt-0.5 truncate w-full px-1 text-center">{player.firstName}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : showClassification ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Classification</h3>
                <button onClick={() => { setShowClassification(false); if(players.length > 0) setShowPlayerSelection(true); else setOutcome(null); }} className="text-brand-text-secondary text-sm">Back</button>
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => handleClassificationClick('Earned')}
                  className="w-full bg-brand-green/20 border-2 border-brand-green text-brand-green py-8 rounded-3xl text-3xl font-black active:scale-[0.96] transition-all flex items-center justify-center gap-4 shadow-lg active:shadow-inner"
                >
                  <Sun size={32} />
                  EARNED
                </button>
                <button
                  onClick={() => handleClassificationClick('Gifted')}
                  className="w-full bg-brand-amber/20 border-2 border-brand-amber text-brand-amber py-8 rounded-3xl text-3xl font-black active:scale-[0.96] transition-all flex items-center justify-center gap-4 shadow-lg active:shadow-inner"
                >
                  <CloudRain size={32} />
                  GIFTED
                </button>
                <button
                  onClick={() => handleClassificationClick('Neutral')}
                  className="w-full bg-brand-gray/20 border-2 border-brand-gray text-brand-gray py-8 rounded-3xl text-3xl font-black active:scale-[0.96] transition-all flex items-center justify-center gap-4 shadow-lg active:shadow-inner"
                >
                  <Cloud size={32} />
                  NEUTRAL
                </button>
              </div>
              <div className="mt-8 p-4 bg-brand-gray/10 rounded-xl text-center">
                <p className="text-sm text-brand-text-secondary">Point won by <span className="text-brand-text font-bold uppercase">{pointWinner}</span> via <span className="text-brand-text font-bold uppercase">{outcome}</span></p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">How did it end?</h3>
                <button onClick={() => setPointWinner(null)} className="text-brand-text-secondary text-sm">Back</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6">
                <div>
                  <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest mb-3 px-1">Earned Points</p>
                  <div className="grid grid-cols-2 gap-2">
                    {positiveOutcomes.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleOutcomeClick(type)}
                        className="bg-brand-teal/10 border border-brand-teal/20 py-4 rounded-xl font-black text-brand-teal active:scale-[0.95] transition-all"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-brand-red uppercase tracking-widest mb-3 px-1">Errors</p>
                  <div className="grid grid-cols-2 gap-2">
                    {errorOutcomes.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleOutcomeClick(type)}
                        className="bg-brand-red/10 border border-brand-red/20 py-4 rounded-xl font-black text-brand-red active:scale-[0.95] transition-all"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="grid grid-cols-2 gap-2 py-2">
          <button
            onClick={undoWithFeedback}
            className="flex flex-col items-center gap-1 p-3 bg-brand-gray/5 rounded-xl text-brand-text-secondary active:text-brand-teal"
          >
            <RotateCcw size={20} />
            <span className="text-[10px] font-bold uppercase">Undo</span>
          </button>
          <button
            onClick={() => setShowNoteModal(true)}
            className="flex flex-col items-center gap-1 p-3 bg-brand-gray/5 rounded-xl text-brand-text-secondary active:text-brand-teal"
          >
            <MessageSquare size={20} />
            <span className="text-[10px] font-bold uppercase">Note</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveMatch;
