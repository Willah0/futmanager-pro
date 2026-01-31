import React, { useState } from 'react';
import { Player, MatchResult } from '../types';
import { Trophy, Medal, History, Calendar, ChevronLeft, TrendingUp, Activity, User } from 'lucide-react';

interface Props {
  players: Player[];
  history: MatchResult[];
}

export const RankingBoard: React.FC<Props> = ({ players, history }) => {
  const [activeView, setActiveView] = useState<'ranking' | 'history'>('ranking');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const sortedPlayers = [...players].sort((a, b) => {
    if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
    if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
    return a.stats.matches - b.stats.matches;
  });

  const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalGlobalMatches = history.length;

  // Helper para determinar resultado do jogador em uma partida
  const getPlayerMatchResult = (match: MatchResult, playerId: string): { result: 'V' | 'D' | 'E', score: string, date: string, opponentScore: number, teamScore: number } => {
    const isTeamA = match.teamA.some(p => p.id === playerId);
    const teamScore = isTeamA ? match.scoreA : match.scoreB;
    const opponentScore = isTeamA ? match.scoreB : match.scoreA;
    
    let result: 'V' | 'D' | 'E' = 'D';
    if (match.winner === 'Draw') result = 'E';
    else if ((match.winner === 'A' && isTeamA) || (match.winner === 'B' && !isTeamA)) result = 'V';

    return {
        result,
        score: `${teamScore} x ${opponentScore}`,
        teamScore,
        opponentScore,
        date: match.date
    };
  };

  // Renderização da tela de detalhes do jogador
  if (selectedPlayer) {
    const playerHistory = sortedHistory.filter(m => 
        m.teamA.some(p => p.id === selectedPlayer.id) || m.teamB.some(p => p.id === selectedPlayer.id)
    );

    const winRate = selectedPlayer.stats.matches > 0 
        ? Math.round((selectedPlayer.stats.wins / selectedPlayer.stats.matches) * 100) 
        : 0;
    
    // Assiduidade baseada no total de jogos registrados no histórico global
    const attendanceRate = totalGlobalMatches > 0
        ? Math.round((selectedPlayer.stats.matches / totalGlobalMatches) * 100)
        : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <button 
                onClick={() => setSelectedPlayer(null)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-pitch-600 dark:hover:text-pitch-400 font-medium transition-colors p-2 -ml-2 rounded"
            >
                <ChevronLeft size={20} /> Voltar ao Ranking
            </button>

            {/* Player Header */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                            {selectedPlayer.name}
                            <span className={`text-xs px-2 py-1 rounded-full ${
                                selectedPlayer.type === 'Mensalista' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            }`}>
                                {selectedPlayer.type}
                            </span>
                        </h2>
                        <div className="flex gap-1 mt-2 flex-wrap">
                             {selectedPlayer.positions.map(p => (
                                <span key={p} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                    {p}
                                </span>
                             ))}
                        </div>
                    </div>
                    <div className="text-center pl-4">
                        <div className="text-4xl font-bold text-pitch-600 dark:text-pitch-400">{selectedPlayer.stats.points}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Pontos</div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{selectedPlayer.stats.matches}</div>
                        <div className="text-xs text-gray-500">Partidas</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">{selectedPlayer.stats.wins}</div>
                        <div className="text-xs text-green-600/70 dark:text-green-400/70">Vitórias</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{winRate}%</div>
                        <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Aprov.</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{attendanceRate}%</div>
                        <div className="text-xs text-purple-600/70 dark:text-purple-400/70">Assiduidade</div>
                    </div>
                </div>

                {/* Form (Last 5 Games) */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                        <Activity size={16} /> Forma Recente
                    </h3>
                    <div className="flex gap-2">
                        {playerHistory.slice(0, 5).map(match => {
                            const { result } = getPlayerMatchResult(match, selectedPlayer.id);
                            let colorClass = 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
                            if (result === 'V') colorClass = 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
                            if (result === 'D') colorClass = 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
                            
                            return (
                                <div key={match.id} className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs ${colorClass}`}>
                                    {result}
                                </div>
                            );
                        })}
                        {playerHistory.length === 0 && <span className="text-sm text-gray-400">Sem jogos recentes</span>}
                    </div>
                </div>

                {/* Match History List */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
                        <History size={16} /> Histórico de Partidas
                    </h3>
                    <div className="space-y-2">
                        {playerHistory.map(match => {
                            const { result, teamScore, opponentScore, date } = getPlayerMatchResult(match, selectedPlayer.id);
                             return (
                                <div key={match.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-1.5 h-8 rounded-full ${
                                            result === 'V' ? 'bg-green-500' : result === 'D' ? 'bg-red-500' : 'bg-gray-400'
                                        }`}></span>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                {result === 'V' ? 'Vitória' : result === 'D' ? 'Derrota' : 'Empate'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(date).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-mono font-bold text-gray-800 dark:text-gray-200">
                                            {teamScore} - {opponentScore}
                                        </span>
                                    </div>
                                </div>
                             )
                        })}
                         {playerHistory.length === 0 && (
                            <div className="text-center py-4 text-gray-500 text-sm">Nenhuma partida registrada.</div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
       {/* Toggle Buttons */}
       <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
            onClick={() => setActiveView('ranking')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-2 rounded-md text-sm font-medium transition-all touch-manipulation ${
                activeView === 'ranking' 
                ? 'bg-white dark:bg-gray-700 shadow text-pitch-700 dark:text-white' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
        >
            <Trophy size={16} /> Ranking
        </button>
        <button
            onClick={() => setActiveView('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-2 rounded-md text-sm font-medium transition-all touch-manipulation ${
                activeView === 'history' 
                ? 'bg-white dark:bg-gray-700 shadow text-pitch-700 dark:text-white' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
        >
            <History size={16} /> Histórico
        </button>
      </div>

      {activeView === 'ranking' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-b border-yellow-100 dark:border-yellow-900/50 flex items-center gap-2">
                <Trophy className="text-yellow-600 dark:text-yellow-500" />
                <h2 className="text-lg font-bold text-yellow-800 dark:text-yellow-500">Classificação</h2>
            </div>
            
            <div className="overflow-x-auto w-full touch-pan-x">
                <table className="w-full text-left text-sm min-w-[350px]">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 uppercase font-semibold text-xs">
                    <tr>
                        <th className="px-3 py-3 w-10 text-center">#</th>
                        <th className="px-3 py-3">Jogador</th>
                        <th className="px-3 py-3 text-center">Pts</th>
                        <th className="px-3 py-3 text-center" title="Partidas Jogadas">J</th>
                        <th className="px-3 py-3 text-center" title="Assiduidade (Presença)">%</th>
                        <th className="px-3 py-3 text-center hidden sm:table-cell">V</th>
                        <th className="px-3 py-3 text-center hidden sm:table-cell">E</th>
                        <th className="px-3 py-3 text-center hidden sm:table-cell">D</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sortedPlayers.map((player, index) => {
                        let rankIcon = null;
                        if (index === 0) rankIcon = <Medal size={16} className="text-yellow-500" />;
                        else if (index === 1) rankIcon = <Medal size={16} className="text-gray-400" />;
                        else if (index === 2) rankIcon = <Medal size={16} className="text-amber-700" />;

                        const attendancePct = totalGlobalMatches > 0
                            ? Math.round((player.stats.matches / totalGlobalMatches) * 100)
                            : 0;

                        return (
                        <tr 
                            key={player.id} 
                            onClick={() => setSelectedPlayer(player)}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer group active:bg-gray-100 dark:active:bg-gray-700"
                        >
                            <td className="px-3 py-3 text-center font-bold text-gray-500 dark:text-gray-400">
                            <div className="flex items-center justify-center gap-1">
                                {index + 1}
                                {rankIcon}
                            </div>
                            </td>
                            <td className="px-3 py-3 font-medium text-gray-900 dark:text-white max-w-[120px] sm:max-w-none">
                                <div className="flex flex-col">
                                    <span className="group-hover:text-pitch-600 transition-colors truncate">{player.name}</span>
                                    <span className="text-[10px] text-gray-400 font-normal">{player.type}</span>
                                </div>
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-pitch-600 dark:text-pitch-400 text-base">
                            {player.stats.points}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{player.stats.matches}</td>
                            <td className="px-3 py-3 text-center text-blue-600 dark:text-blue-400 font-medium text-xs">
                                {attendancePct}%
                            </td>
                            <td className="px-3 py-3 text-center text-green-600 dark:text-green-400 hidden sm:table-cell">{player.stats.wins}</td>
                            <td className="px-3 py-3 text-center text-gray-500 dark:text-gray-400 hidden sm:table-cell">{player.stats.draws}</td>
                            <td className="px-3 py-3 text-center text-red-500 dark:text-red-400 hidden sm:table-cell">{player.stats.losses}</td>
                        </tr>
                        );
                    })}
                    {sortedPlayers.length === 0 && (
                        <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500">Nenhum dado registrado ainda.</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
            <div className="p-2 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
                Toque em um jogador para ver estatísticas detalhadas
            </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
            {sortedHistory.map(match => (
                <div key={match.id} className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                       <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar size={14}/>
                          {new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })}
                       </div>
                    </div>
                    
                    {/* Scoreboard */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex-1 text-center">
                            <span className={`text-3xl font-bold font-mono ${match.winner === 'A' ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                {match.scoreA}
                            </span>
                            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Time A</p>
                        </div>
                        <div className="text-gray-300 dark:text-gray-600 font-light text-2xl px-4">X</div>
                        <div className="flex-1 text-center">
                             <span className={`text-3xl font-bold font-mono ${match.winner === 'B' ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                {match.scoreB}
                            </span>
                            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Time B</p>
                        </div>
                    </div>

                    {/* Rosters */}
                    <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3">
                        <div>
                            <ul className="space-y-1">
                                {match.teamA.map(p => <li key={p.id} className="text-gray-600 dark:text-gray-400 truncate">• {p.name}</li>)}
                            </ul>
                        </div>
                        <div className="text-right">
                            <ul className="space-y-1">
                                {match.teamB.map(p => <li key={p.id} className="text-gray-600 dark:text-gray-400 truncate">{p.name} •</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            ))}
            {sortedHistory.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <History size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">Nenhuma partida registrada ainda.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};