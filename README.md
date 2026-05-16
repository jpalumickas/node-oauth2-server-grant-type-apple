# OAuth2 Server Apple Grant Type

Adds Apple grant type for [@node-oauth/oauth2-server][oauth2-server]

## Installation

Using pnpm

```sh
pnpm add oauth2-server-grant-type-apple
```

Using npm

```sh
npm install oauth2-server-grant-type-apple
```

## Usage

Add `getUserWithApple` to [@node-oauth/oauth2-server][oauth2-server] model.

```js
  const getUserWithApple = async (appleData) => {
    // Find and return user by Apple ID (sub in appleData)

    // Find and return user by Apple email

    // If not exists create new user
  };
```

Add Apple grant type to `extendedGrantTypes` in [@node-oauth/oauth2-server][oauth2-server] options:

```js
  import { AppleGrantType } from 'oauth2-server-grant-type-apple';

  const options = {
    model: ...,
    extendedGrantTypes: {
      apple: AppleGrantType,
    },
    requireClientAuthentication: {
      apple: false,
    },
  }
```

You need to provide Apple App ID in model `appleGrantType`:

```js
const options = {
  model: {
    ...model,
    appleGrantType: {
      appId: 'com.example.apple.login' // Array also supported
    },
  },
  extendedGrantTypes,
}
```

Post request to `/oauth/token` with `apple` grant type and provided token:

```json
{
  "grant_type": "apple",
  "client_id": "YOUR_CLIENT_ID",
  "apple_token": "APPLE_JWT_TOKEN",
  "name": "User full name"
}
```

## License

The package is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

[oauth2-server]: https://github.com/node-oauth/node-oauth2-server
