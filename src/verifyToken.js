import jwt from 'jsonwebtoken';
import jwksRsaClient from 'jwks-rsa';

const jwksClient = jwksRsaClient({
  cache: true,
  jwksUri: 'https://appleid.apple.com/auth/keys',
});

const getKey = (header, callback) => {
  jwksClient.getSigningKeyAsync(header.kid, (err, key) => {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
};

const ISSUER = 'https://appleid.apple.com';

// jwt only supports callback now
// https://github.com/auth0/node-jsonwebtoken/issues/111
const verifyToken = ({ token, ...rest }) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithm: 'RS256',
        issuer: ISSUER,
        ...rest,
      },
      (err, data) => {
        if (err) {
          return reject(err);
        }

        resolve(data);
      }
    );
  });
};

export default verifyToken;
