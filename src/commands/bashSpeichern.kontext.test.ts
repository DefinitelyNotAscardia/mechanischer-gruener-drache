import {describe, it, expect, vi, beforeEach} from 'vitest';
import {ApplicationCommandType} from 'discord.js';

vi.mock('../handlers/bash.handler.js', () => ({
    default: {handleNachrichtSpeichern: vi.fn()}
}));

import bashHandler from '../handlers/bash.handler.js';
import bashSpeichern from './bashSpeichern.kontext.js';
import kontextBefehle from './kontextmenues.js';

describe('bashSpeichern.kontext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ist ein Nachrichten-Kontextmenü (kein Slash-Command)', () => {
        const json = bashSpeichern.data.toJSON();

        expect(json.type).toBe(ApplicationCommandType.Message);
        expect(json.name).toBe('Als Bash-Zitat speichern');
    });

    it('leitet an den Handler weiter', async () => {
        const interaction = {} as any;

        await bashSpeichern.execute(interaction);

        expect(bashHandler.handleNachrichtSpeichern).toHaveBeenCalledWith(interaction);
    });

    // Ohne Eintrag in dieser Liste wird der Menüpunkt nie bei Discord registriert und taucht im
    // Rechtsklick-Menü gar nicht auf.
    it('ist zur Registrierung angemeldet', () => {
        expect(kontextBefehle).toContain(bashSpeichern);
    });
});
