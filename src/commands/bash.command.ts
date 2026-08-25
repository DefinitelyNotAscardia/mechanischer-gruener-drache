import {ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import bashHandler from '../handlers/bash.handler.js';

// Das HINZUFÜGEN steht bewusst nicht hier: erfasst wird per Rechtsklick auf die Nachricht
// (siehe bashSpeichern.kontext.ts) - ein Slash-Command hat keinen Bezug zur zitierten Nachricht.
export default {
    data: new SlashCommandBuilder()
        .setName('bash')
        .setDescription('Zitatsammlung: gute Sprueche aus dem Chat festhalten und wiederfinden')
        .addSubcommand(sub => sub
            .setName('zitat')
            .setDescription('Zeigt ein zufaelliges Zitat - oder mit Nummer genau das gewuenschte')
            .addIntegerOption(option => option
                .setName('nummer')
                .setDescription('Nummer des Zitats (ohne Angabe: ein zufälliges)')
                .setRequired(false)
                .setMinValue(1)))
        .addSubcommand(sub => sub
            .setName('bearbeiten')
            .setDescription('Wortlaut, Kontext oder Datum eines Zitats aendern')
            .addIntegerOption(option => option
                .setName('nummer')
                .setDescription('Nummer des Zitats')
                .setRequired(true)
                .setMinValue(1)))
        .addSubcommand(sub => sub
            .setName('entfernen')
            .setDescription('Entfernt ein Zitat aus der Sammlung')
            .addIntegerOption(option => option
                .setName('nummer')
                .setDescription('Nummer des Zitats')
                .setRequired(true)
                .setMinValue(1)))
        .addSubcommand(sub => sub
            .setName('hilfe')
            .setDescription('Zeigt alle verfuegbaren Zitat-Befehle')),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'zitat':
                return bashHandler.handleZitat(interaction);
            case 'bearbeiten':
                return bashHandler.handleBearbeiten(interaction);
            case 'entfernen':
                return bashHandler.handleEntfernen(interaction);
            case 'hilfe':
                return bashHandler.handleHilfe(interaction);
        }
    }
};
