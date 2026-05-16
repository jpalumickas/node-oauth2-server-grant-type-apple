import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InvalidArgumentError,
  InvalidRequestError,
  InvalidTokenError,
} from '@node-oauth/oauth2-server';
import type { Request, Client, User } from '@node-oauth/oauth2-server';

import type { AppleTokenData, Model } from '../src/types.js';

vi.mock('../src/verify-token.js', () => ({
  verifyToken: vi.fn(),
}));

const { verifyToken } = await import('../src/verify-token.js');
const { AppleGrantType } = await import('../src/apple-grant-type.js');

const APP_ID = 'com.example.app';

const buildModel = (overrides: Partial<Model> = {}): Model =>
  ({
    appleGrantType: { appId: APP_ID },
    getUserWithApple: vi.fn(async () => ({ id: 'user-1' }) as User),
    saveToken: vi.fn(async (token, client, user) => ({
      ...token,
      user,
    })),
    getClient: vi.fn(),
    ...overrides,
  }) as Model;

const buildOptions = (model: Model = buildModel()) => ({
  accessTokenLifetime: 3600,
  refreshTokenLifetime: 1209600,
  model,
});

const buildRequest = (body: Record<string, unknown> = {}) =>
  ({
    body,
    headers: {},
    method: 'POST',
    query: {},
  }) as unknown as Request;

const CLIENT: Client = { id: 'client-1', grants: ['apple'] };

beforeEach(() => {
  vi.mocked(verifyToken).mockReset();
});

describe('AppleGrantType constructor', () => {
  it('throws if no model is provided', () => {
    expect(
      () =>
        new AppleGrantType({
          accessTokenLifetime: 3600,
          refreshTokenLifetime: 1209600,
        } as never),
    ).toThrow(InvalidArgumentError);
  });

  it('throws if model does not implement getUserWithApple', () => {
    const model = buildModel();
    delete (model as Partial<Model>).getUserWithApple;

    expect(() => new AppleGrantType(buildOptions(model))).toThrow(
      /getUserWithApple/,
    );
  });

  it('throws if model does not implement saveToken', () => {
    const model = buildModel();
    delete (model as Partial<Model>).saveToken;

    expect(() => new AppleGrantType(buildOptions(model))).toThrow(/saveToken/);
  });

  it('throws if appleGrantType.appId is missing', () => {
    const model = buildModel({
      appleGrantType: { appId: undefined as unknown as string },
    });

    expect(() => new AppleGrantType(buildOptions(model))).toThrow(/appId/);
  });

  it('throws if appleGrantType.appId is an empty array', () => {
    const model = buildModel({ appleGrantType: { appId: [] } });

    expect(() => new AppleGrantType(buildOptions(model))).toThrow(/appId/);
  });

  it('accepts a single appId string', () => {
    const grant = new AppleGrantType(buildOptions());

    expect(grant.appIds).toEqual([APP_ID]);
  });

  it('accepts an array of appIds', () => {
    const ids = ['com.example.app', 'com.example.app.dev'];
    const model = buildModel({ appleGrantType: { appId: ids } });

    const grant = new AppleGrantType(buildOptions(model));

    expect(grant.appIds).toEqual(ids);
  });
});

describe('AppleGrantType.handle', () => {
  it('throws if request is missing', async () => {
    const grant = new AppleGrantType(buildOptions());

    await expect(grant.handle(undefined as never, CLIENT)).rejects.toThrow(
      InvalidArgumentError,
    );
  });

  it('throws if client is missing', async () => {
    const grant = new AppleGrantType(buildOptions());

    await expect(
      grant.handle(buildRequest({ apple_token: 't' }), undefined as never),
    ).rejects.toThrow(InvalidArgumentError);
  });

  it('verifies the token, fetches the user, and saves a token', async () => {
    const tokenData: AppleTokenData = {
      sub: 'apple-sub-1',
      aud: APP_ID,
      email: 'a@example.com',
    };
    vi.mocked(verifyToken).mockResolvedValue(tokenData);

    const model = buildModel();
    const grant = new AppleGrantType(buildOptions(model));

    const request = buildRequest({ apple_token: 'tok', name: 'Alice' });
    await grant.handle(request, CLIENT);

    expect(verifyToken).toHaveBeenCalledWith({
      token: 'tok',
      audience: [APP_ID],
    });
    expect(model.getUserWithApple).toHaveBeenCalledWith({
      name: 'Alice',
      ...tokenData,
    });
    expect(model.saveToken).toHaveBeenCalledOnce();

    const [savedToken, savedClient, savedUser] = vi.mocked(model.saveToken).mock
      .calls[0];
    expect(savedToken.user).toEqual({ id: 'user-1' });
    expect(savedToken.client).toBe(CLIENT);
    expect(savedToken.accessToken).toBeDefined();
    expect(savedToken.refreshToken).toBeDefined();
    expect(savedToken.accessTokenExpiresAt).toBeInstanceOf(Date);
    expect(savedClient).toBe(CLIENT);
    expect(savedUser).toEqual({ id: 'user-1' });
  });
});

describe('AppleGrantType.getUser', () => {
  it('throws InvalidRequestError if apple_token is missing', async () => {
    const grant = new AppleGrantType(buildOptions());

    await expect(grant.getUser(buildRequest())).rejects.toThrow(
      InvalidRequestError,
    );
  });

  it('throws InvalidTokenError when verifyToken fails', async () => {
    vi.mocked(verifyToken).mockRejectedValue(new Error('bad signature'));

    const grant = new AppleGrantType(buildOptions());

    await expect(
      grant.getUser(buildRequest({ apple_token: 'bad' })),
    ).rejects.toThrow(InvalidTokenError);
  });

  it('passes name from request body alongside verified data', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'apple-sub',
      aud: APP_ID,
    });

    const model = buildModel();
    const grant = new AppleGrantType(buildOptions(model));

    await grant.getUser(buildRequest({ apple_token: 'tok', name: 'Bob' }));

    expect(model.getUserWithApple).toHaveBeenCalledWith({
      name: 'Bob',
      sub: 'apple-sub',
      aud: APP_ID,
    });
  });
});

describe('AppleGrantType.saveToken', () => {
  it('only persists user.id on the token', async () => {
    const model = buildModel();
    const grant = new AppleGrantType(buildOptions(model));

    const user: User = { id: 'user-42', email: 'secret@example.com' };
    await grant.saveToken(user, CLIENT, ['read']);

    const tokenArg = vi.mocked(model.saveToken).mock.calls[0][0];
    expect(tokenArg.user).toEqual({ id: 'user-42' });
    expect(tokenArg.user).not.toHaveProperty('email');
  });
});
