const B = process.env.BASE_URL ?? 'http://localhost:4000';

let pass = 0;
let fail = 0;
const fails = [];
const log = [];
function ck(name, cond, extra = '') {
  if (cond) {
    pass++;
    log.push(`PASS  ${name}`);
  } else {
    fail++;
    fails.push(`${name}${extra ? ' :: ' + extra : ''}`);
    log.push(`FAIL  ${name}${extra ? ' :: ' + extra : ''}`);
  }
}

async function req(method, path, { body, token, rawBody, headers = {}, redirect = 'follow' } = {}) {
  const h = { ...headers };
  let payload;
  if (rawBody !== undefined) {
    h['content-type'] = 'application/json';
    payload = rawBody;
  } else if (body !== undefined) {
    h['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  if (token) h.authorization = `Bearer ${token}`;
  const res = await fetch(B + path, { method, headers: h, body: payload, redirect });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isoRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// ---------- HEALTH ----------
{
  const r = await req('GET', '/health');
  ck('health 200', r.status === 200);
  ck('health shape', r.data?.status === 'ok' && typeof r.data?.env === 'string' && typeof r.data?.uptime === 'number', JSON.stringify(r.data));
  const ready = await req('GET', '/health/ready');
  ck('health/ready 200 db up', ready.status === 200 && ready.data?.database === 'up', JSON.stringify(ready.data));
}

// ---------- AUTH ----------
const email = `e2e${Date.now()}@example.com`;
const password = 'Passw0rd!';
let accessToken;
let refreshToken;
{
  const r = await req('POST', '/auth/register', { body: { email, password } });
  ck('register 201', r.status === 201, JSON.stringify(r.data));
  ck('register tokens', !!r.data?.accessToken && !!r.data?.refreshToken && typeof r.data?.expiresIn === 'number', JSON.stringify(r.data));
  ck('register user shape', uuidRe.test(r.data?.user?.id ?? '') && r.data?.user?.email === email && r.data?.user?.role === 'user' && isoRe.test(r.data?.user?.createdAt ?? ''), JSON.stringify(r.data?.user));
  accessToken = r.data?.accessToken;
  refreshToken = r.data?.refreshToken;

  ck('register duplicate 409 CONFLICT', (await req('POST', '/auth/register', { body: { email, password } })).data?.error?.code === 'CONFLICT');
  const weak = await req('POST', '/auth/register', { body: { email: `w${Date.now()}@e.com`, password: 'weak' } });
  ck('register weak 422 + details', weak.status === 422 && weak.data?.error?.code === 'VALIDATION_ERROR' && Array.isArray(weak.data?.error?.details), JSON.stringify(weak.data));

  const wrong = await req('POST', '/auth/login', { body: { email, password: 'Wrong123' } });
  ck('login wrong 401 UNAUTHORIZED', wrong.status === 401 && wrong.data?.error?.code === 'UNAUTHORIZED');

  const login = await req('POST', '/auth/login', { body: { email, password } });
  ck('login 200 + tokens', login.status === 200 && !!login.data?.accessToken && !!login.data?.refreshToken);
  accessToken = login.data?.accessToken;
  refreshToken = login.data?.refreshToken;

  const me = await req('GET', '/auth/me', { token: accessToken });
  ck('me 200 + email + role', me.status === 200 && me.data?.user?.email === email && me.data?.user?.role === 'user', JSON.stringify(me.data));
  ck('me no token 401', (await req('GET', '/auth/me')).status === 401);
  ck('me bad token 401', (await req('GET', '/auth/me', { token: 'not.a.jwt' })).status === 401);

  const refresh = await req('POST', '/auth/refresh', { body: { refreshToken } });
  ck('refresh 200 rotated', refresh.status === 200 && refresh.data?.refreshToken !== refreshToken, JSON.stringify(refresh.data));
  ck('refresh reuse old 401', (await req('POST', '/auth/refresh', { body: { refreshToken } })).status === 401);
  const newRefresh = refresh.data?.refreshToken;

  ck('forgot-password 202', (await req('POST', '/auth/forgot-password', { body: { email } })).status === 202);
  ck('forgot unknown email 202', (await req('POST', '/auth/forgot-password', { body: { email: `nobody${Date.now()}@e.com` } })).status === 202);
  ck('reset invalid token 400', (await req('POST', '/auth/reset-password', { body: { token: 'bogus', password: 'NewPassw0rd!' } })).status === 400);

  ck('logout 204', (await req('POST', '/auth/logout', { body: { refreshToken: newRefresh } })).status === 204);
  ck('refresh after logout 401', (await req('POST', '/auth/refresh', { body: { refreshToken: newRefresh } })).status === 401);

  ck('unknown route 404 NOT_FOUND envelope', (await req('GET', '/definitely-not-real')).data?.error?.code === 'NOT_FOUND');
  ck('malformed JSON 400 BAD_REQUEST', (await req('POST', '/auth/login', { rawBody: '{not json' })).data?.error?.code === 'BAD_REQUEST');
}

// ---------- CONTENT: categories ----------
{
  const r = await req('GET', '/content/categories');
  ck('categories 200', r.status === 200);
  const items = r.data?.data ?? [];
  ck('categories non-empty', items.length > 0, `len=${items.length}`);
  const c = items[0] ?? {};
  ck('category shape', uuidRe.test(c.id) && typeof c.slug === 'string' && typeof c.name === 'string' && typeof c.icon === 'string' && typeof c.accent === 'string' && typeof c.materialCount === 'number' && typeof c.sortOrder === 'number', JSON.stringify(c));
  ck('categories ETag header', !!r.headers.get('etag'), r.headers.get('etag'));
  ck('categories Cache-Control', (r.headers.get('cache-control') ?? '').includes('max-age'), r.headers.get('cache-control'));
  const etag = r.headers.get('etag');
  ck('categories 304 on If-None-Match', (await req('GET', '/content/categories', { headers: { 'if-none-match': etag } })).status === 304);
}

// ---------- CONTENT: topics ----------
let topicsList = [];
{
  const r = await req('GET', '/content/topics');
  topicsList = r.data?.data ?? [];
  ck('topics 200 + shape', r.status === 200 && topicsList.length > 0 && uuidRe.test(topicsList[0].id) && typeof topicsList[0].materialCount === 'number', JSON.stringify(topicsList[0]));
}

// ---------- CONTENT: materials list + shape ----------
let categoriesList = [];
let materialsPage1 = [];
{
  const r = await req('GET', '/content/materials?limit=100');
  materialsPage1 = r.data?.data ?? [];
  ck('materials 200', r.status === 200);
  ck('materials meta shape', r.data?.meta?.page === 1 && r.data?.meta?.limit === 100 && typeof r.data?.meta?.total === 'number' && typeof r.data?.meta?.totalPages === 'number', JSON.stringify(r.data?.meta));
  const m = materialsPage1[0] ?? {};
  ck('material summary shape', uuidRe.test(m.id) && typeof m.slug === 'string' && typeof m.title === 'string' && typeof m.type === 'string' && typeof m.typeLabel === 'string' && typeof m.format === 'string' && Array.isArray(m.tags) && Array.isArray(m.topics) && 'category' in m && 'isFeatured' in m, JSON.stringify(Object.keys(m)));
  ck('material typeLabel present', typeof m.typeLabel === 'string' && m.typeLabel.length > 0);
  ck('material publishedAt ISO', m.publishedAt === null || isoRe.test(m.publishedAt), m.publishedAt);

  categoriesList = (await req('GET', '/content/categories')).data?.data ?? [];
}

// draft exclusion
ck('draft material 404', (await req('GET', '/content/materials/draft-material-hidden')).status === 404);
ck('missing material 404', (await req('GET', '/content/materials/does-not-exist')).status === 404);

// type filter
{
  const r = await req('GET', '/content/materials?type=guide,webinar&limit=100');
  const ok = (r.data?.data ?? []).every((m) => ['guide', 'webinar'].includes(m.type));
  ck('type CSV filter applied', ok && (r.data?.meta?.total ?? 0) > 0, JSON.stringify((r.data?.data ?? []).map((m) => m.type)));
}
// featured filter
{
  const r = await req('GET', '/content/materials?featured=true&limit=100');
  ck('featured=true filter', (r.data?.data ?? []).every((m) => m.isFeatured === true), '');
}
// search filter
{
  const r = await req('GET', '/content/materials?search=senior&limit=100');
  ck('search filter returns results', (r.data?.meta?.total ?? 0) > 0, JSON.stringify(r.data?.meta));
}
// sort
{
  const r = await req('GET', '/content/materials?sort=title&limit=20');
  const titles = (r.data?.data ?? []).map((m) => m.title.toLowerCase());
  const sorted = [...titles].sort();
  ck('sort=title alphabetical', JSON.stringify(titles) === JSON.stringify(sorted), '');
}
// pagination
{
  const p1 = await req('GET', '/content/materials?limit=5&page=1');
  const p2 = await req('GET', '/content/materials?limit=5&page=2');
  ck('pagination limit 5', p1.data?.meta?.limit === 5 && p2.data?.meta?.page === 2, JSON.stringify(p1.data?.meta));
  const s1 = (p1.data?.data ?? []).map((m) => m.slug).join(',');
  const s2 = (p2.data?.data ?? []).map((m) => m.slug).join(',');
  ck('pagination pages differ', s1 !== s2 && s2.length > 0, '');
}
// validation
ck('materials limit>100 -> 422', (await req('GET', '/content/materials?limit=999')).status === 422);

// featured endpoint
{
  const r = await req('GET', '/content/materials/featured?limit=4');
  const items = r.data?.data ?? [];
  ck('featured endpoint shape', r.status === 200 && items.length > 0 && items.length <= 4 && items.every((m) => m.isFeatured === true && typeof m.badge === 'string'), JSON.stringify(items.map((m) => m.badge)));
}

// reports
{
  const r = await req('GET', '/content/reports?limit=100');
  const items = r.data?.data ?? [];
  ck('reports type filter', r.status === 200 && items.every((m) => ['report', 'publication'].includes(m.type)), JSON.stringify(items.map((m) => m.type)));
  ck('reports have pages + badge', items.length > 0 && items.every((m) => typeof m.pages === 'number' && typeof m.badge === 'string'), JSON.stringify(items.map((m) => m.pages)));
  const y = await req('GET', '/content/reports?year=2024');
  ck('reports year filter', y.status === 200 && (y.data?.data ?? []).every((m) => (m.publishedAt ?? '').startsWith('2024')), JSON.stringify((y.data?.data ?? []).map((m) => m.publishedAt)));
}

// learning
{
  const r = await req('GET', '/content/learning?limit=100');
  const items = r.data?.data ?? [];
  ck('learning type filter', r.status === 200 && items.length > 0 && items.every((m) => ['guide', 'webinar', 'checklist'].includes(m.type)), JSON.stringify(items.map((m) => m.type)));
  const web = await req('GET', '/content/learning?type=webinar&limit=100');
  ck('learning webinar has videoUrl', (web.data?.data ?? []).every((m) => typeof m.videoUrl === 'string' && typeof m.durationSeconds === 'number'), JSON.stringify((web.data?.data ?? []).map((m) => [m.videoUrl, m.durationSeconds])));
}

// search + facets
{
  const r = await req('GET', '/content/search?q=senior&limit=100');
  ck('search 200 + facets', r.status === 200 && r.data?.facets && Array.isArray(r.data.facets.categories) && Array.isArray(r.data.facets.topics) && Array.isArray(r.data.facets.types), JSON.stringify(Object.keys(r.data ?? {})));
  const f = (r.data?.facets?.types ?? [])[0];
  ck('facet shape', f && typeof f.slug === 'string' && typeof f.name === 'string' && typeof f.count === 'number', JSON.stringify(f));
  const empty = await req('GET', '/content/search');
  ck('search empty q returns all', (empty.data?.meta?.total ?? 0) > 0, JSON.stringify(empty.data?.meta));
}

// popular
{
  const r = await req('GET', '/content/search/popular?limit=5');
  const items = r.data?.data ?? [];
  ck('popular shape', r.status === 200 && items.length > 0 && items.every((i) => typeof i.term === 'string' && typeof i.searches === 'number'), JSON.stringify(items));
}

// home
{
  const r = await req('GET', '/content/home');
  const d = r.data ?? {};
  ck('home aggregate', r.status === 200 && Array.isArray(d.categories) && Array.isArray(d.topics) && Array.isArray(d.featured) && Array.isArray(d.reports) && Array.isArray(d.learning) && Array.isArray(d.mostSearched), JSON.stringify(Object.keys(d)));
}

// detail
{
  const r = await req('GET', '/content/materials/cyfrowi-seniorzy-blizej-swiata');
  const d = r.data ?? {};
  ck('detail 200 + body/gallery/attachments/related', r.status === 200 && typeof d.body === 'string' && Array.isArray(d.gallery) && Array.isArray(d.attachments) && Array.isArray(d.related) && uuidRe.test(d.id), JSON.stringify(Object.keys(d)));
  const att = d.attachments?.[0];
  ck('attachment shape', !att || (typeof att.name === 'string' && typeof att.url === 'string' && typeof att.type === 'string'), JSON.stringify(att));
  ck('related items are summaries', (d.related ?? []).every((m) => m.id && m.slug && m.typeLabel), '');
}

// download
{
  const reports = await req('GET', '/content/reports?limit=1');
  const id = reports.data?.data?.[0]?.id;
  const r = await req('GET', `/content/materials/${id}/download`, { redirect: 'manual' });
  ck('download 302', r.status === 302, `status=${r.status}`);
  ck('download Location https', (r.headers.get('location') ?? '').startsWith('http'), r.headers.get('location'));
  ck('download Content-Disposition', (r.headers.get('content-disposition') ?? '').includes('attachment'), r.headers.get('content-disposition'));
}

// counts consistency
{
  let allOk = true;
  let detail = '';
  for (const t of topicsList) {
    const r = await req('GET', `/content/materials?topic=${t.slug}&limit=100`);
    if ((r.data?.meta?.total ?? -1) !== t.materialCount) {
      allOk = false;
      detail += `topic ${t.slug}: list=${r.data?.meta?.total} count=${t.materialCount}; `;
    }
  }
  for (const c of categoriesList) {
    const r = await req('GET', `/content/materials?category=${c.slug}&limit=100`);
    if ((r.data?.meta?.total ?? -1) !== c.materialCount) {
      allOk = false;
      detail += `cat ${c.slug}: list=${r.data?.meta?.total} count=${c.materialCount}; `;
    }
  }
  ck('counts consistent (all topics+categories)', allOk, detail);
}

// topic/category filters correctness
{
  const t = topicsList[0];
  const r = await req('GET', `/content/materials?topic=${t.slug}&limit=100`);
  const ok = (r.data?.data ?? []).every((m) => (m.topics ?? []).some((x) => x.slug === t.slug));
  ck(`topic filter correctness (${t.slug})`, ok, '');
  const c = categoriesList[0];
  const r2 = await req('GET', `/content/materials?category=${c.slug}&limit=100`);
  ck(`category filter correctness (${c.slug})`, (r2.data?.data ?? []).every((m) => m.category?.slug === c.slug), '');
}

// ---------- CONTACT ----------
{
  const r = await req('POST', '/contact', { body: { name: 'Jan Kowalski', email: 'jan@example.com', subject: 'Pytanie', message: 'Dzień dobry, proszę o kontakt.' } });
  ck('contact 202', r.status === 202 && typeof r.data?.message === 'string', JSON.stringify(r.data));
  const bad = await req('POST', '/contact', { body: { name: 'J', email: 'bad', message: 'x' } });
  ck('contact invalid 422 + details', bad.status === 422 && bad.data?.error?.code === 'VALIDATION_ERROR' && Array.isArray(bad.data?.error?.details), JSON.stringify(bad.data));
}

// ---------- LLM (client) ----------
{
  ck('llm/health 200', (await req('GET', '/llm/health')).status === 200);
  const models = await req('GET', '/llm/models');
  ck('llm/models 200 + data array', models.status === 200 && Array.isArray(models.data?.data), JSON.stringify(models.data).slice(0, 80));
  const chat = await req('POST', '/llm/chat/completions', { body: { messages: [{ role: 'user', content: 'Say hi' }] }, headers: { 'x-cache-space': 'default' } });
  ck('llm chat forwards x-cache header', chat.headers.get('x-cache') !== null, `x-cache=${chat.headers.get('x-cache')}`);
  ck('llm chat returns body', chat.status === 200 || chat.status === 401, `status=${chat.status}`);
}

console.log(log.join('\n'));
console.log(`\nTOTAL ${pass + fail} | PASS ${pass} | FAIL ${fail}`);
if (fails.length) {
  console.log('\nFAILURES:');
  for (const f of fails) console.log('  - ' + f);
}
process.exit(fail === 0 ? 0 : 1);
