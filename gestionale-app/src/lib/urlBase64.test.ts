import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array } from './urlBase64';

describe('urlBase64ToUint8Array', () => {
    it('decodifica una chiave URL-safe', () => {
        const bytes = urlBase64ToUint8Array('AQID');
        expect(Array.from(bytes)).toEqual([1, 2, 3]);
    });
});
