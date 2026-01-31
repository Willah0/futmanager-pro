import { Player, AttendanceRecord, MatchResult, AppSettings, CurrentMatchState } from '../types';
import { StorageService } from './storage';

export interface ExportData {
    version: string;
    exportDate: string;
    players: Player[];
    attendance: AttendanceRecord[];
    history: MatchResult[];
    settings: AppSettings;
    currentMatch: CurrentMatchState | null;
}

export const DataExportService = {
    /**
     * Export all app data to JSON format
     */
    exportToJSON(): string {
        const data: ExportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            players: StorageService.getPlayers(),
            attendance: StorageService.getAttendance(),
            history: StorageService.getHistory(),
            settings: StorageService.getSettings(),
            currentMatch: StorageService.getCurrentMatch(),
        };

        return JSON.stringify(data, null, 2);
    },

    /**
     * Export players data to CSV format
     */
    exportPlayersCSV(): string {
        const players = StorageService.getPlayers();

        const headers = ['Nome', 'Posições', 'Tipo', 'Partidas', 'Vitórias', 'Empates', 'Derrotas', 'Pontos'];
        const rows = players.map(p => [
            p.name,
            p.positions.join('; '),
            p.type,
            p.stats.matches.toString(),
            p.stats.wins.toString(),
            p.stats.draws.toString(),
            p.stats.losses.toString(),
            p.stats.points.toString(),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    },

    /**
     * Export match history to CSV format
     */
    exportMatchHistoryCSV(): string {
        const history = StorageService.getHistory();

        const headers = ['Data', 'Time A', 'Placar A', 'Time B', 'Placar B', 'Vencedor'];
        const rows = history.map(m => [
            new Date(m.date).toLocaleString('pt-BR'),
            m.teamA.map(p => p.name).join('; '),
            m.scoreA.toString(),
            m.teamB.map(p => p.name).join('; '),
            m.scoreB.toString(),
            m.winner === 'Draw' ? 'Empate' : `Time ${m.winner}`,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    },

    /**
     * Download data as a file
     */
    downloadFile(content: string, filename: string, mimeType: string = 'application/json'): void {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Validate imported data structure
     */
    validateImportData(data: any): { valid: boolean; error?: string } {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Dados inválidos' };
        }

        if (!data.version) {
            return { valid: false, error: 'Versão não encontrada' };
        }

        if (!Array.isArray(data.players)) {
            return { valid: false, error: 'Lista de jogadores inválida' };
        }

        if (!Array.isArray(data.history)) {
            return { valid: false, error: 'Histórico de partidas inválido' };
        }

        // Validate player structure
        for (const player of data.players) {
            if (!player.id || !player.name || !Array.isArray(player.positions) || !player.type || !player.stats) {
                return { valid: false, error: 'Estrutura de jogador inválida' };
            }
        }

        return { valid: true };
    },

    /**
     * Import data from JSON
     */
    importFromJSON(jsonString: string): { success: boolean; error?: string } {
        try {
            const data = JSON.parse(jsonString);

            const validation = this.validateImportData(data);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Import data
            StorageService.savePlayers(data.players || []);
            StorageService.saveAttendance(data.attendance || []);
            StorageService.saveHistory(data.history || []);

            if (data.settings) {
                StorageService.saveSettings(data.settings);
            }

            if (data.currentMatch) {
                StorageService.saveCurrentMatch(data.currentMatch);
            } else {
                StorageService.clearCurrentMatch();
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro ao importar dados'
            };
        }
    },

    /**
     * Read file content
     */
    async readFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                resolve(content);
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file);
        });
    },
};
