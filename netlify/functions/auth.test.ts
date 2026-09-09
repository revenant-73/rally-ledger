import { afterEach, describe, expect, it } from 'vitest';
import { isInvitedAccountClaim, isSignupAllowed } from './auth';

const originalAllowSignup = process.env.AUTH_ALLOW_SIGNUP;
const originalAllowedEmails = process.env.AUTH_ALLOWED_EMAILS;

afterEach(() => {
  if (originalAllowSignup === undefined) delete process.env.AUTH_ALLOW_SIGNUP;
  else process.env.AUTH_ALLOW_SIGNUP = originalAllowSignup;
  if (originalAllowedEmails === undefined) delete process.env.AUTH_ALLOWED_EMAILS;
  else process.env.AUTH_ALLOWED_EMAILS = originalAllowedEmails;
});

describe('auth signup policy', () => {
  it('keeps unknown account creation closed by default', () => {
    delete process.env.AUTH_ALLOW_SIGNUP;
    delete process.env.AUTH_ALLOWED_EMAILS;
    expect(isSignupAllowed('visitor@example.com')).toBe(false);
  });

  it('allows explicit signup or an authorized address/domain', () => {
    process.env.AUTH_ALLOWED_EMAILS = 'coach@example.com,@century.edu';
    expect(isSignupAllowed('coach@example.com')).toBe(true);
    expect(isSignupAllowed('staff@century.edu')).toBe(true);
    expect(isSignupAllowed('visitor@example.com')).toBe(false);
    process.env.AUTH_ALLOW_SIGNUP = 'true';
    expect(isSignupAllowed('visitor@example.com')).toBe(true);
  });

  it('allows a pre-created invited user with no password to claim the account', () => {
    expect(isInvitedAccountClaim(null)).toBe(true);
    expect(isInvitedAccountClaim(undefined)).toBe(true);
    expect(isInvitedAccountClaim('$2b$10$existinghash')).toBe(false);
  });
});
