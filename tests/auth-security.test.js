import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../server/middleware/auth';

describe('Authentication & Token Security', () => {
  it('signs and verifies valid JWT access tokens', () => {
    const payload = { id: 1, username: 'thoen_admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.id).toBe(1);
    expect(decoded.username).toBe('thoen_admin');
  });

  it('rejects tampered or malformed tokens', () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.tamperedSignature';
    expect(() => jwt.verify(fakeToken, JWT_SECRET)).toThrow();
  });
});
