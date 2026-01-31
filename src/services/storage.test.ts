import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../../services/storage';
import { Player, AttendanceRecord, MatchResult, AppSettings } from '../../types';

describe('StorageService', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    describe('Players', () => {
        it('should save and retrieve players', () => {
            const players: Player[] = [
                {
                    id: '1',
                    name: 'Test Player',
                    positions: ['Atacante'],
                    type: 'Mensalista',
                    stats: { matches: 0, wins: 0, draws: 0, losses: 0, points: 0 }
                }
            ];

            StorageService.savePlayers(players);
            const retrieved = StorageService.getPlayers();

            expect(retrieved).toEqual(players);
            expect(retrieved).toHaveLength(1);
            expect(retrieved[0].name).toBe('Test Player');
        });

        it('should return empty array when no players exist', () => {
            const players = StorageService.getPlayers();
            expect(players).toEqual([]);
        });

        it('should handle corrupted data gracefully', () => {
            localStorage.setItem('fut_players', 'invalid json');
            const players = StorageService.getPlayers();
            expect(players).toEqual([]);
        });
    });

    describe('Attendance', () => {
        it('should save and retrieve attendance records', () => {
            const attendance: AttendanceRecord[] = [
                { playerId: '1', arrivalTime: Date.now() }
            ];

            StorageService.saveAttendance(attendance);
            const retrieved = StorageService.getAttendance();

            expect(retrieved).toEqual(attendance);
            expect(retrieved).toHaveLength(1);
        });

        it('should return empty array when no attendance exists', () => {
            const attendance = StorageService.getAttendance();
            expect(attendance).toEqual([]);
        });
    });

    describe('Match History', () => {
        it('should save and retrieve match history', () => {
            const history: MatchResult[] = [
                {
                    id: 'match-1',
                    date: new Date().toISOString(),
                    teamA: [],
                    teamB: [],
                    scoreA: 3,
                    scoreB: 2,
                    winner: 'A'
                }
            ];

            StorageService.saveHistory(history);
            const retrieved = StorageService.getHistory();

            expect(retrieved).toEqual(history);
            expect(retrieved[0].scoreA).toBe(3);
            expect(retrieved[0].winner).toBe('A');
        });
    });

    describe('Settings', () => {
        it('should save and retrieve settings', () => {
            const settings: AppSettings = {
                playersPerTeam: 8,
                theme: 'dark',
                autoBalance: false,
                tacticalSchema: '3-2-2-1'
            };

            StorageService.saveSettings(settings);
            const retrieved = StorageService.getSettings();

            expect(retrieved).toEqual(settings);
            expect(retrieved.theme).toBe('dark');
            expect(retrieved.playersPerTeam).toBe(8);
        });

        it('should return default settings when none exist', () => {
            const settings = StorageService.getSettings();

            expect(settings.playersPerTeam).toBe(10);
            expect(settings.theme).toBe('light');
            expect(settings.autoBalance).toBe(true);
            expect(settings.tacticalSchema).toBe('2-2-3-2');
        });
    });

    describe('Current Match', () => {
        it('should save and retrieve current match state', () => {
            const matchState = {
                teamA: [],
                teamB: [],
                scoreA: 0,
                scoreB: 0,
                starters: ['1', '2', '3'],
                startTime: new Date().toISOString()
            };

            StorageService.saveCurrentMatch(matchState);
            const retrieved = StorageService.getCurrentMatch();

            expect(retrieved).toEqual(matchState);
            expect(retrieved?.starters).toHaveLength(3);
        });

        it('should return null when no current match exists', () => {
            const match = StorageService.getCurrentMatch();
            expect(match).toBeNull();
        });

        it('should clear current match', () => {
            const matchState = {
                teamA: [],
                teamB: [],
                scoreA: 0,
                scoreB: 0,
                starters: [],
                startTime: new Date().toISOString()
            };

            StorageService.saveCurrentMatch(matchState);
            expect(StorageService.getCurrentMatch()).not.toBeNull();

            StorageService.clearCurrentMatch();
            expect(StorageService.getCurrentMatch()).toBeNull();
        });
    });
});
