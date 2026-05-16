import jwt from 'jsonwebtoken';
import type { VerifyOptions, GetPublicKeyOrSecret } from 'jsonwebtoken';
import jwksRsaClient from 'jwks-rsa';
import type { AppleTokenData } from './types.js';

const jwksClient = jwksRsaClient({
  cache: true,
  jwksUri: 'https://appleid.apple.com/auth/keys',
});

const getKey: GetPublicKeyOrSecret = (header, callback) => {
  jwksClient
    .getSigningKey(header.kid)
    .then((key) => {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    })
    .catch((err) => {
      callback(err);
    });
};

const ISSUER = 'https://appleid.apple.com';

const verifyToken = ({
  token,
  audience,
}: {
  token: string;
  audience?: string | string[];
}): Promise<AppleTokenData> => {
  return new Promise((resolve, reject) => {
    const options: VerifyOptions = {
      algorithms: ['RS256'],
      issuer: ISSUER,
    };

    if (audience) {
      options.audience = audience as VerifyOptions['audience'];
    }

    jwt.verify(token, getKey, options, (err, data) => {
      if (err) {
        return reject(err);
      }

      resolve(data as AppleTokenData);
    });
  });
};

export default verifyToken;
