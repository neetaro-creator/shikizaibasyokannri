import { expect, it } from 'vitest';
import { parseHash } from './router';

it('parses item route', () => {
  expect(parseHash('#/item/i0001')).toMatchObject({ name: 'item', id: 'i0001' });
});

it('broken percent-escape does not throw and falls back to search', () => {
  expect(() => parseHash('#/item/%E3%8')).not.toThrow();
  expect(parseHash('#/item/%E3%8').name).toBe('search');
});
