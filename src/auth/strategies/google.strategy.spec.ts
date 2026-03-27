import { UnauthorizedException } from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  const mockConfig = {
    google: {
      googleClientId: 'client-id',
      googleClientSecret: 'client-secret',
      googleCallbackUrl: 'http://localhost:3000/auth/google/callback',
    },
    env: {
      cookieSecure: false,
    },
  };

  it('uses cookie-backed state store for OAuth state validation', () => {
    const strategy = new GoogleStrategy(mockConfig as never);
    const internalStrategy = strategy as unknown as {
      _stateStore?: { verify?: unknown };
    };

    expect(internalStrategy._stateStore).toBeDefined();
    expect(typeof internalStrategy._stateStore?.verify).toBe('function');
  });

  it('throws UnauthorizedException when Google profile has no email', () => {
    const strategy = new GoogleStrategy(mockConfig as never);

    expect(() =>
      strategy.validate('access', 'refresh', {
        id: 'google-id',
        emails: [],
        photos: [],
        displayName: 'User',
        provider: 'google',
        profileUrl: '',
        _raw: '',
        _json: {},
      }),
    ).toThrow(UnauthorizedException);
  });
});
