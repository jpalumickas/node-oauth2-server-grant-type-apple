import type {
  AuthorizationCodeModel,
  ClientCredentialsModel,
  RefreshTokenModel,
  PasswordModel,
  ExtensionModel,
  User,
} from '@node-oauth/oauth2-server';

type Oauth2ServerModel =
  | AuthorizationCodeModel
  | ClientCredentialsModel
  | RefreshTokenModel
  | PasswordModel
  | ExtensionModel;

export type AppleTokenData = {
  sub: string;
  aud: string;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
  name?: string;
  [key: string]: unknown;
};

export type Model = Oauth2ServerModel & {
  appleGrantType: {
    appId: string | string[];
  };
  getUserWithApple: (data: AppleTokenData) => Promise<User>;
};
