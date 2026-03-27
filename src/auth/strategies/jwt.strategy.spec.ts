import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const mockConfig = {
    jwt: {
      secret: 'secret',
    },
  };

  it('returns payload when shape is valid', () => {
    const strategy = new JwtStrategy(mockConfig as never);
    const payload = {
      sub: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
      roles: ['USER'],
    };

    expect(strategy.validate(payload)).toEqual(payload);
  });

  it('throws UnauthorizedException for malformed payload', () => {
    const strategy = new JwtStrategy(mockConfig as never);

    expect(() =>
      strategy.validate({
        sub: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        roles: [123] as unknown as string[],
      }),
    ).toThrow(UnauthorizedException);
  });
});
