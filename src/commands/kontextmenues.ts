import bashSpeichern from './bashSpeichern.kontext.js';

// Kontextmenü-Befehle sind bewusst NICHT in commands/index.ts: sie haben keine `options` und
// würden die daraus abgeleiteten Hilfe-Tests (flach vs. Gruppe) zum Stolpern bringen. Registriert
// werden sie zusammen mit den Slash-Commands (deploy-commands.ts), verteilt über client.kontextBefehle.
export default [
    bashSpeichern
];
