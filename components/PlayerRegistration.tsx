import React, { useState } from 'react';
import { Player, Position, PlayerType } from '../types';
import { Trash2, UserPlus, Shield, Crosshair, Activity, Hand, ArrowLeftRight, Pencil, X, Save } from 'lucide-react';

interface Props {
  players: Player[];
  onAddPlayer: (player: Player) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (id: string) => void;
}

export const PlayerRegistration: React.FC<Props> = ({ players, onAddPlayer, onUpdatePlayer, onDeletePlayer }) => {
  const [name, setName] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [type, setType] = useState<PlayerType>('Mensalista');
  const [editingId, setEditingId] = useState<string | null>(null);

  const togglePosition = (pos: Position) => {
    setPositions(prev => 
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const handleEdit = (player: Player) => {
    setName(player.name);
    setPositions(player.positions);
    setType(player.type);
    setEditingId(player.id);
  };

  const handleCancelEdit = () => {
    setName('');
    setPositions([]);
    setType('Mensalista');
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || positions.length === 0) return;

    if (editingId) {
      // Modo Edição
      const originalPlayer = players.find(p => p.id === editingId);
      if (originalPlayer) {
        onUpdatePlayer({
          ...originalPlayer,
          name,
          positions,
          type
        });
      }
    } else {
      // Modo Criação
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name,
        positions,
        type,
        stats: { matches: 0, wins: 0, draws: 0, losses: 0, points: 0 }
      };
      onAddPlayer(newPlayer);
    }

    handleCancelEdit(); // Limpa o formulário e sai do modo edição
  };

  const getPosIcon = (p: Position) => {
    switch (p) {
      case 'Goleiro': return <Hand size={14} className="text-yellow-600" />;
      case 'Defensor': return <Shield size={14} className="text-blue-600" />;
      case 'Lateral': return <ArrowLeftRight size={14} className="text-indigo-600" />;
      case 'Meio': return <Activity size={14} className="text-green-600" />;
      case 'Atacante': return <Crosshair size={14} className="text-red-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`p-4 sm:p-6 rounded-xl shadow-sm border transition-colors ${
        editingId 
          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
          : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'
      }`}>
        <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
          editingId ? 'text-blue-700 dark:text-blue-300' : 'dark:text-white'
        }`}>
          {editingId ? <Pencil className="text-blue-500" /> : <UserPlus className="text-pitch-500" />} 
          {editingId ? 'Editar Jogador' : 'Novo Jogador'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-pitch-500 text-base"
              placeholder="Ex: Neymar Jr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Posições</label>
            <div className="flex flex-wrap gap-2">
              {(['Goleiro', 'Defensor', 'Lateral', 'Meio', 'Atacante'] as Position[]).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePosition(pos)}
                  className={`px-4 py-2.5 sm:py-2 sm:px-3 rounded-full text-sm font-medium border transition-colors flex items-center gap-2 touch-manipulation ${
                    positions.includes(pos)
                      ? 'bg-pitch-100 border-pitch-500 text-pitch-800 dark:bg-pitch-900 dark:text-pitch-100'
                      : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  {getPosIcon(pos)}
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer dark:text-gray-200 p-2 -ml-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  checked={type === 'Mensalista'}
                  onChange={() => setType('Mensalista')}
                  className="w-5 h-5 text-pitch-600 focus:ring-pitch-500"
                />
                <span className="text-base">Mensalista</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer dark:text-gray-200 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  checked={type === 'Diarista'}
                  onChange={() => setType('Diarista')}
                  className="w-5 h-5 text-pitch-600 focus:ring-pitch-500"
                />
                <span className="text-base">Diarista</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2 flex-col sm:flex-row">
            <button
              type="submit"
              disabled={!name || positions.length === 0}
              className={`w-full font-bold py-3 px-4 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 touch-manipulation ${
                editingId 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-pitch-600 hover:bg-pitch-700 text-white'
              }`}
            >
              {editingId ? <Save size={20} /> : <UserPlus size={20} />}
              {editingId ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
            
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation"
              >
                <X size={20} /> Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold dark:text-white">Elenco ({players.length})</h3>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {players.map(player => (
            <li key={player.id} className={`p-4 flex items-center justify-between transition-colors ${
                editingId === player.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}>
              <div>
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-base">{player.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    player.type === 'Mensalista' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                  }`}>
                    {player.type === 'Mensalista' ? 'M' : 'D'}
                  </span>
                  {editingId === player.id && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">Editando...</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-1">
                  {player.positions.map(p => (
                    <span key={p} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {getPosIcon(p)} {p}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                    onClick={() => handleEdit(player)}
                    className="text-gray-400 hover:text-blue-500 p-3 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors touch-manipulation"
                    title="Editar"
                    disabled={editingId !== null && editingId !== player.id}
                >
                    <Pencil size={20} />
                </button>
                <button
                    onClick={() => onDeletePlayer(player.id)}
                    className="text-gray-400 hover:text-red-500 p-3 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation"
                    title="Excluir"
                    disabled={editingId !== null}
                >
                    <Trash2 size={20} />
                </button>
              </div>
            </li>
          ))}
          {players.length === 0 && (
            <li className="p-8 text-center text-gray-500 dark:text-gray-400">
              Nenhum jogador cadastrado.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};