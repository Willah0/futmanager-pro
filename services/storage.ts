import { Player, AttendanceRecord, MatchResult, AppSettings, CurrentMatchState } from '../types';

const KEYS = {
  PLAYERS: 'fut_players',
  ATTENDANCE: 'fut_attendance',
  HISTORY: 'fut_history',
  SETTINGS: 'fut_settings',
  CURRENT_MATCH: 'fut_current_match',
};

export const StorageService = {
  getPlayers: (): Player[] => {
    try {
      const data = localStorage.getItem(KEYS.PLAYERS);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  savePlayers: (players: Player[]) => {
    localStorage.setItem(KEYS.PLAYERS, JSON.stringify(players));
  },

  getAttendance: (): AttendanceRecord[] => {
    try {
      const data = localStorage.getItem(KEYS.ATTENDANCE);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  saveAttendance: (records: AttendanceRecord[]) => {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
  },

  getHistory: (): MatchResult[] => {
    try {
      const data = localStorage.getItem(KEYS.HISTORY);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  saveHistory: (history: MatchResult[]) => {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  },

  getSettings: (): AppSettings => {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      const defaultSettings: AppSettings = { playersPerTeam: 10, theme: 'light', autoBalance: true, tacticalSchema: '2-2-3-2' };
      return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch {
      return { playersPerTeam: 10, theme: 'light', autoBalance: true, tacticalSchema: '2-2-3-2' };
    }
  },
  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  getCurrentMatch: (): CurrentMatchState | null => {
    try {
      const data = localStorage.getItem(KEYS.CURRENT_MATCH);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  saveCurrentMatch: (match: CurrentMatchState) => {
    localStorage.setItem(KEYS.CURRENT_MATCH, JSON.stringify(match));
  },
  clearCurrentMatch: () => {
    localStorage.removeItem(KEYS.CURRENT_MATCH);
  }
};