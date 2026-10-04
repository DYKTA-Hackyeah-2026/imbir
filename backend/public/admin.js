(() => {
  'use strict';

  const els = {
    baseUrl: document.getElementById('baseUrl'),
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    newPassword: document.getElementById('newPassword'),
    resetToken: document.getElementById('resetToken'),
    cacheSpace: document.getElementById('cacheSpace'),
    accessToken: document.getElementById('accessToken'),
    refreshToken: document.getElementById('refreshToken'),
    results: document.getElementById('results'),
    runAll: document.getElementById('runAll'),
    statTotal: document.getElementById('statTotal'),
    statPassed: document.getElementById('statPassed'),
    statFailed: document.getElementById('statFailed'),
  };

  els.baseUrl.value = window.location.origin;

  const state = {
    accessToken: null,
    refreshToken: null,
    previousRefreshToken: null,
    email: null,
  };

  let total = 0;
  let passed = 0;
  let failed = 0;

  function base() {
    return els.baseUrl.value.trim().replace(/\/+$/, '');
  }

  function value(input) {
    return input.value.trim();
  }

  function uniqueEmail() {
    return `admin+${Date.now()}@example.com`;
  }

  async function request(method, path, options = {}) {
    const headers = {};
    let body;
    if (options.rawBody !== undefined) {
      headers['content-type'] = 'application/json';
      body = options.rawBody;
    } else if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
    if (options.auth === 'access' && state.accessToken) {
      headers.authorization = `Bearer ${state.accessToken}`;
    }
    if (options.cacheSpace) {
      headers['x-cache-space'] = options.cacheSpace;
    }

    const started = performance.now();
    try {
      const res = await fetch(base() + path, { method, headers, body });
      const elapsed = Math.round(performance.now() - started);
      const text = await res.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
      return { status: res.status, ok: res.ok, data, elapsed, headers: res.headers, networkError: null };
    } catch (error) {
      const elapsed = Math.round(performance.now() - started);
      return {
        status: 0,
        ok: false,
        data: { error: String(error && error.message ? error.message : error) },
        elapsed,
        headers: new Headers(),
        networkError: true,
      };
    }
  }

  function render(entry) {
    total += 1;
    if (entry.pass) {
      passed += 1;
    } else {
      failed += 1;
    }

    const details = document.createElement('details');
    details.className = `result ${entry.pass ? 'pass' : 'fail'}`;

    const summary = document.createElement('summary');

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = entry.pass ? '\u2714' : '\u2716';

    const method = document.createElement('span');
    method.className = 'method';
    method.textContent = entry.method;

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = entry.name;

    const status = document.createElement('span');
    status.className = 'status';
    status.textContent = entry.status === 0 ? 'ERR' : String(entry.status);

    const expect = document.createElement('span');
    expect.className = 'expect';
    expect.textContent = `exp ${entry.expected} · ${entry.elapsed}ms`;

    summary.append(icon, method, name, status, expect);

    const body = document.createElement('pre');
    body.className = 'body';
    body.textContent =
      (entry.note ? `# ${entry.note}\n` : '') +
      (typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2));

    details.append(summary, body);
    details.open = !entry.pass;

    const empty = els.results.querySelector('.empty');
    if (empty) {
      empty.remove();
    }
    els.results.prepend(details);

    els.statTotal.textContent = String(total);
    els.statPassed.textContent = String(passed);
    els.statFailed.textContent = String(failed);
  }

  async function test(name, method, path, options = {}) {
    const expected = Array.isArray(options.expect) ? options.expect : [options.expect];
    const res = await request(method, path, options);
    const statusOk = expected.includes(res.status);
    let checkOk = true;
    let note = options.note;
    if (statusOk && typeof options.check === 'function') {
      try {
        checkOk = Boolean(options.check(res.data, res));
      } catch (error) {
        checkOk = false;
        note = `check threw: ${String(error && error.message ? error.message : error)}`;
      }
    }
    const pass = statusOk && checkOk;
    render({
      name,
      method,
      status: res.status,
      expected: expected.join('/'),
      elapsed: res.elapsed,
      pass,
      note: pass ? note : note || (statusOk ? 'response body check failed' : 'unexpected status'),
      data: res.data,
    });
    return { ...res, pass };
  }

  function requireCredentials() {
    if (!value(els.email) || !value(els.password)) {
      render({
        name: 'Credentials required',
        method: '-',
        status: 0,
        expected: '-',
        elapsed: 0,
        pass: false,
        note: 'fill in Email and Password first',
        data: {},
      });
      return false;
    }
    return true;
  }

  function storeTokens(data) {
    if (data && typeof data === 'object' && data.accessToken) {
      state.accessToken = data.accessToken;
      els.accessToken.textContent = data.accessToken;
    }
    if (data && typeof data === 'object' && data.refreshToken) {
      state.previousRefreshToken = state.refreshToken;
      state.refreshToken = data.refreshToken;
      els.refreshToken.textContent = data.refreshToken;
    }
  }

  const actions = {
    health: () =>
      test('Liveness returns ok', 'GET', '/health', {
        expect: 200,
        check: (d) => d && d.status === 'ok',
      }),

    'health-ready': () =>
      test('Readiness reports database up', 'GET', '/health/ready', {
        expect: 200,
        check: (d) => d && d.database === 'up',
      }),

    register: async () => {
      if (!requireCredentials()) return;
      const email = value(els.email);
      state.email = email;
      const res = await test('Register creates account + tokens', 'POST', '/auth/register', {
        body: { email, password: value(els.password) },
        expect: 201,
        check: (d) => d && d.accessToken && d.refreshToken && d.user && d.user.email === email,
      });
      if (res.pass) storeTokens(res.data);
    },

    'register-duplicate': async () => {
      if (!requireCredentials()) return;
      await test('Duplicate email is rejected', 'POST', '/auth/register', {
        body: { email: value(els.email), password: value(els.password) },
        expect: 409,
        check: (d) => d && d.error && d.error.code === 'CONFLICT',
      });
    },

    'register-weak': () =>
      test('Weak password is rejected', 'POST', '/auth/register', {
        body: { email: uniqueEmail(), password: 'weak' },
        expect: 422,
        check: (d) => d && d.error && Array.isArray(d.error.details),
      }),

    login: async () => {
      if (!requireCredentials()) return;
      const email = value(els.email);
      state.email = email;
      const res = await test('Login returns tokens', 'POST', '/auth/login', {
        body: { email, password: value(els.password) },
        expect: 200,
        check: (d) => d && d.accessToken && d.refreshToken,
      });
      if (res.pass) storeTokens(res.data);
    },

    'login-wrong': async () => {
      if (!value(els.email)) {
        render({ name: 'Login wrong password', method: 'POST', status: 0, expected: 401, elapsed: 0, pass: false, note: 'fill in Email first', data: {} });
        return;
      }
      await test('Login with wrong password is rejected', 'POST', '/auth/login', {
        body: { email: value(els.email), password: 'DefinitelyWrong1' },
        expect: 401,
        check: (d) => d && d.error && d.error.code === 'UNAUTHORIZED',
      });
    },

    me: () =>
      test('Protected /me returns current user', 'GET', '/auth/me', {
        auth: 'access',
        expect: 200,
        check: (d) => d && d.user && (!state.email || d.user.email === state.email),
      }),

    'me-noauth': () =>
      test('Protected /me rejects missing token', 'GET', '/auth/me', {
        expect: 401,
      }),

    refresh: async () => {
      if (!state.refreshToken) {
        render({ name: 'Refresh rotates token', method: 'POST', status: 0, expected: 200, elapsed: 0, pass: false, note: 'login first to obtain a refresh token', data: {} });
        return;
      }
      const previous = state.refreshToken;
      const res = await test('Refresh rotates the refresh token', 'POST', '/auth/refresh', {
        body: { refreshToken: previous },
        expect: 200,
        check: (d) => d && d.refreshToken && d.refreshToken !== previous,
      });
      if (res.pass) storeTokens(res.data);
    },

    'refresh-reuse': async () => {
      const target = state.previousRefreshToken || state.refreshToken;
      if (!target) {
        render({ name: 'Reused refresh token rejected', method: 'POST', status: 0, expected: 401, elapsed: 0, pass: false, note: 'run Refresh first', data: {} });
        return;
      }
      await test('Reused (rotated) refresh token is rejected', 'POST', '/auth/refresh', {
        body: { refreshToken: target },
        expect: 401,
      });
    },

    logout: async () => {
      if (!state.refreshToken) {
        render({ name: 'Logout revokes refresh token', method: 'POST', status: 0, expected: 204, elapsed: 0, pass: false, note: 'login first', data: {} });
        return;
      }
      const token = state.refreshToken;
      const res = await test('Logout revokes the refresh token', 'POST', '/auth/logout', {
        body: { refreshToken: token },
        expect: 204,
      });
      if (res.pass) {
        state.accessToken = null;
        state.refreshToken = null;
        els.accessToken.textContent = '—';
        els.refreshToken.textContent = '—';
      }
    },

    forgot: async () => {
      if (!value(els.email)) {
        render({ name: 'Forgot password', method: 'POST', status: 0, expected: 202, elapsed: 0, pass: false, note: 'fill in Email first', data: {} });
        return;
      }
      await test('Forgot password always answers 202', 'POST', '/auth/forgot-password', {
        body: { email: value(els.email) },
        expect: 202,
        note: 'reset link is printed in the API logs',
      });
    },

    reset: async () => {
      if (!value(els.resetToken)) {
        render({ name: 'Reset password', method: 'POST', status: 0, expected: 204, elapsed: 0, pass: false, note: 'paste a reset token from the API logs into the field above', data: {} });
        return;
      }
      await test('Reset password consumes the token', 'POST', '/auth/reset-password', {
        body: { token: value(els.resetToken), password: value(els.newPassword) },
        expect: 204,
      });
    },

    unknown: () =>
      test('Unknown route returns 404', 'GET', '/definitely-not-a-route', {
        expect: 404,
        check: (d) => d && d.error && d.error.code === 'NOT_FOUND',
      }),

    malformed: () =>
      test('Malformed JSON returns 400', 'POST', '/auth/login', {
        rawBody: '{not json',
        expect: 400,
      }),

    'chat-miss': async () => {
      const space = value(els.cacheSpace) || 'default';
      await test(`Chat completion caches (MISS) in "${space}"`, 'POST', '/llm/chat/completions', {
        body: { messages: [{ role: 'user', content: 'panel cache probe' }] },
        cacheSpace: space,
        expect: 200,
        check: (_d, res) => res.headers.get('x-cache') === 'MISS',
        note: 'first call for this body should be MISS and get stored',
      });
    },

    'chat-hit': async () => {
      const space = value(els.cacheSpace) || 'default';
      await test(`Same chat completion is served from cache (HIT) in "${space}"`, 'POST', '/llm/chat/completions', {
        body: { messages: [{ role: 'user', content: 'panel cache probe' }] },
        cacheSpace: space,
        expect: 200,
        check: (_d, res) => res.headers.get('x-cache') === 'HIT',
        note: 'run "Chat MISS" right before this',
      });
    },

    'chat-stream': async () => {
      const space = value(els.cacheSpace) || 'default';
      await test('Streaming request bypasses cache', 'POST', '/llm/chat/completions', {
        body: { messages: [{ role: 'user', content: 'stream me' }], stream: true },
        cacheSpace: space,
        expect: 200,
        check: (_d, res) => res.headers.get('x-cache') === 'BYPASS-STREAM',
      });
    },

    'chat-nospace': () =>
      test('Unknown cache space is bypassed', 'POST', '/llm/chat/completions', {
        body: { messages: [{ role: 'user', content: 'no space' }] },
        cacheSpace: 'definitely-missing-space',
        expect: 200,
        check: (_d, res) => res.headers.get('x-cache') === 'NO-SPACE',
      }),

    'cache-overview': () =>
      test('Admin overview returns totals', 'GET', '/llm/admin/overview', {
        admin: true,
        expect: 200,
        check: (d) => d && d.totals && d.settings && d.eventsLast24h && d.effective,
      }),

    'cache-spaces': () =>
      test('Admin lists spaces', 'GET', '/llm/admin/spaces', {
        admin: true,
        expect: 200,
        check: (d) => Array.isArray(d),
      }),

    'cache-settings': () =>
      test('Admin returns settings', 'GET', '/llm/admin/settings', {
        admin: true,
        expect: 200,
        check: (d) => d && typeof d.default_model === 'string' && 'force_model' in d,
      }),

    'cache-entries': () =>
      test('Admin lists cache entries', 'GET', '/llm/admin/entries?limit=10', {
        admin: true,
        expect: 200,
        check: (d) => d && Array.isArray(d.rows) && typeof d.total === 'number',
      }),

    'cache-create-space': () =>
      test('Admin creates a cache space', 'POST', '/llm/admin/spaces', {
        admin: true,
        body: { name: `panel-space-${Date.now()}`, description: 'created from admin panel' },
        expect: 201,
        check: (d) => d && d.id && d.status === 'active',
      }),

    'cache-pause': async () => {
      const spaces = await request('GET', '/llm/admin/spaces', { admin: true });
      const target = Array.isArray(spaces.data) ? spaces.data[0] : null;
      if (!target) {
        render({ name: 'Pause cache space', method: 'POST', status: 0, expected: 200, elapsed: 0, pass: false, note: 'no space available', data: {} });
        return;
      }
      await test(`Pause space "${target.name}"`, 'POST', `/llm/admin/spaces/${target.id}/pause`, {
        admin: true,
        expect: 200,
        check: (d) => d && d.status === 'paused',
      });
      await request('POST', `/llm/admin/spaces/${target.id}/resume`, { admin: true });
    },

    'cache-resume': async () => {
      const spaces = await request('GET', '/llm/admin/spaces', { admin: true });
      const target = Array.isArray(spaces.data) ? spaces.data[0] : null;
      if (!target) {
        render({ name: 'Resume cache space', method: 'POST', status: 0, expected: 200, elapsed: 0, pass: false, note: 'no space available', data: {} });
        return;
      }
      await test(`Resume space "${target.name}"`, 'POST', `/llm/admin/spaces/${target.id}/resume`, {
        admin: true,
        expect: 200,
        check: (d) => d && d.status === 'active',
      });
    },

    'cache-purge-expired': () =>
      test('Purge expired entries', 'POST', '/llm/admin/cache/purge', {
        admin: true,
        body: { expired: true },
        expect: 200,
        check: (d) => d && typeof d.removed === 'number',
      }),
  };

  async function runAll() {
    els.runAll.disabled = true;

    const email = uniqueEmail();
    els.email.value = email;
    state.email = email;
    if (!value(els.password)) {
      els.password.value = 'Passw0rd!';
    }

    await actions.health();
    await actions['health-ready']();
    await actions.register();
    await actions['register-duplicate']();
    await actions['register-weak']();
    await actions['login-wrong']();
    await actions.login();
    await actions.me();
    await actions['me-noauth']();
    await actions.refresh();
    await actions['refresh-reuse']();

    const revokedToken = state.refreshToken;
    await actions.logout();
    await test('Refresh rejected after logout', 'POST', '/auth/refresh', {
      body: { refreshToken: revokedToken },
      expect: 401,
    });

    await actions.forgot();
    await actions.unknown();
    await actions.malformed();

    // LLM cache surface
    await actions['chat-miss']();
    await actions['chat-hit']();
    await actions['chat-stream']();
    await actions['chat-nospace']();
    await actions['cache-overview']();
    await actions['cache-spaces']();
    await actions['cache-settings']();
    await actions['cache-entries']();
    await actions['cache-create-space']();
    await actions['cache-purge-expired']();

    render({
      name: 'Manual step: reset-password needs a token from the API logs',
      method: 'POST',
      status: 0,
      expected: 204,
      elapsed: 0,
      pass: false,
      note: 'run "Forgot password", copy the link from `docker compose -f docker-compose.dev.yml logs api`, paste the token, then click Reset password',
      data: {},
    });

    els.runAll.disabled = false;
  }

  function clearResults() {
    els.results.replaceChildren();
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No requests yet. Click an action or “Run all tests”.';
    els.results.append(empty);
    total = 0;
    passed = 0;
    failed = 0;
    els.statTotal.textContent = '0';
    els.statPassed.textContent = '0';
    els.statFailed.textContent = '0';
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'clear') {
      clearResults();
      return;
    }
    if (action === 'run-all') {
      void runAll();
      return;
    }
    if (typeof actions[action] === 'function') {
      void actions[action]();
    }
  });
})();
