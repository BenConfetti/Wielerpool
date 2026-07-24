# Wielerpool gedeelde applicatie

Dit is voortaan de enige bron voor structurele wijzigingen aan logica, regels en UI.

## Structuur

- `frontend/`: gedeelde browserapp voor alle rondes.
- `rounds/`: rondeconfiguraties, waaronder Tour 2026 en Vuelta 2026.
- `frontend/data/`: ronde-eigen startlijsten, prijzen, teams en uitslagen.
- `backend/`: API-contract en later de gedeelde API-implementatie.
- `database/`: genummerde PostgreSQL-migraties en later seeddata.
- `tests/`: gedeelde tests.

De oude `Tour 2026/src/webapp` en `Vuelta 2026/src/webapp` blijven tijdelijk als terugvalkopie bestaan, maar worden niet meer aangepast.

## Lokaal starten

Vanuit deze map:

```powershell
.\start-pool.ps1 -Round vuelta-2026 -Port 8125
```

Of:

```powershell
.\start-pool.ps1 -Round tour-2026 -Port 8124
```

De gedeelde URLs zijn:

- `http://127.0.0.1:8125/frontend/?round=vuelta-2026`
- `http://127.0.0.1:8124/frontend/?round=tour-2026`

`start.ps1` in de Tour- en Vuelta-map verwijst eveneens naar deze gedeelde frontend.

## Opslag en toekomstige API

`frontend/storage.js` is de enige toegang tot browseropslag. `app.js` gebruikt geen directe `localStorage` meer. De lokale adapter biedt onder andere `getRound`, `saveTeam`, `getStandings`, `getState` en `saveState`. Later kan deze adapter door API-aanroepen worden vervangen.

Het beoogde API-contract staat in `backend/openapi/v1.yaml`. Het databaseschema staat in `database/migrations/`.

## Nieuwe ronde

1. Kopieer `config/round-template.json` naar `rounds/<ronde-id>.json`.
2. Vul thema, instellingen, truien, etappes en bestanden in.
3. Plaats rondebestanden in `frontend/data/`.
4. Open `frontend/?round=<ronde-id>`.
