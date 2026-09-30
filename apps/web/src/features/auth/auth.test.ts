import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as authClientModule from '../../lib/auth-client';
import { authClient, signIn, signOut, signUp, useSession } from '../../lib/auth-client';
import { AuthButton } from './AuthButton';
import { AuthModal } from './AuthModal';

describe('Web Client Better Auth (apps/web)', () => {
  it('initializes authClient with expected methods', () => {
    expect(authClient).toBeDefined();
    expect(typeof signIn).toBe('function');
    expect(typeof signUp).toBe('function');
    expect(typeof signOut).toBe('function');
    expect(typeof useSession).toBe('function');
  });

  it('exports AuthModal and AuthButton components', () => {
    expect(AuthModal).toBeDefined();
    expect(typeof AuthModal).toBe('function');
    expect(AuthButton).toBeDefined();
    expect(typeof AuthButton).toBe('function');
  });

  it('AuthModal returns empty string when isOpen is false', () => {
    const html = renderToString(
      React.createElement(AuthModal, { isOpen: false, onClose: () => {} }),
    );
    expect(html).toBe('');
  });

  it('AuthModal renders modal markup when isOpen is true', () => {
    const html = renderToString(
      React.createElement(AuthModal, {
        isOpen: true,
        onClose: () => {},
        defaultMode: 'signin',
      }),
    );
    expect(html).toContain('Welcome Back');
    expect(html).toContain('Sign In');
    expect(html).toContain('Email Address');
    expect(html).toContain('Password');
  });

  it('AuthModal renders Create Account mode correctly', () => {
    const html = renderToString(
      React.createElement(AuthModal, {
        isOpen: true,
        onClose: () => {},
        defaultMode: 'signup',
      }),
    );
    expect(html).toContain('Create an Account');
    expect(html).toContain('Display Name');
    expect(html).toContain('Email Address');
  });

  it('AuthButton renders loading pulse skeleton when session is pending', () => {
    const html = renderToString(React.createElement(AuthButton));
    expect(html).toContain('animate-pulse');
  });

  it('AuthButton renders user info when session is authenticated', () => {
    vi.spyOn(authClientModule, 'useSession').mockReturnValue({
      data: {
        user: {
          id: 'usr-1',
          name: 'Grandmaster Magnus',
          email: 'magnus@chess.com',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 'sess-1',
          token: 'token-1',
          userId: 'usr-1',
          expiresAt: new Date(Date.now() + 3600000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSession>);

    const html = renderToString(React.createElement(AuthButton));
    expect(html).toContain('Grandmaster Magnus');
    expect(html).toContain('Sign Out');

    vi.restoreAllMocks();
  });

  it('AuthButton renders Sign In button when session is null and not pending', () => {
    vi.spyOn(authClientModule, 'useSession').mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSession>);

    const html = renderToString(React.createElement(AuthButton));
    expect(html).toContain('Sign In');

    vi.restoreAllMocks();
  });
});
