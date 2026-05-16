import {
  AbstractGrantType,
  InvalidArgumentError,
  InvalidRequestError,
  InvalidTokenError,
} from '@node-oauth/oauth2-server';
import type {
  Request,
  Client,
  TokenOptions,
  User,
  Token,
} from '@node-oauth/oauth2-server';
import verifyToken from './verifyToken.js';
import type { AppleTokenData, Model } from './types.js';

export interface Options extends TokenOptions {
  model: Model;
}

export class AppleGrantType extends AbstractGrantType {
  model: Model;
  appIds: string[] = [];

  constructor(options: Options) {
    super(options);

    if (!options.model) {
      throw new InvalidArgumentError('Missing parameter: `model`');
    }

    if (!options.model.getUserWithApple) {
      throw new InvalidArgumentError(
        'Invalid argument: model does not implement `getUserWithApple()`',
      );
    }

    if (!options.model.saveToken) {
      throw new InvalidArgumentError(
        'Invalid argument: model does not implement `saveToken()`',
      );
    }

    this.model = options.model;

    const appId = this.model.appleGrantType?.appId;

    if (appId) {
      this.appIds = Array.isArray(appId) ? appId : [appId];
    }

    if (this.appIds.length === 0) {
      throw new InvalidArgumentError(
        'Invalid argument: Apple valid appId must be provided in options',
      );
    }

    this.handle = this.handle.bind(this);
    this.getUser = this.getUser.bind(this);
    this.saveToken = this.saveToken.bind(this);
  }

  async handle(request: Request, client: Client) {
    if (!request) {
      throw new InvalidArgumentError('Missing parameter: `request`');
    }

    if (!client) {
      throw new InvalidArgumentError('Missing parameter: `client`');
    }

    const scope = this.getScope(request);
    const user = await this.getUser(request);

    return await this.saveToken(user, client, scope);
  }

  async getUser(request: Request) {
    const token = request.body.apple_token;
    const name = request.body.name;

    if (!token) {
      throw new InvalidRequestError('Missing parameter: `apple_token`');
    }

    let data: AppleTokenData;

    try {
      data = await verifyToken({
        token,
        audience: this.appIds,
      });
    } catch {
      throw new InvalidTokenError('Apple id token is invalid or expired');
    }

    return await this.model.getUserWithApple({ name, ...data });
  }

  async saveToken(user: User, client: Client, scope: string[]) {
    const validatedScope = await this.validateScope(user, client, scope);
    const accessToken = await this.generateAccessToken(client, user, scope);
    const refreshToken = await this.generateRefreshToken(client, user, scope);
    const accessTokenExpiresAt = this.getAccessTokenExpiresAt();
    const refreshTokenExpiresAt = this.getRefreshTokenExpiresAt();

    const token: Token = {
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      scope: validatedScope || [],
      user: {
        id: user.id,
      },
      client,
    };

    return await this.model.saveToken(token, client, user);
  }
}
