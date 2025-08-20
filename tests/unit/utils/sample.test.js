import { describe, it, expect } from 'vitest';

describe('Basic test setup', () => {
  it('should verify Vitest is working', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async functions', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it('should handle Hebrew text correctly', () => {
    const text = 'שלום עולם';
    expect(text).toBe('שלום עולם');
    expect(text.length).toBe(9);
  });
});