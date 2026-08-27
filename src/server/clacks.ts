import {Request, Response} from 'express';

// "A man is not dead while his name is still spoken." - Terry Pratchett (gest. 2015).
// In der Scheibenwelt haelt der Signalcode GNU einen Namen in den Klackertuermen im Umlauf,
// statt ihn zuzustellen; im Netz macht das dieser Kopf. Er wird von niemandem ausgewertet und
// aendert an keiner Antwort etwas - er faehrt einfach mit. Siehe https://gnuterrypratchett.com/
//
// Benannt exportiert wie setzeAdminHeader in config.router.ts, damit der Test ihn direkt mit
// Mock-req/res aufrufen kann (kein supertest im Projekt).
export function setzeClacksHeader(_req: Request, res: Response, next: () => void): void {
    res.setHeader('X-Clacks-Overhead', 'GNU Terry Pratchett');
    next();
}
