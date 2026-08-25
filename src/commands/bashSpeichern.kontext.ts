import {ApplicationCommandType, ContextMenuCommandBuilder, MessageContextMenuCommandInteraction} from 'discord.js';
import bashHandler from '../handlers/bash.handler.js';

// Nachrichten-Kontextmenü (Rechtsklick auf eine Nachricht → Apps, mobil: gedrückt halten). Der
// einzige Weg, ein Zitat anzulegen - siehe bash.handler.ts, warum es kein Slash-Befehl ist.
// Der Name ist das, was im Menü steht, deshalb hier ausnahmsweise Groß-/Kleinschreibung samt
// Leerzeichen (Discord erlaubt das bei Kontextmenü-Einträgen, anders als bei Slash-Namen).
export default {
    data: new ContextMenuCommandBuilder()
        .setName('Als Bash-Zitat speichern')
        .setType(ApplicationCommandType.Message),

    async execute(interaction: MessageContextMenuCommandInteraction) {
        return bashHandler.handleNachrichtSpeichern(interaction);
    }
};
