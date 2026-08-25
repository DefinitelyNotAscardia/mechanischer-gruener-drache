import {REST, Routes} from "discord.js";
import config from "../config.json" with {type: "json"};
import commands from './commands/index.js';
import kontextBefehle from './commands/kontextmenues.js';

export async function deployCommands(): Promise<void> {
    try {
        const rest = new REST().setToken(config.BOT_TOKEN);
        // Slash- und Kontextmenü-Befehle gehen in EINEM put an Discord: der Aufruf ersetzt die
        // komplette Guild-Registrierung, ein zweiter put würde den ersten wieder wegräumen.
        const commandData = [
            ...commands.map(cmd => cmd.data.toJSON()),
            ...kontextBefehle.map(cmd => cmd.data.toJSON())
        ];
        const result = await rest.put(
            Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
            {body: commandData}
        ) as unknown[];
        console.log(`${result.length} Commands registriert`);
    } catch (error) {
        console.error("Fehler beim Registrieren der Commands:", error);
    }
}
