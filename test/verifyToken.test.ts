import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPair, SignJWT } from 'jose';

const state = vi.hoisted(() => ({
  privateKey: undefined as unknown as CryptoKey,
  publicKey: undefined as unknown as CryptoKey,
}));

vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>();
  return {
    ...actual,
    createRemoteJWKSet: () => async () => state.publicKey,
  };
});

const { default: verifyToken } = await import('../src/verifyToken.js');

const ISSUER = 'https://appleid.apple.com';
const APP_ID = 'com.example.app';

const sign = async (
  payload: Record<string, unknown>,
  overrides: { issuer?: string; audience?: string; exp?: string } = {},
) => {
  let builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(overrides.issuer ?? ISSUER)
    .setAudience(overrides.audience ?? APP_ID)
    .setIssuedAt()
    .setExpirationTime(overrides.exp ?? '1h');
  return await builder.sign(state.privateKey);
};

beforeAll(async () => {
  const keys = await generateKeyPair('RS256', { extractable: true });
  state.privateKey = keys.privateKey as CryptoKey;
  state.publicKey = keys.publicKey as CryptoKey;
});

describe('verifyToken', () => {
  it('returns the payload for a valid token', async () => {
    const token = await sign({ sub: 'user-123', email: 'a@example.com' });

    const data = await verifyToken({ token, audience: APP_ID });

    expect(data.sub).toBe('user-123');
    expect(data.email).toBe('a@example.com');
    expect(data.aud).toBe(APP_ID);
    expect(data.iss).toBe(ISSUER);
  });

  it('accepts an array of allowed audiences', async () => {
    const token = await sign({ sub: 'user-1' });

    const data = await verifyToken({
      token,
      audience: ['com.other.app', APP_ID],
    });

    expect(data.sub).toBe('user-1');
  });

  it('rejects a token with an unexpected audience', async () => {
    const token = await sign({ sub: 'user-1' }, { audience: 'com.wrong.app' });

    await expect(verifyToken({ token, audience: APP_ID })).rejects.toThrowError(
      /"aud"/,
    );
  });

  it('rejects a token with an unexpected issuer', async () => {
    const token = await sign(
      { sub: 'user-1' },
      { issuer: 'https://evil.example.com' },
    );

    await expect(verifyToken({ token, audience: APP_ID })).rejects.toThrowError(
      /"iss"/,
    );
  });

  it('rejects an expired token', async () => {
    const token = await sign({ sub: 'user-1' }, { exp: '-1s' });

    await expect(verifyToken({ token, audience: APP_ID })).rejects.toThrowError(
      /"exp"/,
    );
  });

  it('rejects a malformed token', async () => {
    await expect(
      verifyToken({ token: 'not-a-jwt', audience: APP_ID }),
    ).rejects.toThrow();
  });
});
