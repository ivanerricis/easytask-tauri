# Changelog (italiano)

Versione italiana di [CHANGELOG.md](CHANGELOG.md): è il testo che l'app mostra nelle novità di un aggiornamento quando la lingua scelta è l'italiano. Ogni versione ha qui la stessa sezione che ha nell'originale inglese (la CI lo controlla).

## [Unreleased]

### Corretto

- Il campo descrizione della sidebar di destra ha un'altezza minima fissa.
- Una sola regola per il testo sul colore d'accento (pulsanti, opzioni selezionate, la spunta): il `--primary-foreground` scuro o bianco, anche all'avvio del tema chiaro, prima che sia calcolato dall'accento.
- Aprendo una sidebar non si vede più per un istante il contenuto schiacciato (testo in verticale): il contenuto mantiene la larghezza finale mentre il pannello si apre.
- Il testo dei pulsanti principali (e di ciò che sta sul colore d'accento) è scuro o bianco secondo l'accento: era sempre bianco, 1,8:1 sull'arancione predefinito.
- Il bordo di una casella vuota e dei campi di testo arriva a 3:1 sul tema scuro (era 2,8:1).
- Ctrl+Z subito dopo "Sposta su/giù" (o un trascinamento) lo annulla: prima non faceva nulla finché lo spostamento non era salvato.

### Aggiunto

- Un pulsante nell'intestazione della sidebar sinistra per creare una nota da un template: si sceglie il template (con una casella di ricerca), poi il nome e la cartella della nota. La sidebar non può più essere più stretta di 224 px (era 200) perché i sei pulsanti dell'intestazione ci stiano.
- Le novità nella dialog di aggiornamento e in Impostazioni > Informazioni sono mostrate nella lingua dell'app (italiano o inglese). Vengono da `CHANGELOG.md` e dal nuovo `CHANGELOG.it.md`, che i controlli di release richiedono per ogni versione.

## [0.3.0] - 2026-10-02

### Aggiunto

- "Sposta su" / "Sposta giù" nel menu di task, sottotask e sezioni ("Sposta a sinistra" / "Sposta a destra" per i gruppi): un'alternativa al trascinamento, usabile anche da tastiera. I task completati nascosti vengono saltati e lo spostamento si può annullare.
- Dialog dei Template: un pulsante "Nuovo template" per creare un template da una qualsiasi nota del workspace (una casella di ricerca elenca le note con la loro cartella), in alternativa al menu della nota.
- Lettore audio: pulsante per ripartire dall'inizio, pulsante per silenziare, pulsante per la velocità di riproduzione (da 0,75x a 2x), `Alt+P` per riprodurre o mettere in pausa da qualsiasi punto del workspace (si può cambiare in Impostazioni > Scorciatoie), e titolo e stato mostrati al sistema (controlli multimediali di Windows).
- Lettore audio: pulsanti per andare indietro e avanti di 15 secondi (i tasti di ricerca del sistema usano lo stesso passo) e controlli di riproduzione su una riga a parte.
- I file audio di un gruppo mostrano cosa stanno facendo: barre mentre suonano, pausa, un quadrato di stop quando il brano è finito.
- "Ripristina tutto" per la pagina Aspetto (tema, colore d'accento, lingua, dimensione di cartelle e note, intensità dei colori), con conferma.

### Modificato

- Cliccando il file audio caricato lo si mette in pausa o lo si riprende, invece di farlo ripartire (a questo serve il nuovo pulsante per ripartire).
- Tutte le conferme (sposta nel cestino, elimina definitivamente, svuota il cestino, ripristina o elimina un backup, sovrascrivi un template, ripristina le scorciatoie o l'aspetto, "file non trovato") sono un'unica dialog con lo stesso aspetto: pulsante di chiusura, "Annulla" a sinistra e l'azione, con un'icona, a destra. Titolo e pulsante sono rossi solo quando si perdono dati. Anche i pulsanti principali delle altre dialog (nuova cartella, nota, workspace, rinomina...) hanno un'icona.
- La descrizione di un task è un'icona accanto al contatore dei sottotask (e la prima icona della barra che compare quando il puntatore è sul task), invece di un'icona isolata su una riga sotto il task.
- I pulsanti della finestra usano il colore del testo invece dell'accento (illeggibile sul tema chiaro), il pulsante ingrandisci diventa "ripristina" mentre la finestra è ingrandita, la chiusura diventa rossa al passaggio del mouse e ci sono i tooltip.
- Lettore audio: il titolo ha una riga tutta sua (al massimo due righe, il nome intero nel tooltip), la maniglia è la stessa dei gruppi e i brani più lunghi di un'ora mostrano le ore.
- Nel lettore audio le frecce spostano la barra di 5 secondi (prima 0,1) e la barra spaziatrice riproduce o mette in pausa; la posizione viene letta a voce.
- Il pulsante "Ripristina tutto" delle sezioni delle Impostazioni (Aspetto, Audio, Scorciatoie) sta sempre nello stesso punto: la riga del titolo della sezione, a destra.
- La finestra delle Impostazioni è più alta (720px, al massimo l'85% della finestra).
- I sottotask sono appesi a linee guida ad albero sotto la casella del loro genitore (niente più separatori a gradini), con una casella un po' più piccola, e un task con sottotask mostra quanti sono completati (es. `1/3`).
- Impostazioni > Note ha un interruttore per mostrare o nascondere il numero di sottotask completati di un task.
- Le linee guida dei sottotask si vedono meglio (contrasto circa 2:1, era 1,3:1) e il contatore di un task con tutti i sottotask completati usa il colore normale del testo invece dell'accento, illeggibile sul tema chiaro.
- I nomi dei gruppi si vedono sempre per intero su una riga: il gruppo si allarga al nome invece di troncarlo.
- Le nuove versioni vengono annunciate in una dialog all'avvio (novità, "Aggiorna ora", "Più tardi", "Salta questa versione") invece di un avviso che spariva dopo 15 secondi.

### Corretto

- Testo e icone sul colore d'accento (pulsanti arancioni, opzioni selezionate, la spunta di un task completato) sono scuri o bianchi a seconda dell'accento, così restano leggibili: il bianco sull'arancione predefinito dava 1,8:1 sul tema chiaro.
- La maniglia di trascinamento di task e sottotask è centrata sulla casella e sulla prima riga di testo, e la lineetta orizzontale delle linee ad albero si dissolve mentre la maniglia è visibile invece di attraversarla.
- Compattare un gruppo e riaprirlo non lo fa più restringere per un istante (con i gruppi vicini che scattano): l'elenco dei suoi file audio compare subito invece di un momento dopo.
- La parte colorata degli slider (barra di avanzamento del lettore, volume e slider delle Impostazioni) poteva fermarsi prima del bordo sinistro negli slider larghi: verso la fine di un brano la prima parte della barra era vuota.
- I bordi di caselle, campi di testo e la traccia degli interruttori raggiungono circa 3:1 di contrasto su entrambi i temi. Sul tema chiaro il colore `--input` era scritto in modo non valido: questi bordi diventavano neri e la traccia di un interruttore spento era trasparente.
- Un gruppo vuoto non si restringe più tagliando la propria intestazione.
- Compattare un gruppo non ne cambia più la larghezza (mantiene quella che aveva da aperto).
- Ricaricare la pagina di un workspace (build di sviluppo) ripristina il workspace dall'indirizzo invece di lasciare una schermata vuota.
- Le build di sviluppo e di test (e ogni avvio con `EASYTASK_DATA_DIR`) possono partire mentre l'app installata è aperta: il blocco di istanza singola vale solo per le build di release sulla cartella dati predefinita.

## [0.2.0] - 2026-10-01

### Aggiunto

- Nascondi i task completati (`Ctrl+Shift+H`).
- Duplica note e sezioni.
- Avviso in Impostazioni > Dati quando la cartella dei dati è sincronizzata da OneDrive, il che può causare errori "database is locked" o copie in conflitto.

### Corretto

- Ripristino di un backup: il backup viene prima validato e poi sostituito in modo atomico, quindi un file danneggiato non può più lasciare il database ripristinato a metà.
- Annulla/ripeti non agisce più su un nuovo elemento che aveva riutilizzato l'id di un elemento eliminato definitivamente dal cestino (la cronologia viene svuotata dopo l'eliminazione definitiva).
- La barra laterale non resta più indietro quando un ricaricamento si sovrappone a un'altra modifica (ad esempio annullando uno spostamento), e l'eliminazione fallita di una nota riapre la sua scheda.
- Doppio invio nelle dialog di creazione (un doppio clic o un doppio Invio veloci creavano due elementi).
- Scorciatoie da tastiera e preferenze vengono validate in lettura, quindi i valori salvati non validi tornano a quelli predefiniti.
- L'importazione di un workspace corregge o rifiuta subito i file non validi (titoli vuoti, nomi duplicati, colori vuoti, file non audio, limiti di dimensione) invece di fallire a metà con un errore generico.
- Eliminare di nuovo un elemento già nel cestino ne conserva la data di eliminazione originale.
- `Esc` durante la modifica di un task ora annulla la modifica.
- Creare un sottotask sotto un genitore eliminato nel frattempo ora mostra un errore invece di fallire in silenzio, e due backup nello stesso secondo non falliscono più.

### Sicurezza

- Content Security Policy più restrittiva (`object-src`, `base-uri`, `form-action` e `frame-ancestors` sono bloccati; il server di sviluppo è ammesso solo nelle build di sviluppo).
- Istanza singola: avviare EasyTask una seconda volta porta in primo piano la finestra già aperta invece di aprirne una seconda sullo stesso database.
- Tutte le GitHub Actions sono fissate a commit precisi e il workflow di release usa permessi minimi.
- La modalità portable non scrive più fuori dalla sua cartella (niente file dello stato della finestra nel profilo utente e niente ripiego delle impostazioni nella cartella dati dell'app).
- `EASYTASK_DATA_DIR` deve essere un percorso assoluto.
- Una dialog nativa spiega perché l'app non può partire quando la cartella dei dati non si può creare.

## [0.1.0] - 2026-10-01

Prima versione pubblica.

[Unreleased]: https://github.com/ivanerricis/easytask-tauri/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ivanerricis/easytask-tauri/releases/tag/v0.1.0
