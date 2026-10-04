# Content API — Frontend Integration Guide

This document is the **complete integration guide** for the public **Content** surface of the
backend (the knowledge base that powers the landing page, search, categories, topics, reports,
learning materials, material detail pages and the contact form).

It is self-contained. You do **not** need to read any backend source code. Every example below uses
the **real field names** returned by the running API.

> The `/llm/*` and `/auth/*` surfaces are unrelated to content work and are **out of scope** here.
> The backend still exposes them, but you will not need them for this feature.

---

## Table of contents

1. [What changed / TL;DR](#1-what-changed--tldr)
2. [Base URLs & conventions](#2-base-urls--conventions)
3. [Enums & label maps](#3-enums--label-maps)
4. [Data model reference](#4-data-model-reference)
5. [Endpoint reference](#5-endpoint-reference)
6. [UI mapping table](#6-ui-mapping-table)
7. [Ready-to-paste TypeScript client (`src/lib/api.ts`)](#7-ready-to-paste-typescript-client-srclibapits)
8. [Migration notes for the existing `src/lib/api.ts`](#8-migration-notes-for-the-existing-srclibapits)
9. [Testing checklist](#9-testing-checklist)

---

## 1. What changed / TL;DR

New **public, no-auth** endpoints were added under `/content` (GET) and `/contact` (POST):

- `GET /content/home` — one request for the whole landing page.
- `GET /content/categories` — category tiles + published counters.
- `GET /content/topics` — topic chips + published counters.
- `GET /content/materials` — filtered, sorted, paginated material list.
- `GET /content/materials/featured` — featured materials (with `badge`).
- `GET /content/materials/:slug` — full material detail (`body`, `gallery`, `attachments`, `related`).
- `GET /content/materials/:id/download` — `302` redirect to the file with `Content-Disposition`.
- `GET /content/reports` — reports & publications (items carry `badge` + `pages`).
- `GET /content/learning` — guides, webinars, checklists (webinars carry `videoUrl` + `durationSeconds`).
- `GET /content/search` — full-text search with facet counts.
- `GET /content/search/popular` — "most searched" terms.
- `POST /contact` — contact form submission (`202 Accepted`, `422` on validation failure).

Additional behaviour to plan for:

- Public GETs send **`ETag` + `Cache-Control`**; send `If-None-Match` to get **`304 Not Modified`** (empty body).
- Pagination `limit` is capped at **100**.
- Validation failures return **HTTP `422`** with `{ error: { code, message, details: [{ path, message }] } }`.
- Only **published** materials are ever returned; drafts/missing → **`404`**.

---

## 2. Base URLs & conventions

### Base URLs

| Environment | `{{BASE_URL}}` |
|-------------|----------------|
| Production | `https://hackathon-backend.makonew.com` |
| Local | `http://localhost:4000` |

Throughout this document `{{BASE_URL}}` is a stand-in for the base URL. All paths are appended to it:

```
{{BASE_URL}}/content/materials?limit=10
{{BASE_URL}}/contact
```

### Conventions

| Topic | Rule |
|-------|------|
| **Auth** | None. Every endpoint in this document is public. Do not send an `Authorization` header. |
| **Methods** | Content reads are `GET`; the only write is `POST /contact`. |
| **Field naming** | `camelCase` everywhere. |
| **IDs** | UUID v4 strings, e.g. `"4e105d3c-ff97-401b-9e47-aa3db26341b9"`. Category/topic `slug` is the stable human key. |
| **Timestamps** | ISO-8601 UTC strings, e.g. `"2024-03-12T00:00:00.000Z"`. `publishedAt` may be `null`. |
| **Encoding** | JSON, UTF-8, `Content-Type: application/json` (except the `302` download and `304`). |
| **Trailing slashes** | Not required. `/content/topics` and `/content/topics/` both work. |
| **Unknown routes** | `404` with the standard error envelope. |

### Pagination

List endpoints return:

```json
{ "data": [ /* items */ ], "meta": { "page": 1, "limit": 20, "total": 27, "totalPages": 2 } }
```

- `page` starts at **1**.
- `limit` default **20**, minimum **1**, maximum **100**. Values above 100 fail validation (`422`).
- `totalPages` is `0` when `total` is `0`.
- CSV filters: `type` and `topic` accept comma-separated values, e.g. `type=guide,webinar`.
- `category` accepts a category **slug or UUID**. `topic` accepts topic **slugs**.
- Unknown filter values match nothing and return an empty `data` array — **not** an error.
- Sorting: `sort=publishedAt` (oldest first) · `sort=-publishedAt` (newest first, **default**) · `sort=title` (A→Z).

### Error envelope

Every error has this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "path": "limit", "message": "Number must be less than or equal to 100" }
    ]
  }
}
```

`details` is optional and only present for `VALIDATION_ERROR` (`422`). Codes you can receive:

| HTTP | `code` | Meaning |
|------|--------|---------|
| `400` | `BAD_REQUEST` | Malformed JSON body. |
| `404` | `NOT_FOUND` | Material missing / not published / no downloadable file. |
| `422` | `VALIDATION_ERROR` | Query or body failed validation; `details` lists fields. |
| `429` | `TOO_MANY_REQUESTS` | Rate-limited (only realistic on `POST /contact`). |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server error. |

### Caching & ETag / `304 Not Modified`

Every public content `GET` sets:

```
ETag: W/"<sha1 hash of the JSON body>"
Cache-Control: public, max-age=<n>, stale-while-revalidate=300
```

`max-age` per endpoint: categories/topics `300`, reports `300`, materials `60`, featured `120`,
learning `120`, search `30`, popular `60`, home `60`, material detail `120`.

**How to handle `304` in `fetch`:**

- If you send `If-None-Match: <etag>` and the body is unchanged, the server replies
  **`304 Not Modified` with no body**. `response.status === 304` and `response.ok === false`, so you
  must check the status **before** calling `response.json()`.
- The simplest correct strategy is to let the **browser HTTP cache** do this automatically: do not
  pass `cache: 'no-store'`, and the browser will revalidate and return the cached body transparently.
- If you want to manage it manually (an in-memory cache keyed by URL), note that **`ETag` is not a
  CORS-safelisted response header**. For a **cross-origin** frontend you can only read it if the
  backend sends `Access-Control-Expose-Headers: ETag`. The TypeScript client in
  [section 7](#7-ready-to-paste-typescript-client-srclibapits) implements manual `If-None-Match`
  handling and degrades gracefully when the `ETag` header is not readable.

### CORS

The backend only allows origins listed in its `CORS_ORIGINS` environment variable. **Your frontend
origin must be added to `CORS_ORIGINS` on the backend**, otherwise the browser blocks the request.
Ask the backend team to add e.g. `http://localhost:5173,https://your-frontend.example`.

The `x-cache*` response headers (`x-cache`, `x-cache-space`, `x-cache-model`) belong to the **`/llm`
endpoints only** and are **not exposed to browsers by default**. They are irrelevant to content work.

### A note on the download endpoint

`GET /content/materials/:id/download` responds with **`302 Found`**, `Location: <fileUrl>` and
`Content-Disposition: attachment; filename="..."`. The easiest UI is a plain link or
`window.location.href = ...`, letting the browser follow the redirect and save the file. If you use
`fetch`, you must read the `Location` header (requires `redirect: 'manual'`, and cross-origin the
`Location` header is not readable from JS — prefer the link approach).

---

## 3. Enums & label maps

### Material `type`

`innovation` · `report` · `publication` · `guide` · `webinar` · `checklist` · `video` ·
`challenge_map` · `case_study`

### Material `format`

`article` · `pdf` · `video` · `map`

### Reports `type` (for `/content/reports`)

`report` · `publication` — default `report`.

### Learning `type` (for `/content/learning`)

`guide` · `webinar` · `checklist` — omit to match all three.

### Category `accent`

`blue` · `rose` · `emerald` · `violet` · `amber` · `teal`

### Icon keys

Category/topic `icon` values used by the seed data:

`lightbulb` · `file-text` · `graduation-cap` · `play` · `map-pin` · `users`

(Topics additionally use `heart-pulse`, `accessibility`, `wifi`, `users-round`, `user-round`. Render
an unknown icon with a sensible fallback.)

### `typeLabel` mapping

The server computes `typeLabel` (and copies it into `badge` on `featured`/`reports`/`learning`). Use
it directly for chips/badges rather than mapping again on the client.

| `type` | `typeLabel` | `badge` value |
|--------|-------------|---------------|
| `innovation` | Innowacja | Innowacja |
| `report` | Raport | Raport |
| `publication` | Publikacja | Publikacja |
| `guide` | Poradnik | Poradnik |
| `webinar` | Webinar | Webinar |
| `checklist` | Lista kontrolna | Lista kontrolna |
| `video` | Wideo | Wideo |
| `challenge_map` | Mapa wyzwań | Mapa wyzwań |
| `case_study` | Studium przypadku | Studium przypadku |

---

## 4. Data model reference

### Category

```json
{
  "id": "4e105d3c-ff97-401b-9e47-aa3db26341b9",
  "slug": "gotowe-innowacje",
  "name": "Gotowe innowacje",
  "description": "Sprawdzone rozwiązania i dobre praktyki.",
  "icon": "lightbulb",
  "accent": "blue",
  "materialCount": 3,
  "sortOrder": 1
}
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID. |
| `slug` | `string` | Stable key used in filters. |
| `name` | `string` | Display name. |
| `description` | `string \| null` | Short description. |
| `icon` | `string` | One of the icon keys. |
| `accent` | `string` | One of the accent colors. |
| `materialCount` | `number` | Count of **published** materials in this category. |
| `sortOrder` | `number` | Ascending display order. |

### Topic

```json
{ "id": "uuid", "slug": "seniorzy", "name": "Seniorzy", "icon": "users", "materialCount": 6 }
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID. |
| `slug` | `string` | Stable key used in filters. |
| `name` | `string` | Display name. |
| `icon` | `string` | One of the icon keys. |
| `materialCount` | `number` | Count of **published** materials with this topic. |

### MaterialSummary

Used by every list endpoint. This is the **exact** shape returned:

```json
{
  "id": "5d206a7a-a85a-4e34-95fd-5618b5edfe62",
  "slug": "innowacja-telefon-zaufania-seniora",
  "title": "Telefon zaufania dla seniorów",
  "excerpt": "Innowacja społeczna: infolinia wsparcia dla osób starszych.",
  "type": "innovation",
  "typeLabel": "Innowacja",
  "format": "article",
  "publishedAt": "2024-03-12T00:00:00.000Z",
  "updatedAt": "2026-10-03T15:24:24.357Z",
  "coverUrl": "https://picsum.photos/seed/telefon-zaufania/1200/675",
  "thumbnailUrl": "https://picsum.photos/seed/telefon-zaufania-seniora/600/400",
  "tags": ["Seniorzy", "Wsparcie"],
  "category": { "id": "uuid", "slug": "gotowe-innowacje", "name": "Gotowe innowacje" },
  "topics": [{ "id": "uuid", "slug": "seniorzy", "name": "Seniorzy" }],
  "author": "Caritas Małopolska",
  "region": "Małopolska",
  "language": "pl",
  "isFeatured": true,
  "fileUrl": null,
  "fileType": null,
  "fileSizeBytes": null,
  "durationSeconds": null,
  "pages": null,
  "videoUrl": null
}
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID (use for `/download`). |
| `slug` | `string` | Use for `/materials/:slug`. |
| `title` | `string` | Display title. |
| `excerpt` | `string \| null` | Short summary. |
| `type` | `string` | Material type enum. |
| `typeLabel` | `string` | Localized label (see table above). |
| `format` | `string` | Format enum. |
| `publishedAt` | `string \| null` | ISO-8601; may be `null`. |
| `updatedAt` | `string` | ISO-8601. |
| `coverUrl` | `string \| null` | Large cover image. |
| `thumbnailUrl` | `string \| null` | Card thumbnail. |
| `tags` | `string[]` | Free-form tags. |
| `category` | `CategoryRef \| null` | `{ id, slug, name }`. |
| `topics` | `TopicRef[]` | `{ id, slug, name }[]`. |
| `author` | `string \| null` | Author/organization. |
| `region` | `string \| null` | Region. |
| `language` | `string` | e.g. `"pl"`. |
| `isFeatured` | `boolean` | Featured flag. |
| `fileUrl` | `string \| null` | Downloadable file URL. |
| `fileType` | `string \| null` | e.g. `"pdf"`. |
| `fileSizeBytes` | `number \| null` | Size in bytes. |
| `durationSeconds` | `number \| null` | For video/webinar. |
| `pages` | `number \| null` | For reports. |
| `videoUrl` | `string \| null` | For video/webinar. |
| `badge` | `string?` | Present on `featured`, `reports`, `learning` items. Equals `typeLabel`. |

#### Report item example (adds `badge`, `pages`, file fields)

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "slug": "mapa-wyzwan-spolecznych-malopolski",
  "title": "Mapa wyzwań społecznych Małopolski",
  "excerpt": "Diagnoza najważniejszych wyzwań społecznych regionu.",
  "type": "report",
  "typeLabel": "Raport",
  "format": "pdf",
  "publishedAt": "2024-05-20T00:00:00.000Z",
  "updatedAt": "2026-10-03T15:24:24.357Z",
  "coverUrl": "https://picsum.photos/seed/mapa-wyzwan/1200/675",
  "thumbnailUrl": "https://picsum.photos/seed/mapa-wyzwan/600/400",
  "tags": ["Małopolska", "Diagnoza"],
  "category": { "id": "uuid", "slug": "raporty-i-publikacje", "name": "Raporty i publikacje" },
  "topics": [{ "id": "uuid", "slug": "seniorzy", "name": "Seniorzy" }],
  "author": "Caritas Małopolska",
  "region": "Małopolska",
  "language": "pl",
  "isFeatured": false,
  "fileUrl": "https://files.hackathon-backend.makonew.com/content/mapa-wyzwan-spolecznych-malopolski.pdf",
  "fileType": "pdf",
  "fileSizeBytes": 1258291,
  "durationSeconds": null,
  "pages": 48,
  "videoUrl": null,
  "badge": "Raport"
}
```

### MaterialDetail

Returned by `GET /content/materials/:slug`. It is **MaterialSummary plus**:

| Field | Type | Meaning |
|-------|------|---------|
| `body` | `string \| null` | Full content (HTML string). Sanitize/`dangerouslySetInnerHTML` as appropriate. |
| `gallery` | `string[]` | Image URLs (empty array if none). |
| `attachments` | `Attachment[]` | Downloadable files (empty array if none). |
| `related` | `MaterialSummary[]` | Up to 4 related published materials (may be empty). |

### Attachment

```json
{ "name": "mapa-wyzwan-spolecznych-malopolski.pdf", "url": "https://files.hackathon-backend.makonew.com/content/mapa-wyzwan-spolecznych-malopolski.pdf", "type": "pdf", "sizeBytes": 1258291 }
```

| Field | Type | Notes |
|-------|------|-------|
| `name` | `string` | File name derived from the URL. |
| `url` | `string` | Direct file URL. |
| `type` | `string` | File type, e.g. `"pdf"`; defaults to `"file"`. |
| `sizeBytes` | `number \| null` | Size in bytes. |

### Facets (from search)

```json
{
  "categories": [{ "slug": "gotowe-innowacje", "name": "Gotowe innowacje", "count": 2 }],
  "topics":     [{ "slug": "seniorzy", "name": "Seniorzy", "count": 5 }],
  "types":      [{ "slug": "innovation", "name": "Innowacja", "count": 2 }]
}
```

Each facet is `{ slug, name, count }`. For `types`, `slug` is the raw `type` and `name` is its
`typeLabel`.

### Paginated<T>

```ts
interface PaginationMeta { page: number; limit: number; total: number; totalPages: number }
interface Paginated<T> { data: T[]; meta: PaginationMeta }
```

---

## 5. Endpoint reference

All endpoints below are **public**. All JSON examples are real response shapes.

### `GET /content/home`

**Purpose:** Fetch everything the landing page needs in a single request (fewer round-trips).

**Query params:** none.

**Response `200`:**

```json
{
  "categories": [
    { "id": "4e105d3c-ff97-401b-9e47-aa3db26341b9", "slug": "gotowe-innowacje", "name": "Gotowe innowacje", "description": "Sprawdzone rozwiązania i dobre praktyki.", "icon": "lightbulb", "accent": "blue", "materialCount": 3, "sortOrder": 1 }
  ],
  "topics": [
    { "id": "uuid", "slug": "seniorzy", "name": "Seniorzy", "icon": "users", "materialCount": 6 }
  ],
  "featured": [ /* MaterialSummary[] (max 4, each with badge) */ ],
  "reports":  [ /* MaterialSummary[] (max 4, each with badge + pages) */ ],
  "learning": [ /* MaterialSummary[] (max 4, each with badge) */ ],
  "mostSearched": [ { "term": "innowacje dla seniorów", "searches": 120 } ]
}
```

- `featured`: up to 4 featured materials, newest first.
- `reports`: up to 4 `type=report`, newest first.
- `learning`: up to 4 of `guide`/`webinar`/`checklist`, newest first.
- `mostSearched`: up to 5 terms.

**Errors:** `500` on unexpected failure.

```bash
curl "{{BASE_URL}}/content/home"
```

---

### `GET /content/categories`

**Purpose:** Category tiles with published-material counters.

**Query params:** none.

**Response `200`:**

```json
{
  "data": [
    { "id": "4e105d3c-ff97-401b-9e47-aa3db26341b9", "slug": "gotowe-innowacje", "name": "Gotowe innowacje", "description": "Sprawdzone rozwiązania i dobre praktyki.", "icon": "lightbulb", "accent": "blue", "materialCount": 3, "sortOrder": 1 }
  ]
}
```

Ordered by `sortOrder`, then `name`. **`materialCount` always equals the `meta.total` of
`GET /content/materials?category=<slug>`** for the same category.

**Errors:** `500` on unexpected failure.

```bash
curl "{{BASE_URL}}/content/categories"
```

---

### `GET /content/topics`

**Purpose:** Popular topic chips with published-material counters.

**Query params:** none.

**Response `200`:**

```json
{
  "data": [
    { "id": "uuid", "slug": "seniorzy", "name": "Seniorzy", "icon": "users", "materialCount": 6 }
  ]
}
```

Ordered by `materialCount` desc, then `name`. **`materialCount` always equals the `meta.total` of
`GET /content/materials?topic=<slug>`** for the same topic.

**Errors:** `500` on unexpected failure.

```bash
curl "{{BASE_URL}}/content/topics"
```

---

### `GET /content/materials`

**Purpose:** The main filtered/paginated material list behind "See all" screens.

**Query params:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `type` | CSV | — | material types |
| `category` | string | — | category slug **or** UUID |
| `topic` | CSV | — | topic slugs |
| `featured` | `true`/`false` | — | `true` → featured only |
| `search` | string | — | 1–200 chars; matches `title`, `excerpt`, `body`, tags |
| `sort` | enum | `-publishedAt` | `publishedAt` · `-publishedAt` · `title` |
| `page` | int | `1` | ≥ 1 |
| `limit` | int | `20` | 1–100 |

**Response `200`:**

```json
{
  "data": [
    {
      "id": "5d206a7a-a85a-4e34-95fd-5618b5edfe62",
      "slug": "innowacja-telefon-zaufania-seniora",
      "title": "Telefon zaufania dla seniorów",
      "excerpt": "Innowacja społeczna: infolinia wsparcia dla osób starszych.",
      "type": "innovation",
      "typeLabel": "Innowacja",
      "format": "article",
      "publishedAt": "2024-03-12T00:00:00.000Z",
      "updatedAt": "2026-10-03T15:24:24.357Z",
      "coverUrl": "https://picsum.photos/seed/telefon-zaufania/1200/675",
      "thumbnailUrl": "https://picsum.photos/seed/telefon-zaufania-seniora/600/400",
      "tags": ["Seniorzy", "Wsparcie"],
      "category": { "id": "uuid", "slug": "gotowe-innowacje", "name": "Gotowe innowacje" },
      "topics": [{ "id": "uuid", "slug": "seniorzy", "name": "Seniorzy" }],
      "author": "Caritas Małopolska",
      "region": "Małopolska",
      "language": "pl",
      "isFeatured": true,
      "fileUrl": null,
      "fileType": null,
      "fileSizeBytes": null,
      "durationSeconds": null,
      "pages": null,
      "videoUrl": null
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 27, "totalPages": 2 }
}
```

**Errors:**

| HTTP | `code` | When |
|------|--------|------|
| `422` | `VALIDATION_ERROR` | `limit > 100`, `page < 1`, `featured` not `true`/`false`, `sort` invalid, `search` length. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected failure. |

```bash
curl "{{BASE_URL}}/content/materials?type=guide,webinar&category=gotowe-innowacje&sort=-publishedAt&page=1&limit=10"
```

---

### `GET /content/materials/featured`

**Purpose:** "Featured innovations" carousel/section.

**Query params:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `limit` | int | `4` | 1–100 |
| `topic` | CSV | — | topic slugs |
| `category` | string | — | slug or UUID |

**Response `200`:** `{ "data": [ MaterialSummary with `badge` ] }`

```json
{
  "data": [
    {
      "id": "5d206a7a-a85a-4e34-95fd-5618b5edfe62",
      "slug": "innowacja-telefon-zaufania-seniora",
      "title": "Telefon zaufania dla seniorów",
      "excerpt": "Innowacja społeczna: infolinia wsparcia dla osób starszych.",
      "type": "innovation",
      "typeLabel": "Innowacja",
      "format": "article",
      "publishedAt": "2024-03-12T00:00:00.000Z",
      "updatedAt": "2026-10-03T15:24:24.357Z",
      "coverUrl": "https://picsum.photos/seed/telefon-zaufania/1200/675",
      "thumbnailUrl": "https://picsum.photos/seed/telefon-zaufania-seniora/600/400",
      "tags": ["Seniorzy", "Wsparcie"],
      "category": { "id": "uuid", "slug": "gotowe-innowacje", "name": "Gotowe innowacje" },
      "topics": [{ "id": "uuid", "slug": "seniorzy", "name": "Seniorzy" }],
      "author": "Caritas Małopolska",
      "region": "Małopolska",
      "language": "pl",
      "isFeatured": true,
      "fileUrl": null,
      "fileType": null,
      "fileSizeBytes": null,
      "durationSeconds": null,
      "pages": null,
      "videoUrl": null,
      "badge": "Innowacja"
    }
  ]
}
```

**Errors:** `422` validation, `500`.

```bash
curl "{{BASE_URL}}/content/materials/featured?limit=4&topic=seniorzy"
```

---

### `GET /content/materials/:slug`

**Purpose:** Full detail page for one material.

**Path params:**

| Param | Type | Notes |
|-------|------|-------|
| `slug` | string | The material `slug`. |

**Response `200`:** `MaterialDetail` (all `MaterialSummary` fields plus `body`, `gallery`, `attachments`, `related`).

```json
{
  "id": "5d206a7a-a85a-4e34-95fd-5618b5edfe62",
  "slug": "innowacja-telefon-zaufania-seniora",
  "title": "Telefon zaufania dla seniorów",
  "excerpt": "Innowacja społeczna: infolinia wsparcia dla osób starszych.",
  "type": "innovation",
  "typeLabel": "Innowacja",
  "format": "article",
  "publishedAt": "2024-03-12T00:00:00.000Z",
  "updatedAt": "2026-10-03T15:24:24.357Z",
  "coverUrl": "https://picsum.photos/seed/telefon-zaufania/1200/675",
  "thumbnailUrl": "https://picsum.photos/seed/telefon-zaufania-seniora/600/400",
  "tags": ["Seniorzy", "Wsparcie"],
  "category": { "id": "uuid", "slug": "gotowe-innowacje", "name": "Gotowe innowacje" },
  "topics": [{ "id": "uuid", "slug": "seniorzy", "name": "Seniorzy" }],
  "author": "Caritas Małopolska",
  "region": "Małopolska",
  "language": "pl",
  "isFeatured": true,
  "fileUrl": null,
  "fileType": null,
  "fileSizeBytes": null,
  "durationSeconds": null,
  "pages": null,
  "videoUrl": null,
  "body": "<p>Innowacja społeczna polegająca na uruchomieniu infolinii wsparcia...</p>",
  "gallery": [
    "https://picsum.photos/seed/telefon-zaufania-1/1200/800",
    "https://picsum.photos/seed/telefon-zaufania-2/1200/800"
  ],
  "attachments": [],
  "related": [
    {
      "id": "uuid",
      "slug": "wsparcie-seniorow-w-domu",
      "title": "Wsparcie seniorów w domu",
      "excerpt": "Programy pomocy domowej dla osób starszych.",
      "type": "innovation",
      "typeLabel": "Innowacja",
      "format": "article",
      "publishedAt": "2024-02-10T00:00:00.000Z",
      "updatedAt": "2026-10-03T15:24:24.357Z",
      "coverUrl": "https://picsum.photos/seed/wsparcie-dom/1200/675",
      "thumbnailUrl": "https://picsum.photos/seed/wsparcie-dom/600/400",
      "tags": ["Seniorzy"],
      "category": { "id": "uuid", "slug": "gotowe-innowacje", "name": "Gotowe innowacje" },
      "topics": [{ "id": "uuid", "slug": "seniorzy", "name": "Seniorzy" }],
      "author": "Caritas Małopolska",
      "region": "Małopolska",
      "language": "pl",
      "isFeatured": false,
      "fileUrl": null,
      "fileType": null,
      "fileSizeBytes": null,
      "durationSeconds": null,
      "pages": null,
      "videoUrl": null
    }
  ]
}
```

For a PDF material the `attachments` array contains the file:

```json
"attachments": [
  {
    "name": "mapa-wyzwan-spolecznych-malopolski.pdf",
    "url": "https://files.hackathon-backend.makonew.com/content/mapa-wyzwan-spolecznych-malopolski.pdf",
    "type": "pdf",
    "sizeBytes": 1258291
  }
]
```

**Errors:**

| HTTP | `code` | When |
|------|--------|------|
| `404` | `NOT_FOUND` | No published material with that `slug` (`"Material not found"`). |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected failure. |

```bash
curl "{{BASE_URL}}/content/materials/innowacja-telefon-zaufania-seniora"
```

---

### `GET /content/materials/:id/download`

**Purpose:** Download the material's file. `:id` is the material **UUID** (from `MaterialSummary.id`).

**Path params:**

| Param | Type | Notes |
|-------|------|-------|
| `id` | UUID | Material `id`, **not** the slug. |

**Response `302 Found`:**

```
Location: https://files.hackathon-backend.makonew.com/content/mapa-wyzwan-spolecznych-malopolski.pdf
Content-Disposition: attachment; filename="mapa-wyzwan-spolecznych-malopolski.pdf"
```

The browser follows the redirect to the file host. Prefer a plain anchor/link over `fetch`.

**Errors:**

| HTTP | `code` | When |
|------|--------|------|
| `404` | `NOT_FOUND` | Missing/not published material, **or** material has no file (`"This material has no downloadable file"`). |

```bash
curl -i "{{BASE_URL}}/content/materials/5d206a7a-a85a-4e34-95fd-5618b5edfe62/download"
```

---

### `GET /content/reports`

**Purpose:** "Reports & publications" section.

**Query params:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `type` | enum | `report` | `report` · `publication` |
| `year` | int | — | matches publication year |
| `topic` | CSV | — | topic slugs |
| `category` | string | — | slug or UUID |
| `sort` | enum | `-publishedAt` | `publishedAt` · `-publishedAt` · `title` |
| `page` | int | `1` | ≥ 1 |
| `limit` | int | `20` | 1–100 |

**Response `200`:** `{ "data": [ MaterialSummary with `badge` + `pages` ], "meta": {...} }`

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "slug": "mapa-wyzwan-spolecznych-malopolski",
      "title": "Mapa wyzwań społecznych Małopolski",
      "excerpt": "Diagnoza najważniejszych wyzwań społecznych regionu.",
      "type": "report",
      "typeLabel": "Raport",
      "format": "pdf",
      "publishedAt": "2024-05-20T00:00:00.000Z",
      "updatedAt": "2026-10-03T15:24:24.357Z",
      "coverUrl": "https://picsum.photos/seed/mapa-wyzwan/1200/675",
      "thumbnailUrl": "https://picsum.photos/seed/mapa-wyzwan/600/400",
      "tags": ["Małopolska", "Diagnoza"],
      "category": { "id": "uuid", "slug": "raporty-i-publikacje", "name": "Raporty i publikacje" },
      "topics": [{ "id": "uuid", "slug": "seniorzy", "name": "Seniorzy" }],
      "author": "Caritas Małopolska",
      "region": "Małopolska",
      "language": "pl",
      "isFeatured": false,
      "fileUrl": "https://files.hackathon-backend.makonew.com/content/mapa-wyzwan-spolecznych-malopolski.pdf",
      "fileType": "pdf",
      "fileSizeBytes": 1258291,
      "durationSeconds": null,
      "pages": 48,
      "videoUrl": null,
      "badge": "Raport"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 8, "totalPages": 1 }
}
```

**Errors:** `422` validation, `500`.

```bash
curl "{{BASE_URL}}/content/reports?type=publication&year=2024&sort=-publishedAt&limit=12"
```

---

### `GET /content/learning`

**Purpose:** "Learn & act" section (guides, webinars, checklists).

**Query params:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `type` | enum | — | `guide` · `webinar` · `checklist`; omit = all three |
| `topic` | CSV | — | topic slugs |
| `category` | string | — | slug or UUID |
| `sort` | enum | `-publishedAt` | `publishedAt` · `-publishedAt` · `title` |
| `page` | int | `1` | ≥ 1 |
| `limit` | int | `20` | 1–100 |

**Response `200`:** `{ "data": [ MaterialSummary with `badge` ], "meta": {...} }`

```json
{
  "data": [
    {
      "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
      "slug": "webinar-wsparcie-seniorow",
      "title": "Webinar: Jak wspierać seniorów cyfrowo",
      "excerpt": "Nagranie szkolenia dla osób pracujących z seniorami.",
      "type": "webinar",
      "typeLabel": "Webinar",
      "format": "video",
      "publishedAt": "2024-04-02T00:00:00.000Z",
      "updatedAt": "2026-10-03T15:24:24.357Z",
      "coverUrl": "https://picsum.photos/seed/webinar-seniorzy/1200/675",
      "thumbnailUrl": "https://picsum.photos/seed/webinar-seniorzy/600/400",
      "tags": ["Seniorzy", "Szkolenia"],
      "category": { "id": "uuid", "slug": "nauka-i-dzialanie", "name": "Nauka i działanie" },
      "topics": [{ "id": "uuid", "slug": "seniorzy", "name": "Seniorzy" }],
      "author": "Caritas Małopolska",
      "region": "Małopolska",
      "language": "pl",
      "isFeatured": false,
      "fileUrl": null,
      "fileType": null,
      "fileSizeBytes": null,
      "durationSeconds": 3720,
      "pages": null,
      "videoUrl": "https://www.youtube.com/watch?v=example",
      "badge": "Webinar"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

Webinar/video items carry `videoUrl` and `durationSeconds`; other item types leave them `null`.

**Errors:** `422` validation, `500`.

```bash
curl "{{BASE_URL}}/content/learning?type=webinar&topic=seniorzy&limit=12"
```

---

### `GET /content/search`

**Purpose:** Full-text search with facet counts for filter UIs.

**Query params:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `q` | string | `''` | ≤ 200 chars; empty returns all published materials (still paginated) |
| `type` | CSV | — | material types |
| `category` | string | — | slug or UUID |
| `topic` | CSV | — | topic slugs |
| `page` | int | `1` | ≥ 1 |
| `limit` | int | `20` | 1–100 |

A non-empty `q` increments the popular-searches counter. Results are sorted `-publishedAt`.

**Response `200`:**

```json
{
  "data": [ /* MaterialSummary[] */ ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 },
  "facets": {
    "categories": [{ "slug": "gotowe-innowacje", "name": "Gotowe innowacje", "count": 2 }],
    "topics":     [{ "slug": "seniorzy", "name": "Seniorzy", "count": 5 }],
    "types":      [{ "slug": "innovation", "name": "Innowacja", "count": 2 }]
  }
}
```

**Errors:** `422` validation, `500`.

```bash
curl "{{BASE_URL}}/content/search?q=seniorzy&type=innovation,guide&category=gotowe-innowacje&page=1&limit=20"
```

---

### `GET /content/search/popular`

**Purpose:** "Most searched" terms.

**Query params:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `limit` | int | `5` | 1–50 |

**Response `200`:**

```json
{ "data": [ { "term": "innowacje dla seniorów", "searches": 120 } ] }
```

Ordered by `searches` desc.

**Errors:** `422` validation, `500`.

```bash
curl "{{BASE_URL}}/content/search/popular?limit=5"
```

---

### `POST /contact`

**Purpose:** Submit the "Contact us" form. Stores the message and sends an acknowledgement email.

**Request body:**

```json
{ "name": "Jan Kowalski", "email": "jan@example.com", "subject": "Pytanie", "message": "Dzień dobry, proszę o kontakt." }
```

| Field | Required | Rules |
|-------|----------|-------|
| `name` | yes | 2–200 chars, trimmed |
| `email` | yes | valid email, ≤ 320 chars; trimmed + lowercased |
| `subject` | no | ≤ 300 chars |
| `message` | yes | 10–5000 chars, trimmed |

**Response `202 Accepted`:**

```json
{ "message": "Thank you. We received your message and will get back to you soon." }
```

**Errors:**

| HTTP | `code` | When |
|------|--------|------|
| `400` | `BAD_REQUEST` | Malformed JSON. |
| `422` | `VALIDATION_ERROR` | Missing/invalid fields; `details` lists each. |
| `429` | `TOO_MANY_REQUESTS` | Sensitive rate limiter (10 requests / 15 min / IP). |

Example `422`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "path": "email", "message": "Invalid email" },
      { "path": "message", "message": "Message must be at least 10 characters" }
    ]
  }
}
```

```bash
curl -i -X POST "{{BASE_URL}}/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jan Kowalski","email":"jan@example.com","subject":"Pytanie","message":"Dzień dobry, proszę o kontakt."}'
```

---

## 6. UI mapping table

| Frontend element | Endpoint | Fields to render |
|------------------|----------|------------------|
| **Search bar** (query + filters + result list) | `GET /content/search` | `data[].thumbnailUrl`, `data[].title`, `data[].excerpt`, `data[].typeLabel` (badge), `data[].publishedAt`, `data[].category.name`, `data[].topics[].name`; `meta.*` for paging; `facets.categories/topics/types` (`{slug,name,count}`) for filter chips. Link each result to `/materials/:slug`. |
| **Category tiles + counters** | `GET /content/categories` | `data[].name`, `data[].description`, `data[].icon`, `data[].accent`, `data[].materialCount`, `data[].slug`. Clicking a tile → `GET /content/materials?category=<slug>`. |
| **Popular topic chips** | `GET /content/topics` | `data[].name`, `data[].icon`, `data[].materialCount`, `data[].slug`. Clicking a chip → `GET /content/materials?topic=<slug>`. |
| **"Featured innovations"** | `GET /content/materials/featured` or `home.featured` | `data[].thumbnailUrl`/`coverUrl`, `data[].title`, `data[].excerpt`, `data[].badge` (or `typeLabel`), `data[].author`, `data[].region`, `data[].topics[].name`; link to `data[].slug`. |
| **"Reports & publications"** | `GET /content/reports` (or `home.reports`) | `data[].title`, `data[].excerpt`, `data[].badge`, `data[].pages` (e.g. "48 pages"), `data[].fileType`, `data[].fileSizeBytes`, `data[].publishedAt`, `data[].category.name`. |
| **"Download PDF"** | `GET /content/reports` for the `fileUrl`, then either `data[].fileUrl` directly or `GET /content/materials/:id/download` | Use `fileUrl` for a direct link, or build `{{BASE_URL}}/content/materials/${data[].id}/download` for a tracked/attachment download (`302` → file). If `fileUrl` is `null`, hide the button. |
| **"Learn & act"** | `GET /content/learning` (or `home.learning`) | `data[].thumbnailUrl`, `data[].title`, `data[].excerpt`, `data[].badge`, `data[].typeLabel`, `data[].durationSeconds` (format mm:ss), `data[].videoUrl` (if present, open video), `data[].format`. |
| **"Most searched"** | `GET /content/search/popular` (or `home.mostSearched`) | `data[].term` (clickable → runs `GET /content/search?q=<term>`), `data[].searches` (optional count). |
| **"See all / See more"** | `GET /content/materials` with active filters (`type`, `category`, `topic`, `featured`, `sort`, `page`, `limit`) | List card fields from `MaterialSummary`; read `meta.total`, `meta.totalPages`, `meta.page` for the pager. Clicking a card → `GET /content/materials/:slug`. |
| **Material detail page** | `GET /content/materials/:slug` | `title`, `typeLabel`/`badge`, `coverUrl`, `body` (HTML), `gallery[]`, `attachments[]` (`name`, `url`, `type`, `sizeBytes`), `related[]` (render as cards), `author`, `region`, `tags[]`, `topics[]`, `category.name`, `publishedAt`, `videoUrl`, `durationSeconds`, `pages`. |
| **Landing page (single request)** | `GET /content/home` | `categories`, `topics`, `featured`, `reports`, `learning`, `mostSearched` — feed each section above. |
| **"Contact us" form** | `POST /contact` | Send `{name, email, subject?, message}`; on `202` show the returned `message`; on `422` map `error.details[].path` → field errors. |

---

## 7. Ready-to-paste TypeScript client (`src/lib/api.ts`)

This client is framework-agnostic (works in React/Vue/Svelte), typed, handles `304` via an
in-memory ETag cache, and parses `422` validation details. Adjust `BASE_URL` to your bundler's env
variable name if different.

```ts
// src/lib/api.ts

/**
 * Base URL of the backend Content API.
 * Set VITE_API_BASE_URL (Vite) / NEXT_PUBLIC_API_BASE_URL (Next) in your .env.
 */
export const BASE_URL = (
  (typeof import.meta !== 'undefined' &&
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      ?.VITE_API_BASE_URL) ??
  (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_BASE_URL : undefined) ??
  'http://localhost:4000'
).replace(/\/+$/, '');

/* ------------------------------- Types ---------------------------------- */

export type MaterialType =
  | 'innovation'
  | 'report'
  | 'publication'
  | 'guide'
  | 'webinar'
  | 'checklist'
  | 'video'
  | 'challenge_map'
  | 'case_study';

export type MaterialFormat = 'article' | 'pdf' | 'video' | 'map';
export type ReportType = 'report' | 'publication';
export type LearningType = 'guide' | 'webinar' | 'checklist';
export type CategoryAccent = 'blue' | 'rose' | 'emerald' | 'violet' | 'amber' | 'teal';
export type IconKey =
  | 'lightbulb'
  | 'file-text'
  | 'graduation-cap'
  | 'play'
  | 'map-pin'
  | 'users'
  | 'heart-pulse'
  | 'accessibility'
  | 'wifi'
  | 'users-round'
  | 'user-round';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  accent: string;
  materialCount: number;
  sortOrder: number;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  icon: string;
  materialCount: number;
}

export interface CategoryRef {
  id: string;
  slug: string;
  name: string;
}

export interface TopicRef {
  id: string;
  slug: string;
  name: string;
}

export interface MaterialSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  type: string;
  typeLabel: string;
  format: string;
  publishedAt: string | null;
  updatedAt: string;
  coverUrl: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  category: CategoryRef | null;
  topics: TopicRef[];
  author: string | null;
  region: string | null;
  language: string;
  isFeatured: boolean;
  fileUrl: string | null;
  fileType: string | null;
  fileSizeBytes: number | null;
  durationSeconds: number | null;
  pages: number | null;
  videoUrl: string | null;
  /** Present on featured / reports / learning list items. */
  badge?: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  sizeBytes: number | null;
}

export interface MaterialDetail extends MaterialSummary {
  body: string | null;
  gallery: string[];
  attachments: Attachment[];
  related: MaterialSummary[];
}

export interface Facet {
  slug: string;
  name: string;
  count: number;
}

export interface Facets {
  categories: Facet[];
  topics: Facet[];
  types: Facet[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface SearchResult extends Paginated<MaterialSummary> {
  facets: Facets;
}

export interface PopularSearch {
  term: string;
  searches: number;
}

export interface HomeAggregate {
  categories: Category[];
  topics: Topic[];
  featured: MaterialSummary[];
  reports: MaterialSummary[];
  learning: MaterialSummary[];
  mostSearched: PopularSearch[];
}

export interface ContactInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface ContactAccepted {
  message: string;
}

export interface FieldError {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: FieldError[];
  };
}

/* --------------------------- Query param types --------------------------- */

export interface MaterialsQuery {
  type?: MaterialType | MaterialType[] | string;
  category?: string;
  topic?: string | string[];
  featured?: boolean;
  search?: string;
  sort?: 'publishedAt' | '-publishedAt' | 'title';
  page?: number;
  limit?: number;
}

export interface FeaturedQuery {
  limit?: number;
  topic?: string | string[];
  category?: string;
}

export interface ReportsQuery {
  type?: ReportType;
  year?: number;
  topic?: string | string[];
  category?: string;
  sort?: 'publishedAt' | '-publishedAt' | 'title';
  page?: number;
  limit?: number;
}

export interface LearningQuery {
  type?: LearningType;
  topic?: string | string[];
  category?: string;
  sort?: 'publishedAt' | '-publishedAt' | 'title';
  page?: number;
  limit?: number;
}

export interface SearchQuery {
  q?: string;
  type?: MaterialType | MaterialType[] | string;
  category?: string;
  topic?: string | string[];
  page?: number;
  limit?: number;
}

/* ------------------------------ Error class ------------------------------ */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: FieldError[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.error?.message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.error?.code ?? 'UNKNOWN';
    this.details = body.error?.details ?? [];
  }

  /** Convenience: map field errors to `{ field: message }` for form UIs. */
  fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((d) => [d.path, d.message]));
  }
}

/* ---------------------------- Fetch wrapper ------------------------------ */

type CacheEntry = { etag: string; data: unknown };
/** In-memory ETag cache keyed by request URL. */
const etagCache = new Map<string, CacheEntry>();

function toCsv(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.length > 0 ? value.join(',') : undefined;
  return value.trim() !== '' ? value : undefined;
}

function buildQuery(params: Record<string, unknown> | undefined): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null || raw === '') continue;
    let value: string;
    if (Array.isArray(raw)) {
      value = toCsv(raw as string[]) ?? '';
      if (value === '') continue;
    } else if (key === 'type' || key === 'topic') {
      value = toCsv(raw as string | string[]) ?? '';
      if (value === '') continue;
    } else {
      value = String(raw);
    }
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {
    error: { code: 'UNKNOWN', message: `Request failed with status ${response.status}` },
  };
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    /* non-JSON error body (e.g. proxy) — keep fallback */
  }
  return new ApiError(response.status, body);
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, unknown>;
  /** Use the ETag cache + send If-None-Match (GET only). Default true. */
  useCache?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, useCache = method === 'GET' } = options;
  const url = `${BASE_URL}${path}${buildQuery(query)}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const cached = useCache ? etagCache.get(url) : undefined;
  if (cached) headers['If-None-Match'] = cached.etag;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    // Let the browser use its own HTTP cache for automatic revalidation; the
    // manual ETag handling below still works because we send If-None-Match.
    credentials: 'omit',
  });

  // 304 Not Modified: the server confirms the cached body is still valid.
  if (response.status === 304) {
    if (cached) return cached.data as T;
    throw new ApiError(304, {
      error: { code: 'NOT_MODIFIED', message: 'Not Modified but no cached copy available' },
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as T;

  if (useCache) {
    const etag = response.headers.get('ETag');
    // Cross-origin note: ETag is only readable if the backend sends
    // Access-Control-Expose-Headers: ETag. If absent, caching is skipped
    // and the browser HTTP cache handles revalidation transparently.
    if (etag) etagCache.set(url, { etag, data });
  }

  return data;
}

/* ------------------------------- Endpoints ------------------------------- */

/** GET /content/home — one request for the landing page. */
export function getHome(): Promise<HomeAggregate> {
  return request<HomeAggregate>('/content/home');
}

/** GET /content/categories — category tiles + published counters. */
export function getCategories(): Promise<Category[]> {
  return request<{ data: Category[] }>('/content/categories').then((r) => r.data);
}

/** GET /content/topics — topic chips + published counters. */
export function getTopics(): Promise<Topic[]> {
  return request<{ data: Topic[] }>('/content/topics').then((r) => r.data);
}

/** GET /content/materials — filtered, sorted, paginated material list. */
export function getMaterials(query: MaterialsQuery = {}): Promise<Paginated<MaterialSummary>> {
  return request<Paginated<MaterialSummary>>('/content/materials', {
    query: query as Record<string, unknown>,
  });
}

/** GET /content/materials/featured — featured materials (with badge). */
export function getFeaturedMaterials(query: FeaturedQuery = {}): Promise<MaterialSummary[]> {
  return request<{ data: MaterialSummary[] }>('/content/materials/featured', {
    query: query as Record<string, unknown>,
  }).then((r) => r.data);
}

/** GET /content/materials/:slug — full material detail. */
export function getMaterial(slug: string): Promise<MaterialDetail> {
  return request<MaterialDetail>(`/content/materials/${encodeURIComponent(slug)}`);
}

/**
 * Build the download URL for a material. Use it in an <a href> or
 * `window.location.href` so the browser follows the 302 redirect and saves
 * the file with the server-provided Content-Disposition filename.
 */
export function getMaterialDownloadUrl(id: string): string {
  return `${BASE_URL}/content/materials/${encodeURIComponent(id)}/download`;
}

/** GET /content/reports — reports & publications (badge + pages). */
export function getReports(query: ReportsQuery = {}): Promise<Paginated<MaterialSummary>> {
  return request<Paginated<MaterialSummary>>('/content/reports', {
    query: query as Record<string, unknown>,
  });
}

/** GET /content/learning — guides / webinars / checklists. */
export function getLearning(query: LearningQuery = {}): Promise<Paginated<MaterialSummary>> {
  return request<Paginated<MaterialSummary>>('/content/learning', {
    query: query as Record<string, unknown>,
  });
}

/** GET /content/search — search with facets. */
export function searchContent(query: SearchQuery = {}): Promise<SearchResult> {
  return request<SearchResult>('/content/search', {
    query: query as Record<string, unknown>,
  });
}

/** GET /content/search/popular — most searched terms. */
export function getPopularSearches(limit = 5): Promise<PopularSearch[]> {
  return request<{ data: PopularSearch[] }>('/content/search/popular', {
    query: { limit },
  }).then((r) => r.data);
}

/** POST /contact — submit the contact form. */
export function submitContact(input: ContactInput): Promise<ContactAccepted> {
  return request<ContactAccepted>('/contact', {
    method: 'POST',
    body: input,
    useCache: false,
  });
}

/* ------------------------------ Helpers ---------------------------------- */

/** Format `durationSeconds` (e.g. 3720) as "62:00" / "1:02:00". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Format `fileSizeBytes` as "1.2 MB". */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
```

### Rendering a validation error in a form

```ts
import { submitContact, ApiError } from '@/lib/api';

try {
  await submitContact({ name, email, subject, message });
  setStatus('sent');
} catch (err) {
  if (err instanceof ApiError && err.status === 422) {
    const fields = err.fieldErrors(); // { email: 'Invalid email', message: '...' }
    setErrors(fields);
  } else {
    setStatus('error');
  }
}
```

---

## 8. Migration notes for the existing `src/lib/api.ts`

If `src/lib/api.ts` already exists in the frontend repo:

1. **Keep the existing `BASE_URL` / env handling.** Prefer exposing a single exported `BASE_URL`
   and reuse it for the download URL builder (`getMaterialDownloadUrl`).
2. **Add the Content types** exactly as in [section 7](#7-ready-to-paste-typescript-client-srclibapits).
   Names to standardize on: `Category`, `Topic`, `MaterialSummary`, `MaterialDetail`, `Attachment`,
   `Facet`, `Facets`, `Paginated<T>`, `PaginationMeta`, `SearchResult`, `HomeAggregate`,
   `PopularSearch`, `ContactInput`.
3. **Do not rename backend fields.** The API returns `camelCase` (`typeLabel`, `thumbnailUrl`,
   `fileSizeBytes`, `durationSeconds`, `publishedAt`, `materialCount`) — keep them as-is so there is
   no mapping layer to drift.
4. **Naming convention for functions:** `getHome`, `getCategories`, `getTopics`, `getMaterials`,
   `getFeaturedMaterials`, `getMaterial`, `getMaterialDownloadUrl`, `getReports`, `getLearning`,
   `searchContent`, `getPopularSearches`, `submitContact`. If the existing file already exposes
   differently-named helpers, add these as the canonical content helpers rather than breaking
   existing call sites.
5. **Unify error handling.** Replace any ad-hoc `throw new Error(await res.text())` with the
   `ApiError` class and `parseError`, so UI code can branch on `err.status` (`404`, `422`, `429`)
   and read `err.details` / `err.fieldErrors()`.
6. **`304` handling.** If the existing client sets `cache: 'no-store'`, remove it so the browser can
   revalidate. If you want the manual ETag cache, keep the wrapper in section 7; otherwise omit the
   `etagCache` and still handle `response.status === 304` before `response.json()`.
7. **Pagination defaults.** Mirror the backend: `page=1`, `limit=20`, `limit <= 100`. Guard your UI
   against requesting `limit > 100` (it returns `422`).
8. **Reports/learning/featured `badge`.** Use the server-computed `badge` (or `typeLabel`) rather
   than re-deriving labels from `type` on the client.
9. **Downloads.** Do not `fetch()` the download endpoint and try to read the body — it is a `302`
   redirect. Use `getMaterialDownloadUrl(id)` in an anchor, or link directly to `fileUrl`.

---

## 9. Testing checklist

Run these against a running backend (local `http://localhost:4000` or production). `-s -o /dev/null -w "%{http_code}"`
prints only the status code.

```bash
# 1. Home aggregate — expect 200
curl -s -o /dev/null -w "%{http_code}\n" "{{BASE_URL}}/content/home"

# 2. Categories — expect 200
curl -s -o /dev/null -w "%{http_code}\n" "{{BASE_URL}}/content/categories"

# 3. Topics — expect 200
curl -s -o /dev/null -w "%{http_code}\n" "{{BASE_URL}}/content/topics"

# 4. Materials (defaults) — expect 200, inspect meta
curl -s "{{BASE_URL}}/content/materials?limit=5" | jq '.meta'

# 5. Materials with CSV filters — expect 200
curl -s -o /dev/null -w "%{http_code}\n" "{{BASE_URL}}/content/materials?type=guide,webinar&topic=seniorzy"

# 6. Invalid limit > 100 — expect 422 VALIDATION_ERROR
curl -s -o /dev/null -w "%{http_code}\n" "{{BASE_URL}}/content/materials?limit=101"
curl -s "{{BASE_URL}}/content/materials?limit=101" | jq '.error.code, .error.details'

# 7. Invalid sort — expect 422
curl -s -o /dev/null -w "%{http_code}\n" "{{BASE_URL}}/content/materials?sort=nope"

# 8. Featured — expect 200 and every item has `badge`
curl -s "{{BASE_URL}}/content/materials/featured?limit=4" | jq '.data[0].badge'

# 9. Material detail (use a real slug from step 4) — expect 200 with body/gallery/attachments/related
curl -s "{{BASE_URL}}/content/materials/innowacja-telefon-zaufania-seniora" | jq 'keys'

# 10. Missing/draft slug — expect 404 NOT_FOUND
curl -s -o /dev/null -w "%{http_code}\n" "{{BASE_URL}}/content/materials/does-not-exist"
curl -s "{{BASE_URL}}/content/materials/does-not-exist" | jq '.error.code'

# 11. Download (replace with a real UUID from step 4) — expect 302 + Location + Content-Disposition
curl -s -i "{{BASE_URL}}/content/materials/5d206a7a-a85a-4e34-95fd-5618b5edfe62/download" \
  | grep -iE "^(HTTP|location|content-disposition)"

# 12. Download for a non-file material (e.g. an innovation) — expect 404
curl -s -o /dev/null -w "%{http_code}\n" "{{BASE_URL}}/content/materials/00000000-0000-0000-0000-000000000000/download"

# 13. Reports — expect 200, items have `badge` and `pages`
curl -s "{{BASE_URL}}/content/reports?type=report&limit=5" | jq '.data[0] | {badge, pages, fileUrl}'

# 14. Learning webinars — expect 200, webinars have videoUrl/durationSeconds
curl -s "{{BASE_URL}}/content/learning?type=webinar&limit=5" | jq '.data[0] | {type, videoUrl, durationSeconds}'

# 15. Search + facets — expect 200, facets.categories/topics/types populated
curl -s "{{BASE_URL}}/content/search?q=seniorzy&limit=5" | jq '.facets'

# 16. Popular searches — expect 200
curl -s "{{BASE_URL}}/content/search/popular?limit=5" | jq '.data'

# 17. ETag round-trip — first call returns 200 + ETag; second with If-None-Match returns 304
ETAG=$(curl -s -D - -o /dev/null "{{BASE_URL}}/content/categories" | awk -F': ' 'tolower($1)=="etag"{print $2}' | tr -d '\r')
echo "ETag: $ETAG"
curl -s -o /dev/null -w "%{http_code}\n" -H "If-None-Match: $ETAG" "{{BASE_URL}}/content/categories"   # expect 304

# 18. Contact success — expect 202
curl -s -o /dev/null -w "%{http_code}\n" -X POST "{{BASE_URL}}/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jan Kowalski","email":"jan@example.com","subject":"Pytanie","message":"Dzień dobry, proszę o kontakt."}'

# 19. Contact validation failure — expect 422 with details
curl -s -o /dev/null -w "%{http_code}\n" -X POST "{{BASE_URL}}/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"J","email":"not-an-email","message":"short"}'
curl -s -X POST "{{BASE_URL}}/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"J","email":"not-an-email","message":"short"}' | jq '.error.details'

# 20. Malformed JSON — expect 400 BAD_REQUEST
curl -s -o /dev/null -w "%{http_code}\n" -X POST "{{BASE_URL}}/contact" \
  -H "Content-Type: application/json" -d '{bad json'
```

Expected status codes summary:

| Check | Expected |
|-------|----------|
| `/content/home`, `/categories`, `/topics`, `/materials`, `/materials/featured`, `/materials/:slug`, `/reports`, `/learning`, `/search`, `/search/popular` | `200` |
| `limit=101` or invalid `sort` | `422` |
| Missing material slug | `404` |
| `/materials/:id/download` (file exists) | `302` |
| `/materials/:id/download` (no file / unknown id) | `404` |
| `/content/categories` with matching `If-None-Match` | `304` |
| `POST /contact` valid | `202` |
| `POST /contact` invalid | `422` |
| `POST /contact` malformed JSON | `400` |

---

*End of document.*
