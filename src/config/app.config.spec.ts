import appConfig from './app.config';

describe('appConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when GOOGLE_CLIENT_ID is missing', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = 'secret';

    expect(() => appConfig()).toThrow(
      'GOOGLE_CLIENT_ID is required for Google OAuth configuration',
    );
  });

  it('throws when GOOGLE_CLIENT_SECRET is missing', () => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    delete process.env.GOOGLE_CLIENT_SECRET;

    expect(() => appConfig()).toThrow(
      'GOOGLE_CLIENT_SECRET is required for Google OAuth configuration',
    );
  });

  it('loads config successfully when required Google vars are present', () => {
    process.env.GOOGLE_CLIENT_ID = 'id';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';

    const config = appConfig();
    expect(config.google.googleClientId).toBe('id');
    expect(config.google.googleClientSecret).toBe('secret');
  });
});
