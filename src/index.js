import {
  AbstractGrantType,
  InvalidArgumentError,
  InvalidRequestError,
  InvalidTokenError,
} from 'oauth2-server';
import verifyToken from './verifyToken';

class AppleGrantType extends AbstractGrantType {
  constructor(options = {}) {
    super(options);

    if (!options.model) {
      throw new InvalidArgumentError('Missing parameter: `model`');
    }

    if (!options.model.getUserWithApple) {
      throw new InvalidArgumentError(
        'Invalid argument: model does not implement `getUserWithApple()`'
      );
    }

    const appId = this.model.appleGrantType?.appId;

    if (appId) {
      this.appIds = Array.isArray(appId) ? appId : Array(appId);
    }

    if (!this.appIds) {
      throw new InvalidArgumentError(
        'Invalid argument: Apple valid appId must be provided in grant type options'
      );
    }

    if (!options.model.saveToken) {
      throw new InvalidArgumentError(
        'Invalid argument: model does not implement `saveToken()`'
      );
    }

    this.handle = this.handle.bind(this);
    this.getUser = this.getUser.bind(this);
    this.saveToken = this.saveToken.bind(this);
  }

  async handle(request, client) {
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

  async getUser(request) {
    const token = request.body.apple_token;
    const name = request.body.name;

    if (!token) {
      throw new InvalidRequestError('Missing parameter: `apple_token`');
    }

    let data;

    try {
      data = await verifyToken({
        token,
        audience: this.appIds,
      });
    } catch (err) {
      console.error(err);
      throw new InvalidTokenError('Apple token is invalid or expired');
    }

    return await this.model.getUserWithApple({ name, ...data });
  }

  async saveToken(user, client, scope) {
    const scopeData = await this.validateScope(user, client, scope);
    const accessToken = await this.generateAccessToken(client, user, scope);
    const refreshToken = await this.generateRefreshToken(client, user, scope);
    const accessTokenExpiresAt = this.getAccessTokenExpiresAt();
    const refreshTokenExpiresAt = await this.getRefreshTokenExpiresAt();

    const token = {
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      scope: scopeData,
    };

    return await this.model.saveToken(token, client, user);
  }
}

export default AppleGrantType;
