# EasyTask — guida d'uso del logo

**Idea:** pillole che rientrano (task e sotto-task) collegate da un dorso ad albero; insieme formano una **E**.

## Colori
| Nome | HEX | Uso |
|---|---|---|
| Inchiostro | `#16181D` | Simbolo e wordmark su sfondi chiari |
| Arancio EasyTask | `#FB9551` | Accento (pillola in basso). È `--primary` dell'app, `oklch(0.7637 0.1477 52.33)` |
| Bianco | `#FFFFFF` | Simbolo e wordmark su sfondi scuri |

Su sfondo scuro usare sempre le versioni `*-reversed` (l'inchiostro sparisce sul nero).

## File
- `master/`: `symbol`, `symbol-small` (per 16–32 px), `lockup-horizontal`, `lockup-stacked`, ciascuno normale e `-reversed`.
- `variants/`: nero, bianco, monocromatico, quadrato, favicon, icona app, PNG 1200 px.
- `icons/`: favicon.ico, PNG 16/32/48/192/512, apple-touch, maskable, webmanifest, `head-snippet.html`.
- `presentation/`: slide con mockup e scheda di test.

## Regole
- **Dimensione minima:** simbolo 16 px (usare `symbol-small` sotto i 32 px); lockup orizzontale 96 px di larghezza.
- **Spazio libero:** almeno l'altezza di una pillola (circa 1/6 dell'altezza del simbolo) su ogni lato.
- **Sfondi:** chiari con la versione inchiostro; scuri con `-reversed`; su arancio usare la versione monocromatica bianca.
- **Un colore:** esistono versioni nere, bianche e mono; l'accento diventa dello stesso colore del resto.
- **Da evitare:** cambiare l'accento, ruotare o distorcere, aggiungere ombre o gradienti, riscrivere il wordmark con un font.

## Note tecniche
- Il wordmark è costruito a tracciati (nessun testo live). Il simbolo usa tracciati con stroke: prima di stampa o incisione espandere gli stroke in Illustrator/Inkscape.
- Non è stata fatta alcuna verifica di marchio: prima di un uso commerciale serve una ricerca su banche dati e ricerca per immagini.
