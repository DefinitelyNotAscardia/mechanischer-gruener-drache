import {
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    MessageContextMenuCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';

export interface Command {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<unknown>;
}

// Nachrichten-Kontextmenü ("Apps" im Rechtsklick-Menü). Eigener Typ statt einer Erweiterung von
// Command: die Interaction ist eine andere, und die Definition hat keine `options` - wovon die aus
// der Registrierung abgeleiteten Hilfe-Tests ausgehen.
export interface KontextCommand {
    data: ContextMenuCommandBuilder;
    execute: (interaction: MessageContextMenuCommandInteraction) => Promise<unknown>;
}
