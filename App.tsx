import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { PlayerRegistration } from './components/PlayerRegistration';
import { AttendanceManager } from './components/AttendanceManager';
import { MatchManager } from './components/MatchManager';
import { RankingBoard } from './components/RankingBoard';
import { Settings } from './components/Settings';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ToastProvider, useToast } from './components/Toast';
import { StorageService } from './services/storage';
import { Player, AttendanceRecord, MatchResult, AppSettings, CurrentMatchState, Position } from './types';

function App() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('match');
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [history, setHistory] = useState<MatchResult[]>([]);

  // Modal State
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // FIX: Inicializar diretamente do Storage para evitar que o useEffect de salvamento limpe os dados no mount
  const [currentMatch, setCurrentMatch] = useState<CurrentMatchState | null>(() => StorageService.getCurrentMatch());

  const [settings, setSettings] = useState<AppSettings>({
    playersPerTeam: 10,
    theme: 'light',
    autoBalance: true,
    tacticalSchema: '2-2-3-2'
  });

  // Load Initial Data
  useEffect(() => {
    setPlayers(StorageService.getPlayers());
    setAttendance(StorageService.getAttendance());
    setHistory(StorageService.getHistory());
    // currentMatch já é carregado na inicialização do state

    const savedSettings = StorageService.getSettings();
    setSettings(savedSettings);

    // Apply theme
    if (savedSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Save Data on Change
  useEffect(() => { StorageService.savePlayers(players); }, [players]);
  useEffect(() => { StorageService.saveAttendance(attendance); }, [attendance]);
  useEffect(() => { StorageService.saveHistory(history); }, [history]);
  useEffect(() => {
    StorageService.saveSettings(settings);
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Persist current match whenever it changes
  useEffect(() => {
    if (currentMatch) {
      StorageService.saveCurrentMatch(currentMatch);
    } else {
      StorageService.clearCurrentMatch();
    }
  }, [currentMatch]);


  // Actions
  const handleAddPlayer = (newPlayer: Player) => {
    setPlayers(prev => [...prev, newPlayer]);
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
  };

  const handleDeletePlayer = (id: string) => {
    if (window.confirm("Tem certeza? Isso apagará o histórico deste jogador.")) {
      setPlayers(prev => prev.filter(p => p.id !== id));
      setAttendance(prev => prev.filter(a => a.playerId !== id));
    }
  };

  const handleToggleAttendance = (playerId: string) => {
    setAttendance(prev => {
      const exists = prev.find(a => a.playerId === playerId);
      if (exists) {
        return prev.filter(a => a.playerId !== playerId);
      } else {
        return [...prev, { playerId, arrivalTime: Date.now() }];
      }
    });
  };

  const handleUpdateMatch = (matchState: CurrentMatchState) => {
    setCurrentMatch(matchState);
  };

  const handleFinishMatch = (teamA: Player[], teamB: Player[], scoreA: number, scoreB: number, subbedOut?: string[]) => {
    try {
      const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'Draw';

      // Ensure arrays exist
      const safeTeamA = teamA || [];
      const safeTeamB = teamB || [];

      // Safe UUID generation (fallback for non-secure contexts)
      const matchId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2);

      // Create new match record
      const match: MatchResult = {
        id: matchId,
        date: new Date().toISOString(),
        teamA: safeTeamA,
        teamB: safeTeamB,
        scoreA,
        scoreB,
        winner,
        subbedOut: subbedOut || []
      };

      setHistory(prev => [...(prev || []), match]);

      // Update Player Stats
      setPlayers(prevPlayers => {
        if (!prevPlayers) return [];
        return prevPlayers.map(player => {
          const inTeamA = safeTeamA.some(p => p.id === player.id);
          const inTeamB = safeTeamB.some(p => p.id === player.id);
          const isPresent = attendance.some(a => a.playerId === player.id);

          // Defensive coding for legacy data (ensure stats object exists)
          const currentStats = player.stats || { matches: 0, wins: 0, draws: 0, losses: 0, points: 0 };

          if (!inTeamA && !inTeamB) {
            // Rule: "todos os jogadores presentes recebem 1 ponto" in case of a Draw.
            if (winner === 'Draw' && isPresent) {
              return {
                ...player,
                stats: {
                  ...currentStats,
                  points: (currentStats.points || 0) + 1
                }
              };
            }
            // Ensure stats exists even if unchanged
            return { ...player, stats: currentStats };
          }

          // Logic for players IN the match
          const newStats = { ...currentStats };
          newStats.matches = (newStats.matches || 0) + 1;
          newStats.points = (newStats.points || 0);
          newStats.wins = (newStats.wins || 0);
          newStats.draws = (newStats.draws || 0);
          newStats.losses = (newStats.losses || 0);

          if (winner === 'Draw') {
            newStats.draws += 1;
            newStats.points += 1; // 1 point for draw
          } else if ((winner === 'A' && inTeamA) || (winner === 'B' && inTeamB)) {
            newStats.wins += 1;
            newStats.points += 3; // 3 points for win
          } else {
            newStats.losses += 1;
            // 0 points for loss
          }

          return { ...player, stats: newStats };
        });
      });

      // Reset Attendance List Completely
      setAttendance([]);

      // Force clear immediately to avoid useEffect race conditions
      StorageService.clearCurrentMatch();
      setCurrentMatch(null);

    } catch (error) {
      console.error("Critical error finishing match:", error);
      alert("Ocorreu um erro ao salvar a partida. Tente novamente ou verifique se você está em um ambiente seguro.");
    }
  };

  const handleReset = () => {
    if (window.confirm("ATENÇÃO: Isso apagará TODOS os jogadores e histórico. Continuar?")) {
      localStorage.clear();
      toast.info('Sistema resetado. Recarregando...');
      setTimeout(() => window.location.reload(), 1000);
    }
  }

  // Robust ID generator fallback for non-secure contexts
  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
  };

  const handleGeneratePlayers = () => {
    // Names list
    const names = [
      "Lucas Silva", "Matheus", "Pedro Henrique", "Gabriel", "Felipe", "Thiago", "Arthur", "Davi",
      "Heitor", "Calebe", "Nicolas", "Rafael", "Daniel", "Samuel", "Bruno", "Eduardo",
      "Vitor", "Leonardo", "João", "André", "Ricardo", "Gustavo", "Caio", "Enzo",
      "Igor", "Marcelo", "Renan", "Diego", "Leandro", "Fábio"
    ];

    // Define distribution for 30 players to ensure variety
    const distribution = [
      { count: 3, pos: ['Goleiro'] },
      { count: 6, pos: ['Defensor'] },
      { count: 2, pos: ['Defensor', 'Lateral'] },
      { count: 4, pos: ['Lateral'] },
      { count: 6, pos: ['Meio'] },
      { count: 2, pos: ['Meio', 'Atacante'] },
      { count: 2, pos: ['Meio', 'Defensor'] },
      { count: 5, pos: ['Atacante'] }
    ];

    const newPlayers: Player[] = [];
    let nameIndex = 0;

    distribution.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        if (nameIndex >= names.length) break;

        // Random Type: 70% Mensalista, 30% Diarista
        const isMensalista = Math.random() > 0.3;

        newPlayers.push({
          id: generateId(),
          name: names[nameIndex],
          positions: group.pos as Position[],
          type: isMensalista ? 'Mensalista' : 'Diarista',
          stats: { matches: 0, wins: 0, draws: 0, losses: 0, points: 0 }
        });
        nameIndex++;
      }
    });

    // Shuffle array to mix IDs/order
    const shuffled = newPlayers.sort(() => Math.random() - 0.5);

    // Update State DIRECTLY
    setPlayers(shuffled);
    setHistory([]); // Clear history to avoid ID mismatch
    setAttendance([]); // Clear attendance
    setCurrentMatch(null); // Clear match
    StorageService.clearCurrentMatch();

    toast.success('30 Jogadores de teste gerados com sucesso!');
    setActiveTab('players');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'players':
        return <PlayerRegistration
          players={players}
          onAddPlayer={handleAddPlayer}
          onUpdatePlayer={handleUpdatePlayer}
          onDeletePlayer={handleDeletePlayer}
        />;
      case 'attendance':
        return <AttendanceManager players={players} attendance={attendance} onToggleAttendance={handleToggleAttendance} maxPlayers={settings.playersPerTeam * 2} />;
      case 'match':
        return <MatchManager
          allPlayers={players}
          attendance={attendance}
          history={history}
          settings={settings}
          currentMatch={currentMatch}
          onUpdateMatch={handleUpdateMatch}
          onFinishMatch={handleFinishMatch}
        />;
      case 'ranking':
        return <RankingBoard players={players} history={history} />;
      case 'settings':
        return <Settings settings={settings} onUpdateSettings={setSettings} resetData={handleReset} onGenerateDemoData={() => setIsDemoModalOpen(true)} />;
      default:
        return <MatchManager
          allPlayers={players}
          attendance={attendance}
          history={history}
          settings={settings}
          currentMatch={currentMatch}
          onUpdateMatch={handleUpdateMatch}
          onFinishMatch={handleFinishMatch}
        />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} isDark={settings.theme === 'dark'}>
      {renderContent()}

      <ConfirmationModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onConfirm={handleGeneratePlayers}
        title="Gerar Elenco de Teste?"
        message="Isso apagará TODOS os dados atuais (jogadores, partidas e ranking) e criará 30 novos jogadores fictícios com posições variadas. Esta ação não pode ser desfeita."
        confirmText="Sim, gerar jogadores"
      />
    </Layout>
  );
}

export default App;