import {
  AuthorizationCodeModel,
  ClientCredentialsModel,
  RefreshTokenModel,
  PasswordModel,
  ExtensionModel,
  User,
} from 'oauth2-server';

type Oauth2ServerModel =
  | AuthorizationCodeModel
  | ClientCredentialsModel
  | RefreshTokenModel
  | PasswordModel
  | ExtensionModel;

export type Model = Oauth2ServerModel & {
  appleGrantType: {
    appId: string | string[];
  };
  getUserWithApple: (opts: { name: string }) => User;
};
