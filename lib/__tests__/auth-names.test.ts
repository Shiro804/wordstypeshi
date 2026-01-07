import { describe, it, expect } from 'vitest';
import { normalizeUsername, usernameToEmail } from '../auth/auth-names';

describe('auth-names', () => {
  describe('normalizeUsername', () => {
    it('converts to lowercase', () => {
      expect(normalizeUsername('UserOne')).toBe('userone');
    });

    it('trims whitespace', () => {
      expect(normalizeUsername('  UserTwo  ')).toBe('usertwo');
    });
  });

  describe('usernameToEmail', () => {
    it('returns valid emails as-is (normalized)', () => {
      expect(usernameToEmail('User@Example.com')).toBe('user@example.com');
    });

    it('converts usernames to synthetic emails', () => {
      expect(usernameToEmail('UserOne')).toBe('userone@wordstypeshi.app');
    });

    it('removes unsafe characters from username', () => {
      expect(usernameToEmail('User!@#One')).toBe('userone@wordstypeshi.app');
    });

    it('preserves allowed special characters', () => {
      expect(usernameToEmail('User.One-Two_Three')).toBe('user.one-two_three@wordstypeshi.app');
    });
  });
});
