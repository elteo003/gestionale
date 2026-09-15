import { describe, expect, it, beforeEach } from 'vitest';
import { getApiUrl, getWsUrl } from './client';

describe('api client', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('normalizza api url', () => {
        localStorage.setItem('customApiUrl', 'http://localhost:3000/');
        expect(getApiUrl()).toBe('http://localhost:3000');
    });

    it('deriva ws url da http', () => {
        localStorage.setItem('customApiUrl', 'http://localhost:3000/');
        expect(getWsUrl()).toBe('ws://localhost:3000/ws');
    });
});
