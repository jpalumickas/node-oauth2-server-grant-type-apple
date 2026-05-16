import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AppleTokenData } from './types.js';

const JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

const ISSUER = 'https://appleid.apple.com';

const verifyToken = async ({
  token,
  audience,
}: {
  token: string;
  audience?: string | string[];
}): Promise<AppleTokenData> => {
  const { payload } = await jwtVerify(token, JWKS, {
    algorithms: ['RS256'],
    issuer: ISSUER,
    audience,
  });

  return payload as AppleTokenData;
};

export default verifyToken;
