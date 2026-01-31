import React, { useMemo } from 'react';
import { Player, AttendanceRecord } from '../types';
import { Clock, CheckCircle2, Circle } from 'lucide-react';

interface Props {
  players: Player[];
  attendance: AttendanceRecord[];
  onToggleAttendance: (playerId: string) => void;
  maxPlayers: number; // 18 usually
}

export const AttendanceManager: React.FC<Props> = ({ players, attendance, onToggleAttendance, maxPlayers }) => {
  
  // Sort players: Present first (sorted by arrival time), then Absent (sorted by name)
  const sortedPlayers = useMemo(() => {
    const presentIds = new Set(attendance.map(a => a.playerId));
    const attendanceMap = new Map(attendance.map(a => [a.playerId, a.arrivalTime]));

    const present = players
      .filter(p => presentIds.has(p.id))
      .sort((a, b) => (attendanceMap.get(a.id) || 0) - (attendanceMap.get(b.id) || 0));

    const absent = players
      .filter(p => !presentIds.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { present, absent };
  }, [players, attendance]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-bold mb-2 dark:text-white flex items-center gap-2">
          <Clock className="text-pitch-500" /> Ordem de Chegada
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Marque os jogadores conforme chegam. Os primeiros {maxPlayers} formam os times iniciais.
        </p>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-pitch-700 dark:text-pitch-400 mb-3 uppercase tracking-wider">
            Em Campo / Próximos ({sortedPlayers.present.length})
          </h3>
          <ul className="space-y-2">
            {sortedPlayers.present.map((player, index) => {
              const isStarter = index < maxPlayers;
              return (
                <li 
                  key={player.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isStarter 
                      ? 'bg-pitch-50 border-pitch-200 dark:bg-pitch-900/20 dark:border-pitch-800' 
                      : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isStarter ? 'bg-pitch-500 text-white' : 'bg-yellow-500 text-white'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                         {isStarter ? 'Titular (1º Tempo)' : 'Reserva / 2º Tempo'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleAttendance(player.id)}
                    className="text-pitch-600 hover:text-red-500"
                  >
                    <CheckCircle2 className="fill-current text-pitch-500" />
                  </button>
                </li>
              );
            })}
             {sortedPlayers.present.length === 0 && (
              <li className="text-sm text-gray-400 italic p-2 text-center border border-dashed rounded-lg">
                Ninguém marcou presença ainda.
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            Ausentes ({sortedPlayers.absent.length})
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sortedPlayers.absent.map(player => (
              <li 
                key={player.id}
                onClick={() => onToggleAttendance(player.id)}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
              >
                <span className="text-gray-700 dark:text-gray-300 font-medium">{player.name}</span>
                <Circle size={20} className="text-gray-300 dark:text-gray-500" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};