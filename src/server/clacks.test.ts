import {describe, it, expect, vi} from 'vitest';
import {setzeClacksHeader} from './clacks.js';

describe('setzeClacksHeader', () => {
    it('setzt den Klacker-Kopf und reicht weiter', () => {
        const res = {setHeader: vi.fn()} as any;
        const next = vi.fn();

        setzeClacksHeader({} as any, res, next);

        expect(res.setHeader).toHaveBeenCalledWith('X-Clacks-Overhead', 'GNU Terry Pratchett');
        expect(next).toHaveBeenCalled();
    });
});
