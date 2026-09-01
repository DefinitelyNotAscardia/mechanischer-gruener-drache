import {describe, it, expect, vi, beforeEach} from 'vitest';

vi.mock('../handlers/bash.handler.js', () => ({
    default: {
        handleZitat: vi.fn(),
        handleBearbeiten: vi.fn(),
        handleEntfernen: vi.fn(),
        handleAnzahl: vi.fn(),
        handleHilfe: vi.fn(),
    }
}));

import bashHandler from '../handlers/bash.handler.js';
import bashCommand from './bash.command.js';

const mockInteraction = (subcommand: string) => ({
    options: {getSubcommand: vi.fn().mockReturnValue(subcommand)},
} as any);

describe('bash.command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        ['zitat', 'handleZitat'],
        ['bearbeiten', 'handleBearbeiten'],
        ['entfernen', 'handleEntfernen'],
        ['anzahl', 'handleAnzahl'],
        ['hilfe', 'handleHilfe'],
    ] as const)('leitet Subcommand "%s" an bashHandler.%s weiter', async (subcommand, method) => {
        const interaction = mockInteraction(subcommand);

        await bashCommand.execute(interaction);

        expect(bashHandler[method]).toHaveBeenCalledWith(interaction);
    });

    it('tut nichts bei einem unbekannten Subcommand', async () => {
        await bashCommand.execute(mockInteraction('nicht-existent'));

        expect(bashHandler.handleZitat).not.toHaveBeenCalled();
        expect(bashHandler.handleBearbeiten).not.toHaveBeenCalled();
        expect(bashHandler.handleEntfernen).not.toHaveBeenCalled();
        expect(bashHandler.handleAnzahl).not.toHaveBeenCalled();
        expect(bashHandler.handleHilfe).not.toHaveBeenCalled();
    });

    // Drift-Test: jeder im SlashCommandBuilder definierte Subcommand muss auch im switch dispatchen.
    it('registriert alle im SlashCommandBuilder definierten Subcommands auch im Dispatch', () => {
        const definedSubcommands = bashCommand.data.options.map((option) => option.toJSON().name);

        expect(definedSubcommands.sort()).toEqual(['anzahl', 'bearbeiten', 'entfernen', 'hilfe', 'zitat']);
    });

    // Das Hinzufügen läuft bewusst NICHT über einen Subcommand: ein Slash-Command bekommt von
    // Discord keinen Bezug zur zitierten Nachricht (siehe bashSpeichern.kontext.ts).
    it('hat keinen Subcommand zum Hinzufügen', () => {
        const namen = bashCommand.data.options.map((option) => option.toJSON().name);

        expect(namen).not.toContain('hinzufuegen');
    });
});
