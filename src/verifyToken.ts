import jwt, { VerifyOptions, GetPublicKeyOrSecret } from 'jsonwebtoken';
import jwksRsaClient from 'jwks-rsa';

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

// jwt only supports callback now
// https://github.com/auth0/node-jsonwebtoken/issues/111
const verifyToken = ({
  token,
  audience,
  ...rest
}: {
  token: string;
  audience?: VerifyOptions['audience'];
}) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: ISSUER,
        audience,
        ...rest,
      },
      (err, data) => {
        if (err) {
          return reject(err);
        }

        resolve(data);
      },
    );
  });
};

export default verifyToken;
