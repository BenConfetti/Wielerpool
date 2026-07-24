# Database

PostgreSQL-schema voor de gedeelde wielerpool.

## Migraties

Migraties staan in `migrations/` en worden altijd op bestandsnaamvolgorde uitgevoerd:

1. `001_initial_schema.sql` – gebruikers, rondes, deelnemers, renners, teams, etappes, uitslagen, uitvallers, wissels, correcties, sessies en adminlog.
2. `002_add_prize_split.sql` – percentage eindklassementen versus dagprijzen, inclusief databasecontroles op 100%.
3. `003_add_exchange_windows.sql` – configureerbare wisselvensters.

Handmatig toepassen op een lege lokale database:

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f migrations/001_initial_schema.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f migrations/002_add_prize_split.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f migrations/003_add_exchange_windows.sql
```

Gebruik afzonderlijke databases voor lokaal, staging en productie. Wijzig een reeds toegepaste migratie niet; voeg voor iedere volgende wijziging een nieuw genummerd bestand toe.
