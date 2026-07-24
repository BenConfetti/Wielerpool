# Backend

Hier komt de gedeelde API. De frontend werkt voorlopig via `frontend/storage.js` met lokale browseropslag.

Het versieerbare API-contract staat in `openapi/v1.yaml`. De uiteindelijke backend moet dit contract implementeren onder `/api/v1`.

Belangrijke afspraken:

- De browser maakt nooit rechtstreeks verbinding met PostgreSQL.
- Ronde-ID is onderdeel van iedere rondegebonden route en databasequery.
- De server valideert budget, teamsamenstelling, deadlines en wisselvensters.
- Adminrechten worden op de server gecontroleerd.
- Teamupdates gebruiken een versienummer om gelijktijdig overschrijven te voorkomen.
- Fouten gebruiken consistente HTTP-statuscodes en het `ApiError`-schema.

## Lokaal starten

Vereist Docker Desktop en een Node.js-runtime.

```powershell
cd "C:\Users\kejes\Documents\Codex\Projecten\_gedeelde-logica"
docker compose up -d postgres
cd backend
Copy-Item .env.example .env
pnpm run setup-db
pnpm start
```

API: `http://127.0.0.1:3000`. Healthcheck: `http://127.0.0.1:3000/api/health`.

De frontend blijft standaard lokaal werken. Gebruik `?storage=api` om API-modus zichtbaar in te schakelen; read-only verzoeken zijn beschikbaar via `POOL_STORAGE.api`.