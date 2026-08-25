import redisService from './redis.service.js';

// Zitatsammlung ("Bash", nach dem Vorbild der Twitch-!quote-Funktion): Wer im Chat etwas Gutes
// sagt, wird per Rechtsklick auf die Nachricht (Apps → "Als Bash-Zitat speichern") verewigt.
// Jedes Zitat bekommt eine fortlaufende NUMMER, über die es später zitierbar ist.
//
// Die Nummern werden NIE neu vergeben: nach einem Entfernen bleibt die Lücke stehen. Sonst zeigte
// "Zitat 69" nach der nächsten Löschung etwas anderes, und jeder Verweis darauf im Chat wäre still
// falsch geworden. Der Zähler zählt deshalb unabhängig vom Bestand hoch.
//
// Gespeichert wird echter Nachrichteninhalt, und zwar dauerhaft - die einzige Ausnahme von der
// TTL-Leitplanke in docs/datenhaltung.md. Sie ist vertretbar, weil ein Mensch sie bewusst auslöst
// (kein automatisches Mitschreiben) und die zitierte Person ihr Zitat selbst löschen darf.

export interface BashZitat {
    nummer: number;
    text: string;
    // Discord-User-ID des Zitierten. Bewusst die ID statt eines abgetippten Namens: nur so ist
    // "die zitierte Person darf ihr Zitat löschen" überhaupt prüfbar, und die Anzeige bleibt beim
    // aktuellen Anzeigenamen, statt einen alten Namen zu konservieren.
    personId: string;
    kontext: string | null;
    // ISO 'YYYY-MM-DD' - sortierbar und eindeutig, die deutsche Anzeige baut der Handler.
    datum: string | null;
    erstellerId: string;
    erstelltAm: string;
    // Herkunftsnachricht, für den Sprunglink in der Admin-Übersicht ("stimmt das so?").
    quelle: {channelId: string; messageId: string} | null;
}

export type NeuesBashZitat = Omit<BashZitat, 'nummer'>;
// Was sich nachträglich ändern lässt: der Wortlaut und die Umstände. Person und Ersteller nicht -
// daran hängen die Rechte, und die Herkunft soll nicht umschreibbar sein.
export type BashAenderung = Pick<BashZitat, 'text' | 'kontext' | 'datum'>;

const KEYS = {
    // Hash: Nummer (als String) → JSON des Zitats.
    zitate: 'BASH:ZITATE',
    // Reiner Zähler. Läuft dem Bestand voraus, sobald etwas gelöscht wurde - genau so gewollt.
    zaehler: 'BASH:NAECHSTE_NUMMER',
};

// Ein kaputter Eintrag (von Hand in Redis gepfuscht, halb geschriebenes JSON) soll die ganze Liste
// nicht mitreißen - Muster wie parseGespeichert im Geburtstags-Service: null statt throw.
function parseZitat(nummer: string, roh: string): BashZitat | null {
    try {
        const daten = JSON.parse(roh) as Partial<BashZitat>;
        if (typeof daten.text !== 'string' || typeof daten.personId !== 'string') {
            return null;
        }
        return {
            nummer: Number(nummer),
            text: daten.text,
            personId: daten.personId,
            kontext: typeof daten.kontext === 'string' ? daten.kontext : null,
            datum: typeof daten.datum === 'string' ? daten.datum : null,
            erstellerId: typeof daten.erstellerId === 'string' ? daten.erstellerId : '',
            erstelltAm: typeof daten.erstelltAm === 'string' ? daten.erstelltAm : '',
            quelle: daten.quelle && typeof daten.quelle.channelId === 'string' && typeof daten.quelle.messageId === 'string'
                ? {channelId: daten.quelle.channelId, messageId: daten.quelle.messageId}
                : null,
        };
    } catch {
        console.warn(`Unlesbares Bash-Zitat #${nummer} - wird übersprungen.`);
        return null;
    }
}

// Prüft eine ISO-Datumseingabe (so liefert das <input type="date"> auf /config) mit
// Round-Trip-Check, damit ein 2026-02-31 nicht still zum 03.03. normalisiert wird. Leer = bewusst
// kein Datum. Die deutsche Schreibweise aus dem Discord-Formular parst der Handler.
export function parseIsoDatum(eingabe: string): {ok: true; wert: string | null} | {ok: false} {
    const roh = eingabe.trim();
    if (!roh) {
        return {ok: true, wert: null};
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(roh)) {
        return {ok: false};
    }
    const datum = new Date(`${roh}T00:00:00Z`);
    return Number.isNaN(datum.getTime()) || datum.toISOString().slice(0, 10) !== roh
        ? {ok: false}
        : {ok: true, wert: roh};
}

class BashService {
    // Vergibt die Nummer und legt an. INCR macht Hochzählen und Lesen in einem Schritt, damit zwei
    // gleichzeitige Speicherungen nicht dieselbe Nummer bekommen.
    async speichereNeu(daten: NeuesBashZitat): Promise<BashZitat> {
        const nummer = await redisService.increment(KEYS.zaehler);
        const zitat: BashZitat = {...daten, nummer};
        await redisService.setHashField(KEYS.zitate, String(nummer), JSON.stringify(zitat));
        return zitat;
    }

    async hole(nummer: number): Promise<BashZitat | null> {
        const alle = await redisService.getHashAll(KEYS.zitate);
        const roh = alle[String(nummer)];
        return roh === undefined ? null : parseZitat(String(nummer), roh);
    }

    // Aufsteigend nach Nummer - die Reihenfolge im Redis-Hash ist keine.
    async holeAlle(): Promise<BashZitat[]> {
        const alle = await redisService.getHashAll(KEYS.zitate);
        return Object.entries(alle)
            .map(([nummer, roh]) => parseZitat(nummer, roh))
            .filter((zitat): zitat is BashZitat => zitat !== null)
            .sort((a, b) => a.nummer - b.nummer);
    }

    async holeZufaellig(): Promise<BashZitat | null> {
        const alle = await this.holeAlle();
        if (!alle.length) {
            return null;
        }
        return alle[Math.floor(Math.random() * alle.length)];
    }

    // Für die Doppelt-Speichern-Bremse: dieselbe Nachricht soll nicht zweimal in der Sammlung landen.
    async findeNachNachricht(messageId: string): Promise<BashZitat | null> {
        const alle = await this.holeAlle();
        return alle.find(zitat => zitat.quelle?.messageId === messageId) ?? null;
    }

    // Ändert nur Wortlaut/Umstände; Nummer, Person, Ersteller und Herkunft bleiben stehen.
    async aktualisiere(nummer: number, aenderung: BashAenderung): Promise<BashZitat | null> {
        const vorhanden = await this.hole(nummer);
        if (!vorhanden) {
            return null;
        }
        const neu: BashZitat = {...vorhanden, ...aenderung};
        await redisService.setHashField(KEYS.zitate, String(nummer), JSON.stringify(neu));
        return neu;
    }

    async entferne(nummer: number): Promise<void> {
        await redisService.deleteHashField(KEYS.zitate, String(nummer));
    }

    async anzahl(): Promise<number> {
        return (await this.holeAlle()).length;
    }
}

export default new BashService();
