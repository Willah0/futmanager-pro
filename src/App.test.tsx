import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import React from 'react';
import { ToastProvider } from '../components/Toast';

// Workflow Integration Test
describe('FutManager Pro Workflow', () => {
    it('should complete the full flow: Add Player -> Attendance -> Match Prep', async () => {
        const user = userEvent.setup();
        render(
            <ToastProvider>
                <App />
            </ToastProvider>
        );

        // 1. Initial State: Match tab is active by default, but let's navigate explicitly
        // Navigate to Players
        const playersTab = screen.getByText('Jogadores');
        await user.click(playersTab);

        // 2. Add a new Player
        const nameInput = screen.getByPlaceholderText('Ex: Neymar Jr');
        await user.type(nameInput, 'Test Player');

        // Select position (e.g., Atacante)
        const positionBtn = screen.getByText('Atacante');
        await user.click(positionBtn);

        // Click Cadastrar (looks for button with "Cadastrar" text)
        const submitBtn = screen.getByRole('button', { name: /cadastrar/i });
        await user.click(submitBtn);

        // Verify player is in the list
        expect(screen.getByText('Test Player')).toBeInTheDocument();
        // Check for 'A' tag or position indicator if possible, but name is enough

        // 3. Mark Attendance
        // Navigate to Attendance
        const attendanceTab = screen.getByText('Presença');
        await user.click(attendanceTab);

        // Verify player is in Absent list (by default)
        const absentee = screen.getByText('Test Player');
        expect(absentee).toBeInTheDocument();

        // Click to mark as present (Clicking the list item or the check button)
        // In AttendanceManager, the list item has an onClick handler or a button inside.
        // Absent list items are clickable: onClick={() => onToggleAttendance(player.id)}
        await user.click(absentee);

        // Verify player moved to "Em Campo / Próximos" section
        // We can check if the "Em Campo" header count updated or if the element is now in the upper list
        // The upper list items have "Titular" or "Reserva" text.
        // Let's just check the "Jogadores Presentes" count in the Match tab next.

        // 4. Match Prep
        // Navigate to Match
        const matchTab = screen.getByText('Partida');
        await user.click(matchTab);

        // Check "Jogadores Presentes" count
        // In MatchManager, there is text "Jogadores Presentes" and the number below it.
        // Or "Jogadores Presentes" text and sibling has count.
        expect(screen.getByText(/jogadores presentes/i)).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Should be 1

        // Success!
    });
});
