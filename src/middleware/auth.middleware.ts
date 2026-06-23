import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import logger from '../utils/logger';

// Extend Express Request so downstream handlers can access the decoded token
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// jwks client is created inside the function — NOT at module level.
function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  const jwksUri = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

  const client = jwksClient({
    jwksUri,
    cache: true,
    cacheMaxAge: 600000,
  });

  client.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      return callback(err || new Error('Signing key not found'));
    }
    callback(null, key.getPublicKey());
  });
}

// Protect a route — must have a valid Cognito Bearer token
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  const issuer = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;

  jwt.verify(
    token,
    getSigningKey,
    {
      algorithms: ['RS256'],
      issuer,
    },
    (err, decoded) => {
      if (err) {
        logger.warn(`JWT verification failed: ${err.message}`);
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
        return;
      }

      req.user = decoded as JwtPayload;
      next();
    }
  );
}