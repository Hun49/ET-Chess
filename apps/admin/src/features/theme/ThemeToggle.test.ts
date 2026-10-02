import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThemeToggle } from './ThemeToggle';
import { useAdminTheme } from './useAdminTheme';

describe('ThemeToggle and useAdminTheme (apps/admin)', () => {
  it('exports ThemeToggle component and useAdminTheme hook', () => {
    expect(ThemeToggle).toBeDefined();
    expect(typeof ThemeToggle).toBe('function');
    expect(useAdminTheme).toBeDefined();
    expect(typeof useAdminTheme).toBe('function');
  });

  it('renders ThemeToggle button with accessible attributes', () => {
    const html = renderToString(React.createElement(ThemeToggle));
    expect(html).toContain('button');
    expect(html).toContain('aria-label');
    expect(html).toContain('mode');
  });
});
