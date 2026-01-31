import React, { useState, useMemo } from 'react';
import { Player, AttendanceRecord, AppSettings, MatchResult, Position, CurrentMatchState } from '../types';
import { generateSmartTeams } from '../services/geminiService';
import { StorageService } from '../services/storage';
import { ConfirmationModal } from './ConfirmationModal';
import { Save, Sparkles, Minus, Plus, ArrowRightLeft, History as HistoryIcon, Clock, LogOut, ArrowRightFromLine, ShieldCheck, Timer } from 'lucide-react';

interface Props {
  allPlayers: Player[];
  attendance: AttendanceRecord[];
  settings: AppSettings;
  history: MatchResult[];
  currentMatch: CurrentMatchState | null;
  onUpdateMatch: (match: CurrentMatchState) => void;
  onFinishMatch: (teamA: Player[], teamB: Player[], scoreA: number, scoreB: number, subbedOut?: string[]) => void;
}

export const MatchManager: React.FC<Props> = ({ 
    allPlayers, 
    attendance, 
    settings, 
    history, 
    currentMatch, 
    onUpdateMatch, 
    onFinishMatch 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  
  // Modal State
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isHalftimeModalOpen, setIsHalftimeModalOpen] = useState(false);

  // Substitution State
  const [selectedFieldPlayer, setSelectedFieldPlayer] = useState<Player | null>(null);
  const [selectedReservePlayer, setSelectedReservePlayer] = useState<Player | null>(null);

  // Helper to ensure persistence immediately upon change
  const persistAndUpdateMatch = (newState: CurrentMatchState) => {
    StorageService.saveCurrentMatch(newState);
    onUpdateMatch(newState);
  };

  // Get only checked-in players ordered by arrival
  const presentPlayers = useMemo(() => {
    const presentIds = new Set(attendance.map(a => a.playerId));
    const attendanceMap = new Map(attendance.map(a => [a.playerId, a.arrivalTime]));
    
    return allPlayers
      .filter(p => presentIds.has(p.id))
      .sort((a, b) => (attendanceMap.get(a.id) || 0) - (attendanceMap.get(b.id) || 0));
  }, [allPlayers, attendance]);
  
  // Logic to determine starters based on arrival time within a specific team
  const determineStarters = (teamList: Player[], limit: number) => {
    const attendanceMap = new Map(attendance.map(a => [a.playerId, a.arrivalTime]));
    // Sort team members by arrival time
    const sortedByArrival = [...teamList].sort((a, b) => (attendanceMap.get(a.id) || 0) - (attendanceMap.get(b.id) || 0));
    // Take the first N
    return sortedByArrival.slice(0, limit).map(p => p.id);
  };

  // Derived state from currentMatch if it exists
  const isPlaying = !!currentMatch;
  const teamA = currentMatch?.teamA || [];
  const teamB = currentMatch?.teamB || [];
  const scoreA = currentMatch?.scoreA || 0;
  const scoreB = currentMatch?.scoreB || 0;

  // Split teams into Starters and Reserves for display/logic
  const teamAStarters = useMemo(() => teamA.filter(p => currentMatch?.starters.includes(p.id)), [teamA, currentMatch]);
  const teamAReserves = useMemo(() => teamA.filter(p => !currentMatch?.starters.includes(p.id)), [teamA, currentMatch]);
  
  const teamBStarters = useMemo(() => teamB.filter(p => currentMatch?.starters.includes(p.id)), [teamB, currentMatch]);
  const teamBReserves = useMemo(() => teamB.filter(p => !currentMatch?.starters.includes(p.id)), [teamB, currentMatch]);

  const currentFieldPlayers = [...teamAStarters, ...teamBStarters];

  // --- HISTORY AWARENESS LOGIC ---
  const sortedHistory = useMemo(() => [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [history]);

  const calculateRepetitionScore = (candidate: Player, currentTeamMembers: Player[]) => {
    if (history.length === 0 || currentTeamMembers.length === 0) return 0;

    const recentHistory = sortedHistory.slice(0, 15);
    let score = 0;
    const teamIds = new Set(currentTeamMembers.map(p => p.id));

    for (const match of recentHistory) {
        const inA = match.teamA.some(p => p.id === candidate.id);
        const inB = match.teamB.some(p => p.id === candidate.id);

        if (!inA && !inB) continue; 

        if (inA) {
            match.teamA.forEach(p => {
                if (teamIds.has(p.id)) score++;
            });
        }
        if (inB) {
            match.teamB.forEach(p => {
                if (teamIds.has(p.id)) score++;
            });
        }
    }
    return score;
  };

  // --- SUBSTITUTION PRIORITY LOGIC ---
  const substitutionSuggestions = useMemo(() => {
    if (!isPlaying) return new Map<string, { score: number, reason: string }>();

    const lastMatch = sortedHistory[0];
    const totalMatches = history.length;
    
    // Calculate score for each starter currently on the field
    const suggestions = currentFieldPlayers
        .map(player => {
            let score = 0;
            const reasons: string[] = [];

            // REGRA 0: Goleiros são INTOCÁVEIS
            if (player.positions.includes('Goleiro')) {
                return { 
                    id: player.id, 
                    score: -1000000, 
                    reason: 'Goleiro (Não substitui)' 
                };
            }

            // 1. Prioridade Alta: Diarista
            if (player.type === 'Diarista') {
                score += 10000;
                reasons.push('Diarista');
            }

            // 2. Análise da Partida Anterior (Proteção de quem SAIU)
            if (lastMatch) {
                const wasSubbedOutLastGame = lastMatch.subbedOut && lastMatch.subbedOut.includes(player.id);
                
                if (wasSubbedOutLastGame) {
                     // NOVA REGRA: A proteção só vale para MENSALISTAS
                     if (player.type === 'Mensalista') {
                         score -= 20000; // Pontuação negativa massiva para ficar
                         reasons.push('Saiu último jogo (Protegido)');
                     } else {
                         // Se for Diarista, não ganha proteção.
                     }
                } else {
                    const wasPresentInLastMatch = lastMatch.teamA.some(p => p.id === player.id) || 
                                                  lastMatch.teamB.some(p => p.id === player.id);
                    
                    if (wasPresentInLastMatch) {
                         score += 2000;
                         reasons.push('Jogou anterior completo');
                    }
                }
            }

            // 3. Prioridade Baixa: Baixa Assiduidade (Apenas Mensalistas)
            if (player.type === 'Mensalista' && totalMatches > 2) {
                const rate = player.stats.matches / totalMatches;
                if (rate < 0.5) { // Menos de 50% de presença
                    score += 1000;
                    reasons.push('Baixa assiduidade');
                }
            }

            // 4. Critério de Desempate: Aleatório (0-100)
            score += Math.random() * 100;

            return { 
                id: player.id, 
                score, 
                reason: reasons.join(' + ') || 'Rodízio' 
            };
        });

    suggestions.sort((a, b) => b.score - a.score);

    const result = new Map<string, { score: number, reason: string }>();
    suggestions.forEach(s => result.set(s.id, s));

    return result;
  }, [isPlaying, currentFieldPlayers, sortedHistory, history.length]);

  // Create Team-Specific Priority Queues for visual indication
  const teamASubQueue = useMemo(() => {
      return teamAStarters
          .map(p => substitutionSuggestions.get(p.id))
          .filter((s): s is { id: string, score: number, reason: string } => !!s)
          .sort((a, b) => b.score - a.score);
  }, [teamAStarters, substitutionSuggestions]);

  const teamBSubQueue = useMemo(() => {
      return teamBStarters
          .map(p => substitutionSuggestions.get(p.id))
          .filter((s): s is { id: string, score: number, reason: string } => !!s)
          .sort((a, b) => b.score - a.score);
  }, [teamBStarters, substitutionSuggestions]);


  // Tactical Shuffle Logic - Distributes ALL players
  const shuffleTeams = () => {
    if (presentPlayers.length < 2) return;

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
    
    // Create copy of pool (ALL players)
    let pool = shuffle([...presentPlayers]);
    
    const tA: Player[] = [];
    const tB: Player[] = [];
    
    // Helper to assign player
    const assign = (p: Player, team: Player[]) => {
        team.push(p);
        pool = pool.filter(poolPlayer => poolPlayer.id !== p.id);
    };

    const getBestFitTeam = (p: Player, countA: number, countB: number): 'A' | 'B' => {
        // Balance counts first
        if (countA < countB) return 'A';
        if (countB < countA) return 'B';

        // Balance history
        const scoreA = calculateRepetitionScore(p, tA);
        const scoreB = calculateRepetitionScore(p, tB);

        if (scoreA < scoreB) return 'A';
        if (scoreB < scoreA) return 'B';
        
        return Math.random() > 0.5 ? 'A' : 'B';
    };

    // 1. Goalkeepers 
    const gks = pool.filter(p => p.positions.includes('Goleiro'));
    for (const gk of gks) {
        const hasA = tA.filter(p => p.positions.includes('Goleiro')).length;
        const hasB = tB.filter(p => p.positions.includes('Goleiro')).length;
        
        // Priority to teams without GK
        if (hasA === 0 && hasB > 0) assign(gk, tA);
        else if (hasB === 0 && hasA > 0) assign(gk, tB);
        else {
             const dest = getBestFitTeam(gk, tA.length, tB.length);
             assign(gk, dest === 'A' ? tA : tB);
        }
    }

    // 2. Parse quotas for distribution
    const schema = settings.tacticalSchema || "2-2-3-1";
    const [defCount, latCount, midCount, attCount] = schema.split('-').map(Number);
    const quotas: { pos: Position }[] = [
        { pos: 'Defensor' }, { pos: 'Lateral' }, { pos: 'Meio' }, { pos: 'Atacante' }
    ];

    for (const { pos } of quotas) {
        const candidates = pool.filter(p => p.positions.includes(pos));
        const shuffledCandidates = shuffle(candidates);

        for (const p of shuffledCandidates) {
             const dest = getBestFitTeam(p, tA.length, tB.length);
             assign(p, dest === 'A' ? tA : tB);
        }
    }

    // 3. Fill remaining players
    while (pool.length > 0) {
        const p = pool.pop();
        if (p) {
             const dest = getBestFitTeam(p, tA.length, tB.length);
             assign(p, dest === 'A' ? tA : tB);
        }
    }

    // 4. Determine Starters based on Arrival Time
    const limit = settings.playersPerTeam;
    const startersAIds = determineStarters(tA, limit);
    const startersBIds = determineStarters(tB, limit);
    const allStarters = [...startersAIds, ...startersBIds];

    // Initialize Match
    const reasoningText = `Elenco total distribuído. Titulares definidos por ordem de chegada.`;
    
    persistAndUpdateMatch({
        teamA: tA,
        teamB: tB,
        scoreA: 0,
        scoreB: 0,
        starters: allStarters,
        subbedOut: [],
        startTime: new Date().toISOString(),
        reasoning: reasoningText
    });
    
    setAiReasoning(reasoningText);
    setSelectedFieldPlayer(null);
    setSelectedReservePlayer(null);
  };

  const handleAiSort = async () => {
    if (presentPlayers.length < 2) return;
    setIsGenerating(true);
    setAiReasoning(null);

    try {
      // Pass all players to AI
      const result = await generateSmartTeams(
          presentPlayers, 
          settings.playersPerTeam, 
          history, 
          settings.tacticalSchema
      );
      
      const mapNamesToPlayers = (names: string[]) => {
        return names.map(name => presentPlayers.find(p => p.name === name)).filter(Boolean) as Player[];
      };
      
      const tA = mapNamesToPlayers(result.teamA);
      const tB = mapNamesToPlayers(result.teamB);

      // Determine Starters based on Arrival Time locally (enforce rule)
      const limit = settings.playersPerTeam;
      const startersAIds = determineStarters(tA, limit);
      const startersBIds = determineStarters(tB, limit);
      const allStarters = [...startersAIds, ...startersBIds];

      persistAndUpdateMatch({
        teamA: tA,
        teamB: tB,
        scoreA: 0,
        scoreB: 0,
        starters: allStarters,
        subbedOut: [],
        startTime: new Date().toISOString(),
        reasoning: result.reasoning
      });

      setAiReasoning(result.reasoning);
      setSelectedFieldPlayer(null);
      setSelectedReservePlayer(null);

    } catch (error) {
      console.error(error);
      alert("Erro ao usar IA. Verifique sua chave de API ou tente novamente. Usando sorteio padrão.");
      shuffleTeams();
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger Modal Open
  const handleFinishClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFinishModalOpen(true);
  };

  // Actual Execution
  const confirmFinishMatch = () => {
    setIsFinishing(true);
    // Timeout to ensure UI shows loading state before potentially unmounting
    setTimeout(() => {
        onFinishMatch(teamA, teamB, scoreA, scoreB, currentMatch?.subbedOut);
    }, 200);
  };

  // HALFTIME SUBSTITUTION LOGIC
  const performHalftimeSubs = () => {
      if (!currentMatch) return;

      const newStarters = new Set(currentMatch.starters);
      const newSubbedOut = new Set(currentMatch.subbedOut || []);

      // Team A
      const reservesA = teamAReserves; // Candidates to ENTER
      const queueA = teamASubQueue; // Candidates to LEAVE
      const numToSwapA = Math.min(reservesA.length, queueA.length);
      
      for(let i=0; i<numToSwapA; i++) {
          const leaving = queueA[i].id;
          const entering = reservesA[i].id;
          
          newStarters.delete(leaving);
          newStarters.add(entering);
          newSubbedOut.add(leaving);
      }

      // Team B
      const reservesB = teamBReserves; // Candidates to ENTER
      const queueB = teamBSubQueue; // Candidates to LEAVE
      const numToSwapB = Math.min(reservesB.length, queueB.length);

      for(let i=0; i<numToSwapB; i++) {
          const leaving = queueB[i].id;
          const entering = reservesB[i].id;

          newStarters.delete(leaving);
          newStarters.add(entering);
          newSubbedOut.add(leaving);
      }

      persistAndUpdateMatch({
          ...currentMatch,
          starters: Array.from(newStarters),
          subbedOut: Array.from(newSubbedOut),
          reasoning: `Intervalo realizado. ${numToSwapA} trocas no Time A e ${numToSwapB} no Time B baseadas na prioridade.`
      });
  };

  const handleSwapPlayers = () => {
    if (!selectedFieldPlayer || !selectedReservePlayer || !currentMatch) return;

    let newTeamA = [...teamA];
    let newTeamB = [...teamB];
    let newStarters = [...currentMatch.starters];
    let newSubbedOut = [...(currentMatch.subbedOut || [])];

    // Find where they are
    const p1InA = teamA.some(p => p.id === selectedFieldPlayer.id);
    const p2InA = teamA.some(p => p.id === selectedReservePlayer.id);
    const p2InB = teamB.some(p => p.id === selectedReservePlayer.id);

    // Scenario 1: Intra-team substitution (Starter out, Bench in)
    if ((p1InA && p2InA) || (!p1InA && p2InB)) {
        // Just swap starter status
        newStarters = newStarters.filter(id => id !== selectedFieldPlayer.id);
        newStarters.push(selectedReservePlayer.id);
        newSubbedOut.push(selectedFieldPlayer.id);
    }
    // Scenario 2: Cross-team transfer (manual)
    else {
        // Swap players between arrays
        if (p1InA) { 
            newTeamA = newTeamA.filter(p => p.id !== selectedFieldPlayer.id).concat(selectedReservePlayer);
            newTeamB = newTeamB.filter(p => p.id !== selectedReservePlayer.id).concat(selectedFieldPlayer);
        } else {
            newTeamB = newTeamB.filter(p => p.id !== selectedFieldPlayer.id).concat(selectedReservePlayer);
            newTeamA = newTeamA.filter(p => p.id !== selectedReservePlayer.id).concat(selectedFieldPlayer);
        }
        // Swap starter status
        newStarters = newStarters.filter(id => id !== selectedFieldPlayer.id);
        newStarters.push(selectedReservePlayer.id);
        newSubbedOut.push(selectedFieldPlayer.id);
    }

    persistAndUpdateMatch({
        ...currentMatch,
        teamA: newTeamA,
        teamB: newTeamB,
        starters: newStarters,
        subbedOut: newSubbedOut
    });

    // Reset selection
    setSelectedFieldPlayer(null);
    setSelectedReservePlayer(null);
  };

  const updateScore = (team: 'A' | 'B', delta: number) => {
    if(!currentMatch) return;
    const newScore = Math.max(0, (team === 'A' ? scoreA : scoreB) + delta);
    persistAndUpdateMatch({
        ...currentMatch,
        scoreA: team === 'A' ? newScore : scoreA,
        scoreB: team === 'B' ? newScore : scoreB
    });
  };

  // Helper to check selection style
  const getPlayerStyle = (player: Player, isField: boolean) => {
    const isSelected = isField 
        ? selectedFieldPlayer?.id === player.id 
        : selectedReservePlayer?.id === player.id;
    
    if (isSelected) {
        return "bg-pitch-100 border-pitch-500 text-pitch-900 ring-2 ring-pitch-500 dark:bg-pitch-900 dark:text-white dark:border-pitch-400 z-10 scale-[1.02] shadow-md";
    }
    return "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-pitch-300 active:scale-[0.98]";
  };

  // Helper to render player item
  const renderPlayerItem = (player: Player, teamId: 'A' | 'B') => {
      const isStarter = currentMatch?.starters.includes(player.id);
      
      // Calculate Swap Priority
      let subData = null;
      let shouldLeave = false;
      let subRank = 0;

      if (isStarter) {
          subData = substitutionSuggestions.get(player.id);
          const queue = teamId === 'A' ? teamASubQueue : teamBSubQueue;
          const reservesCount = teamId === 'A' ? teamAReserves.length : teamBReserves.length;
          
          const indexInQueue = queue.findIndex(s => s.id === player.id);
          
          if (indexInQueue !== -1 && indexInQueue < reservesCount && subData && subData.score > -5000) {
             shouldLeave = true;
             subRank = indexInQueue + 1;
          }
      }
      
      return (
        <li 
            key={player.id} 
            onClick={() => {
                if (isStarter) setSelectedFieldPlayer(selectedFieldPlayer?.id === player.id ? null : player);
                else setSelectedReservePlayer(selectedReservePlayer?.id === player.id ? null : player);
            }}
            className={`relative flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all mb-2 touch-manipulation ${getPlayerStyle(player, isStarter || false)} ${shouldLeave ? 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10' : ''}`}
        >
            <div className="flex items-center gap-2 overflow-hidden w-full">
                <div className="flex flex-col truncate w-full">
                    <div className="flex justify-between items-center w-full">
                         <div className="flex items-center gap-1 truncate">
                             <span className="font-medium text-base truncate">{player.name}</span>
                             {player.positions.includes('Goleiro') && (
                                <ShieldCheck size={14} className="text-yellow-500" title="Goleiro" />
                             )}
                             {/* Protected Icon */}
                             {subData && subData.reason.includes('Saiu último jogo') && (
                                 <ShieldCheck size={14} className="text-blue-500" title="Protegido (Saiu Último Jogo)" />
                             )}
                         </div>
                         
                         {/* Visual Badge for Suggested Substitution */}
                         {shouldLeave && subData && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded text-[10px] font-bold border border-red-200 dark:border-red-800 ml-2 animate-pulse shrink-0">
                                <ArrowRightFromLine size={12} />
                                <span>{subRank}º sair</span>
                            </div>
                         )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1 text-[10px]">
                            {player.positions.map(p => (
                                <span key={p} className="bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-300">
                                    {p.slice(0, 3)}
                                </span>
                            ))}
                        </div>
                        
                        {/* Show Reason - Enhanced Logic */}
                        {isStarter && subData && (shouldLeave || subData.reason.includes('Protegido')) && (
                             <span className={`text-[9px] italic text-right truncate max-w-[100px] ${
                                 subData.score < 0 
                                    ? 'text-blue-600 dark:text-blue-400 font-medium' 
                                    : 'text-red-500/80 dark:text-red-400/80'
                             }`}>
                                {subData.reason}
                             </span>
                        )}
                    </div>
                </div>
            </div>
             
             {!isStarter && (
                 <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded whitespace-nowrap">Reserva</span>
             )}
        </li>
      );
  };

  if (!isPlaying) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Preparar Partida</h2>
          
          <div className="mb-6">
             <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg inline-block min-w-[200px]">
                <p className="text-gray-500 dark:text-gray-400 text-sm uppercase">Jogadores Presentes</p>
                <p className="text-3xl font-bold text-pitch-600 dark:text-pitch-400">{presentPlayers.length}</p>
             </div>
          </div>

          <div className="flex flex-col gap-4 justify-center">
            <button
              onClick={shuffleTeams}
              disabled={attendance.length < 2}
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 touch-manipulation"
            >
              <HistoryIcon size={20} className="text-yellow-400" />
              Sorteio (Ordem Chegada)
            </button>
            
            <button
              onClick={handleAiSort}
              disabled={attendance.length < 2 || isGenerating}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg disabled:opacity-50 touch-manipulation"
            >
              {isGenerating ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              ) : (
                <Sparkles size={20} />
              )}
              Sorteio Inteligente (IA)
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-400">
             O sistema distribuirá TODOS os jogadores nos times. Quem chegou primeiro começa jogando.
          </p>
        </div>
      </div>
    );
  }

  // Reason display fallback
  const displayReasoning = currentMatch?.reasoning || aiReasoning;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
       {displayReasoning && (
        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-xs sm:text-sm text-blue-800 dark:text-blue-200">
          <strong className="flex items-center gap-1 mb-1"><Sparkles size={14} /> Info:</strong>
          {displayReasoning}
        </div>
      )}

      {/* Reserves / Substitutions Control Panel */}
       <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-0 z-10 safe-top-pad">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
             <h5 className="text-sm font-bold uppercase text-gray-700 dark:text-gray-300 flex items-center gap-2 self-start sm:self-center">
                <ArrowRightLeft size={16} /> Substituição
             </h5>
             
             <div className="flex w-full sm:w-auto items-center gap-2">
                 {(teamAReserves.length > 0 || teamBReserves.length > 0) && (
                     <button
                        onClick={() => setIsHalftimeModalOpen(true)}
                        className="flex-1 sm:flex-none text-xs flex justify-center items-center gap-1 bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white font-bold py-2.5 sm:py-2 px-3 rounded-lg shadow-md transition-colors touch-manipulation"
                     >
                        <Timer size={16} /> Intervalo (Auto)
                     </button>
                 )}
                 {selectedFieldPlayer && selectedReservePlayer && (
                     <button 
                        onClick={handleSwapPlayers}
                        className="flex-1 sm:flex-none text-xs bg-pitch-600 hover:bg-pitch-700 active:bg-pitch-800 text-white font-bold py-2.5 sm:py-2 px-4 rounded-lg animate-pulse shadow-md touch-manipulation"
                     >
                        Trocar Selecionados
                     </button>
                 )}
             </div>
          </div>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Team A */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white">Time A</h3>
             <div className="flex items-center gap-3">
                <button 
                  onClick={() => updateScore('A', -1)} 
                  className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-600 dark:bg-red-900/30 dark:text-red-400 transition-colors touch-manipulation"
                  title="Remover Gol"
                >
                  <Minus size={20} />
                </button>
                <span className="text-4xl sm:text-3xl font-bold font-mono dark:text-white min-w-[40px] text-center">{scoreA}</span>
                <button 
                  onClick={() => updateScore('A', 1)} 
                  className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 active:bg-green-300 text-green-600 dark:bg-green-900/30 dark:text-green-400 transition-colors touch-manipulation"
                  title="Adicionar Gol"
                >
                  <Plus size={20} />
                </button>
             </div>
          </div>
          
          <div className="space-y-4">
             <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Titulares</h4>
                <ul className="space-y-1">
                    {teamAStarters.map(player => renderPlayerItem(player, 'A'))}
                </ul>
             </div>
             {teamAReserves.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-yellow-600 uppercase mb-2 border-b border-yellow-200 pb-1 pt-2 flex justify-between">
                        <span>Banco</span>
                        <span className="text-[9px] bg-yellow-100 px-1.5 rounded-full flex items-center">{teamAReserves.length}</span>
                    </h4>
                    <ul className="space-y-1 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-2">
                        {teamAReserves.map(player => renderPlayerItem(player, 'A'))}
                    </ul>
                </div>
             )}
          </div>
        </div>

        {/* Team B */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white">Time B</h3>
             <div className="flex items-center gap-3">
                <button 
                  onClick={() => updateScore('B', -1)} 
                  className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-600 dark:bg-red-900/30 dark:text-red-400 transition-colors touch-manipulation"
                  title="Remover Gol"
                >
                  <Minus size={20} />
                </button>
                <span className="text-4xl sm:text-3xl font-bold font-mono dark:text-white min-w-[40px] text-center">{scoreB}</span>
                <button 
                  onClick={() => updateScore('B', 1)} 
                  className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 active:bg-green-300 text-green-600 dark:bg-green-900/30 dark:text-green-400 transition-colors touch-manipulation"
                  title="Adicionar Gol"
                >
                  <Plus size={20} />
                </button>
             </div>
          </div>
          
          <div className="space-y-4">
             <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Titulares</h4>
                <ul className="space-y-1">
                    {teamBStarters.map(player => renderPlayerItem(player, 'B'))}
                </ul>
             </div>
             {teamBReserves.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-yellow-600 uppercase mb-2 border-b border-yellow-200 pb-1 pt-2 flex justify-between">
                        <span>Banco</span>
                        <span className="text-[9px] bg-yellow-100 px-1.5 rounded-full flex items-center">{teamBReserves.length}</span>
                    </h4>
                    <ul className="space-y-1 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-2">
                        {teamBReserves.map(player => renderPlayerItem(player, 'B'))}
                    </ul>
                </div>
             )}
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4 sm:pt-6 pb-4">
        <button
          type="button"
          onClick={handleFinishClick}
          disabled={isFinishing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-pitch-600 hover:bg-pitch-700 active:bg-pitch-800 text-white font-bold py-3.5 sm:py-3 px-8 rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-wait touch-manipulation"
        >
          {isFinishing ? (
             <>
               <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
               Processando...
             </>
          ) : (
             <>
               <Save size={20} />
               Finalizar Partida
             </>
          )}
        </button>
      </div>

      <ConfirmationModal 
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        onConfirm={confirmFinishMatch}
        title="Encerrar Partida"
        message="Deseja realmente finalizar a partida? Os resultados serão salvos no histórico, o ranking será atualizado e a ordem de chegada será rotacionada."
        confirmText="Sim, Encerrar"
      />
      
      <ConfirmationModal 
        isOpen={isHalftimeModalOpen}
        onClose={() => setIsHalftimeModalOpen(false)}
        onConfirm={performHalftimeSubs}
        title="Realizar Intervalo"
        message="Isso trocará automaticamente os titulares com maior prioridade de saída pelos reservas disponíveis em ambos os times. Confirmar?"
        confirmText="Sim, Substituir"
      />
    </div>
  );
};