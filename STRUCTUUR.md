# Wielerpool basisstructuur

Deze map is de gedeelde basis voor meerdere grote rondes.

## Afspraak

- Structurele verbeteringen aan logica, regels of UI komen vanaf nu ook in deze basisapp.
- Ronde-inhoud blijft per ronde apart: startlijst, prijzen, etappes, uitvallers, teams, rustdagen, trui-thema en status.
- De Tour 2026 blijft voorlopig de levende testversie.
- Als de Tour klaar is, kan die ronde worden bevroren. Nieuwe basisverbeteringen hoeven dan niet automatisch met terugwerkende kracht op die Tourstand te worden doorgerekend.

## Mappen

- `src/webapp`: gedeelde webapp en poollogica.
- `config/round-template.json`: template voor een nieuwe ronde.
- `rounds/tour-2026.json`: huidige Tour-config.
- `rounds/vuelta-2026.json`: startconfig voor de Vuelta.
- `docs`: gedeelde spelregels en ontwerpnotities.
- `tests`: gedeelde tests.

## Per ronde configureerbaar

- naam, jaar, competitie en status
- valuta
- localStorage-prefix
- inleg per deelnemer
- verdeling van de totale pot tussen eindklassementen en dagprijzen
- budget
- aantal etappes
- aantal starters en reserves
- scoringdiepte per klassement
- prijzenschema
- rustdag-/wisselvensters
- truien en themakleuren
- startlijst
- rennerprijzen
- uitslagen/importbestanden
- uitvallers
- deelnemers en teams
- handmatige correcties

## Volgende technische stap

De huidige basisapp is nog een kopie van de Tour-app. De volgende stap is de hardcoded Tour-waarden in `src/webapp/app.js` vervangen door waarden uit `rounds/*.json`.

Belangrijkste hardcoded waarden die eruit moeten:

- `tour-2026-...` bestandsnamen
- `Tour 2026` schermtekst
- `REST_DAY_AFTER_STAGES`
- trui-kleuren en bolletjespatroon
- scoringdiepte jongeren/rest
- `EUR`
- algemene localStorage keys zoals `wielerpool-state`
