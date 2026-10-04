# Małopolski Hub Innowacji Społecznych

Platforma, która łączy realny problem społeczny z gotowym rozwiązaniem: katalogiem innowacji ROPS, bazą wiedzy, kreatorem pomysłów, 
testami w terenie i asystentem AI. Full-stack, wdrożona w Dockerze.

##Demo na żywo:
**wejdź na strone:** https://hackathon-frontend.makonew.com/  
**konto admina** - email: jan@example.com | hasło: HackYeah123!

**API (produkcja):** https://hackathon-backend.makonew.com/ — `GET /health`, `GET /openapi.json`

---

## Problem i rozwiązanie

**Problem:** wiedza o innowacjach społecznych w regionie jest rozproszona. Gmina, NGO czy mieszkaniec z konkretnym problemem (samotność seniorów, wykluczenie cyfrowe, transport na wsi) nie wie, że obok funkcjonuje już sprawdzone rozwiązanie — ani od czego zacząć.

**Rozwiązanie:** jeden hub, który:
1. porządkuje wiedzę — kategorie, tematy, raporty, webinary, poradniki, granty,
2. dopasowuje opis problemu do istniejących programów i innowacji (asystent AI + wyszukiwanie semantyczne),
3. pozwala zgłosić własny pomysł w kreatorze i oddać go do oceny administratora,
4. domyka pętlę: testy innowacji, zgłoszenia problemów mieszkańców i panel administratora z analityką.

---



>Rejestracja zwykłego użytkownika: `/register`.

---

## Funkcje

### Baza wiedzy (serce platformy)
- Strona główna z kategoriami i licznikami materiałów: **Gotowe innowacje**, **Raporty i publikacje**, **Ucz się i działaj**, **Webinary**, **Mapy wyzwań**, **Dobra praktyka**.
- Popularne tematy (Seniorzy, Wykluczenie cyfrowe, Wolontariat, Młodzież, Niepełnosprawność, Zdrowie psychiczne).
- Polecane innowacje i materiały, raporty z pobieraniem PDF, webinary wideo.
- Pełnotekstowe wyszukiwanie z fasetami (kategorie, tematy, typ, format, region), popularne frazy, strona materiału z galerią i plikami.

### Asystent AI
- Hero na stronie głównej + pływający czat (`/chat`) — rozmowa o problemie i dopasowanie do programów/innowacji z regionu.
- Wyszukiwanie semantyczne z użyciem pgvector (indeks HNSW, cosine) i stabilną paginacją wyników; embeddingi i odpowiedzi generuje zewnętrzny model AI (klucz wyłącznie po stronie serwera).

### Dopasowanie i zgłaszanie
- **Dopasowanie innowacji** (`/matchmaking`) — opis problemu → do 5 rekomendacji z uzasadnieniem i źródłami; zbieranie feedbacku (przydatne/nieprzydatne).
- **Kreator pomysłów** (`/kreator`) — wieloetapowe zgłoszenie innowacji (problem, odbiorcy, koszty, zespół), zapis wersji roboczej.
- **Zgłoś problem społeczny** (`/zglos-problem`) — lokalne wyzwanie z kategorią i lokalizacją; trafia do panelu admina.
- **Tester innowacji** (`/tester`) — zapisy na pilotaże, „moje zgłoszenia”, formularz feedbacku po testach.

### Panel administratora
- Dashboard (`/admin`): użytkownicy, zgłoszenia, problemy, testy, wykres aktywności 14 dni, ostatnia aktywność.
- Zatwierdzanie/odrzucanie innowacji (`/admin/innowacje`) z filtrami i wyszukiwaniem.
- Obsługa zgłoszeń problemów ze statusami (`new → in_review → planned → resolved/rejected`) i odpowiedzią admina.
- Panel cache LLM (`/admin/cache`) oraz wbudowany panel testowy API (`/panel`, tylko dev).

---

## Stack technologiczny

**Frontend**
- React 19 + TypeScript, Vite 8, React Router 7
- Tailwind CSS 4, własne komponenty UI, Lucide Icons
- Typy API generowane z OpenAPI (`web/api-types.ts`)
- Produkcja: statyczny build serwowany przez nginx z proxy `/auth`, `/api/v1`, `/content`, `/llm`, `/health`

**Backend**
- Express 5 + TypeScript (ESM / NodeNext), `tsx` (hot reload)
- PostgreSQL 17 + pgvector, Drizzle ORM, migracje SQL w `drizzle/`
- Auth: krótkotrwałe JWT (jose, HS256) + rotujące refresh tokeny (SHA-256 w DB)
- `zod`, `bcrypt`, `helmet`, rate limiting, restrykcyjny CORS

**AI**
- Asystent i embeddingi korzystają z **zewnętrznego modelu AI** (provider OpenAI-compatible: `AI_BASE_URL` + `AI_API_KEY`, klucz wyłącznie po stronie serwera).
- W kodzie jest deterministyczny fallback (regex/słowniki + lokalne embeddingi), używany tylko gdy klucza brak lub provider zawiedzie — to ścieżka awaryjna, nie główna.
- Integracja z zewnętrznym serwisem cache LLM pod `/llm/*`.

**Infra**
- Docker Compose: dev (hot reload + Postgres) i prod (multi-stage, non-root, healthcheck, auto-migracje)
- Monorepo npm workspaces: `backend/` + `frontend/`

---

## Architektura

```
Przeglądarka (React 19 + Vite/nginx)
        │  /auth  /api/v1  /content  /llm  /health
        ▼
API Express 5 + TypeScript
  auth · content · assistant · matchmaking
  innovations · tester · problem-reports · chat · admin
        │                         │
        ▼                         ▼
PostgreSQL 17 + pgvector     Zewnętrzny model AI (OpenAI-compatible)
(Drizzle ORM, HNSW)          + fallback deterministyczny offline
        │
        ▼
Zewnętrzny serwis cache LLM (proxy /llm/*)
```

Kluczowe tabele: `users`, `refresh_tokens`, `materials`/`categories`/`topics`, `innovations`/`sources`/`innovation_citations`/`evidence_documents`, `programs` (vector 256 + HNSW), `innovation_submissions`, `problem_reports`, `innovation_tests`, `tester_applications`, `tester_feedback`, `chat_*`.

---

## Uruchomienie lokalne

### Wariant 1: Docker (najszybszy)

```bash
git clone https://github.com/DYKTA-Hackyeah-2026/imbir.git
cd imbir/backend
cp .env.development.example .env.development
docker compose -f docker-compose.dev.yml up -d     # API :4000 + Postgres :5432 (auto-migracje)

cd ../frontend
npm install
BACKEND_URL=http://localhost:4000 npm run dev      # UI :5173
```

### Wariant 2: lokalnie (bez kontenera API)

```bash
git clone https://github.com/DYKTA-Hackyeah-2026/imbir.git
cd imbir
npm install
docker compose -f backend/docker-compose.dev.yml up -d db

cp backend/.env.development.example backend/.env.development  

npm run db:migrate --workspace backend
npm run dev:backend        # terminal 1 → :4000
npm run dev:frontend       # terminal 2 → :5173

```

### Dane demonstracyjne

```bash
npm run db:seed --workspace backend                    # kategorie, tematy, materiały, frazy
npm run db:seed:innovations --workspace backend        # katalog ROPS: 115 innowacji + źródła
npm run db:seed:assistant --workspace backend          # programy do wyszukiwania semantycznego
npm run db:seed:assistant-innovations --workspace backend
```

### Konto administratora lokalnie

Po migracjach utwórz konto z rolą `admin` (`users.is_admin = true`, hasło bcrypt) albo poproś zespół o skrypt seed. Na produkcji hasło demo zmień na mocne.

---

## API

Pełny kontrakt: [`openapi.json`](https://hackathon-backend.makonew.com/openapi.json) (OpenAPI 3.1) — źródło prawdy dla typów frontendu.

| Obszar | Endpointy |
|---|---|
| Auth | `POST /auth/register`, `/login`, `/refresh` (rotacja), `/logout`, `GET /auth/me`, reset hasła |
| Matchmaking | `POST /api/v1/matchmaking`, `GET /api/v1/innovations/{id}`, `POST /api/v1/matchmaking/{id}/feedback` |
| Asystent | `/api/assistant/*` (rozmowa, wyniki, paginacja) |
| Content | `GET /content/*` (kategorie, materiały, filtry, wyszukiwarka, featured, home aggregate) |
| Tester | `/api/v1/tests`, aplikacje, feedback |
| Problemy | `POST /api/v1/problem-reports`, lista i statusy |
| Admin | `GET /api/v1/admin/stats`, `GET/PATCH /api/v1/admin/submissions/*` |
| LLM cache | `GET /llm/health`, `/llm/models`, `POST /llm/chat/completions`, `/llm/admin/*` |

```bash
curl https://hackathon-backend.makonew.com/health
curl -X POST https://hackathon-frontend.makonew.com/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@hub.local","password":"Admin123!"}'
```

---

## Bezpieczeństwo i RODO

- Hasła hashowane bcrypt; logowanie wyrównuje czas odpowiedzi dla nieistniejących kont.
- Refresh tokeny: 256-bitowe, w bazie tylko SHA-256, rotowane przy każdym użyciu, unieważniane przy wylogowaniu i zmianie hasła.
- Reset hasła: tokeny jednorazowe, hashowane, z TTL.
- `helmet`, CORS z allow-listą, rate limiting na endpointach auth.
- AI traktuje dane wejściowe jako niezaufane (allow-lista); klucze providera wyłącznie po stronie serwera.
- Import katalogu ROPS zawiera tylko publiczne tytuły i krótkie streszczenia — bez danych osobowych.
- Dane syntetyczne są jawnie oznaczane (`synthetic: true`, `mode: "demo"`, `evidenceStatus: "synthetic"`); źródła nigdy nie są zgadywane.

---

## Testy i jakość

```bash
# backend
npm run typecheck --workspace backend
npm run test --workspace backend                  # tsx --test
BASE_URL=http://localhost:4000 npm run test:e2e --workspace backend

# frontend
npm run lint --workspace frontend                 # oxlint
npm run build --workspace frontend                # tsc -b && vite build
```

`npm run verify --workspace backend` = typecheck + testy + build + generowanie typów z OpenAPI.

---

## Ograniczenia i dalsze kroki

- Asystent AI wymaga skonfigurowanego zewnętrznego providera (`AI_API_KEY`); bez niego działa tylko uproszczony fallback deterministyczny (bez generowania odpowiedzi przez LLM).
- E-mail (reset hasła, kontakt) to stub konsolowy — do produkcji podłączyć SMTP/provider.
- Bez importu katalog działa na danych syntetycznych (jawnie oznaczonych) — intencja: „nie zmyślamy źródeł”.
- MVP matchmakingu trzyma embeddingi jako `jsonb`; asystent korzysta już z pgvector/HNSW — plan: ujednolicić.
- Planowane: powiadomienia, eksport raportów, mapa wyzwań, SSO dla JST.

---

## Struktura repo

```
imbir/
├── backend/
│   ├── src/
│   │   ├── modules/auth/          # rejestracja, logowanie, refresh, reset hasła
│   │   ├── modules/assistant/     # asystent AI + wyszukiwanie semantyczne
│   │   ├── modules/content/       # baza wiedzy
│   │   ├── modules/llm-cache/     # klient cache LLM
│   │   ├── routes/                # innovations, tester, problem-reports, admin...
│   │   ├── chat/                  # czat (WebSocket)
│   │   ├── db/                    # schema Drizzle, migracje, seedy
│   │   └── repositories/          # katalog innowacji, import ROPS
│   ├── drizzle/                   # migracje SQL
│   ├── data/import/               # rops-innovations.json (115 rekordów)
│   └── docker-compose*.yml
├── frontend/
│   ├── src/features/              # assistant, matchmaking, innovations, tester, admin, chat
│   ├── src/pages                  # baza wiedzy, kreator, kontakt, granty...
│   └── src/lib                    # API client, auth, admin
└── pgvector/                      # obraz bazy z pgvector
```
