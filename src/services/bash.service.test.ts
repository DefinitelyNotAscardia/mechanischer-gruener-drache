import {describe, it, expect, vi, beforeEach} from 'vitest';

const redis = vi.hoisted(() => ({
    increment: vi.fn(),
    setHashField: vi.fn(),
    getHashAll: vi.fn(),
    deleteHashField: vi.fn(),
}));
vi.mock('./redis.service.js', () => ({default: redis}));

import bashService, {BashZitat, parseIsoDatum} from './bash.service.js';

const zitat = (nummer: number, overrides: Partial<BashZitat> = {}): BashZitat => ({
    nummer,
    text: `Zitat ${nummer}`,
    personId: 'p1',
    kontext: null,
    datum: null,
    erstellerId: 'e1',
    erstelltAm: '2026-08-25T10:00:00.000Z',
    quelle: null,
    ...overrides,
});

describe('BashService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('vergibt die Nummer per INCR und legt das Zitat unter dieser Nummer ab', async () => {
        redis.increment.mockResolvedValue(7);

        const gespeichert = await bashService.speichereNeu({
            text: 'Ein Spruch',
            personId: 'p1',
            kontext: '#plauderei',
            datum: '2026-03-12',
            erstellerId: 'e1',
            erstelltAm: '2026-08-25T10:00:00.000Z',
            quelle: {channelId: 'c1', messageId: 'm1'},
        });

        expect(redis.increment).toHaveBeenCalledWith('BASH:NAECHSTE_NUMMER');
        expect(gespeichert.nummer).toBe(7);
        const [key, feld, roh] = redis.setHashField.mock.calls[0];
        expect(key).toBe('BASH:ZITATE');
        expect(feld).toBe('7');
        expect(JSON.parse(roh)).toMatchObject({nummer: 7, text: 'Ein Spruch', personId: 'p1'});
    });

    // Die zentrale Zusage des Features: eine gelöschte Nummer wird nicht neu vergeben, sonst zeigte
    // ein Verweis auf "Zitat 3" im Chat später etwas völlig anderes. Der Zähler läuft dem Bestand
    // deshalb bewusst davon.
    it('vergibt nach dem Entfernen die freie Nummer nicht erneut', async () => {
        redis.increment.mockResolvedValue(4);

        const neu = await bashService.speichereNeu({...zitat(0)});

        expect(neu.nummer).toBe(4);
        expect(redis.increment).toHaveBeenCalledTimes(1);
    });

    it('liefert alle Zitate aufsteigend nach Nummer', async () => {
        redis.getHashAll.mockResolvedValue({
            '10': JSON.stringify(zitat(10)),
            '2': JSON.stringify(zitat(2)),
        });

        expect((await bashService.holeAlle()).map(z => z.nummer)).toEqual([2, 10]);
    });

    it('überspringt unlesbare Einträge, statt die ganze Liste zu verlieren', async () => {
        redis.getHashAll.mockResolvedValue({
            '1': JSON.stringify(zitat(1)),
            '2': '{kaputt',
            '3': JSON.stringify({text: 'ohne Person'}),
        });

        expect((await bashService.holeAlle()).map(z => z.nummer)).toEqual([1]);
    });

    it('holt ein Zitat nach Nummer und null bei einer freien Nummer', async () => {
        redis.getHashAll.mockResolvedValue({'5': JSON.stringify(zitat(5))});

        expect(await bashService.hole(5)).toMatchObject({nummer: 5});
        expect(await bashService.hole(6)).toBeNull();
    });

    it('findet ein Zitat über die Herkunftsnachricht (Doppelt-Speichern-Bremse)', async () => {
        redis.getHashAll.mockResolvedValue({
            '1': JSON.stringify(zitat(1, {quelle: {channelId: 'c1', messageId: 'm1'}})),
        });

        expect(await bashService.findeNachNachricht('m1')).toMatchObject({nummer: 1});
        expect(await bashService.findeNachNachricht('m2')).toBeNull();
    });

    it('ändert beim Aktualisieren nur Wortlaut, Kontext und Datum', async () => {
        redis.getHashAll.mockResolvedValue({
            '3': JSON.stringify(zitat(3, {personId: 'p1', erstellerId: 'e1'})),
        });

        const neu = await bashService.aktualisiere(3, {text: 'neu', kontext: 'Sprachkanal', datum: '2026-01-02'});

        expect(neu).toMatchObject({nummer: 3, text: 'neu', personId: 'p1', erstellerId: 'e1'});
        expect(JSON.parse(redis.setHashField.mock.calls[0][2])).toMatchObject({text: 'neu', personId: 'p1'});
    });

    it('meldet null beim Aktualisieren einer nicht mehr vorhandenen Nummer', async () => {
        redis.getHashAll.mockResolvedValue({});

        expect(await bashService.aktualisiere(3, {text: 'neu', kontext: null, datum: null})).toBeNull();
        expect(redis.setHashField).not.toHaveBeenCalled();
    });

    it('entfernt ein Zitat aus dem Hash', async () => {
        await bashService.entferne(9);
        expect(redis.deleteHashField).toHaveBeenCalledWith('BASH:ZITATE', '9');
    });

    it('zieht ein zufälliges Zitat und meldet null bei leerer Sammlung', async () => {
        redis.getHashAll.mockResolvedValue({});
        expect(await bashService.holeZufaellig()).toBeNull();

        redis.getHashAll.mockResolvedValue({'1': JSON.stringify(zitat(1))});
        expect(await bashService.holeZufaellig()).toMatchObject({nummer: 1});
    });
});

describe('parseIsoDatum', () => {
    it('nimmt ein gültiges ISO-Datum an', () => {
        expect(parseIsoDatum('2026-03-12')).toEqual({ok: true, wert: '2026-03-12'});
    });

    it('deutet Leereingabe als bewusst kein Datum', () => {
        expect(parseIsoDatum('   ')).toEqual({ok: true, wert: null});
    });

    // Round-Trip-Check: ohne ihn würde new Date() den 31.02. still zum 03.03. machen - ein falsches
    // Datum am Zitat wäre schlimmer als gar keins.
    it('lehnt einen nicht existierenden Tag ab, statt ihn zu normalisieren', () => {
        expect(parseIsoDatum('2026-02-31')).toEqual({ok: false});
    });

    it('lehnt fremde Formate ab', () => {
        expect(parseIsoDatum('12.03.2026')).toEqual({ok: false});
    });
});
