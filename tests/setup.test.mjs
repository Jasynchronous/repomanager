import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('GitHub authentication rejects users not on owner allowlist', () => {
  const auth = read('src/lib/auth.ts');
  assert.match(auth, /ALLOWED_GITHUB_USERNAME/);
  assert.match(auth, /login === configuredUsername\(\)/);
});

test('GitHub token is not copied to public session', () => {
  const auth = read('src/lib/auth.ts');
  const sessionPart = auth.split('async session(')[1];
  assert.ok(sessionPart);
  assert.doesNotMatch(sessionPart, /session\.githubAccessToken\s*=/);
  assert.doesNotMatch(sessionPart, /session\.accessToken\s*=/);
});

test('Visibility endpoint uses login from server auth instead of request body', () => {
  const action = read('src/app/api/repositories/visibility/route.ts');
  assert.match(action, /authorizedUser\(req\)/);
  assert.match(action, /encodeURIComponent\(githubLogin\)/);
  assert.match(action, /method: "PATCH"/);
});

test('Visibility confirmation is required for making repositories public', () => {
  const component = read('src/components/dashboard.tsx');
  assert.match(component, /publicAcknowledged/);
  assert.match(component, /pending\.visibility === "public" && !publicAcknowledged/);
});

test('Example configuration contains no live credentials', () => {
  const env = read('.env.example');
  assert.match(env, /GITHUB_CLIENT_ID=replace_with/);
  assert.match(env, /NEXTAUTH_SECRET=replace_with/);
});
