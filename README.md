# Trezvenoumlje: javni sajt

Statički sajt centra Trezvenoumlje (Astro). Sadrži usluge, programe, priče, članke, knjige, tim, medije, najčešća pitanja i kontakt formu. Sajt radi i bez JavaScript-a, ne šalje zahteve ka trećim stranama pri učitavanju, a video se učitava tek posle klika.

## Pokretanje

Potreban je Node 22.19 ili noviji (vidi `.nvmrc`).

```bash
npm install
npm run dev       # lokalni razvoj
npm run verify    # provere tipova, jedinični testovi i testovi u pregledaču
```

`npm run verify` traje nekoliko minuta jer pokreće i testove u pregledaču (Playwright, desktop i mobilna širina). Pre prvog pokretanja potrebno je jednom: `npx playwright install chromium`.

## Gde je sadržaj

Sav sadržaj je u `src/content/<kolekcija>/`:

- `usluge/` usluge centra
- `programi/` programi
- `ciljneGrupe/` stranice po ciljnim grupama
- `b2b/` ponuda za organizacije
- `clanci/` članci (blog)
- `knjige/` knjige
- `tim/` članovi tima
- `mediji/` medijska pojavljivanja
- `pitanja/` najčešća pitanja
- `nedelje/` sadržaj po nedeljama
- `price/` priče („Pričamo priču“)
- `pravno/` pravne stranice
- `podesavanja/` opšti podaci o sajtu (kontakt, adresa, društvene mreže)

Svaki unos ima polje `status`:

| Status | Dev pregled | Produkcija |
|---|---|---|
| `nacrt` | vidljiv, označen | sakriven |
| `pregled` | vidljiv, označen | sakriven |
| `objavljeno` | vidljiv | vidljiv i može u indeks |

## Dodavanje i izmena sadržaja

Jedan unos je jedan fajl u `src/content/<kolekcija>/`: `.json`, a za `clanci` i `pravno` `.md` (polja su na vrhu fajla između dve linije `---`, tekst ispod njih). Novi unos se najlakše pravi kopiranjem postojećeg fajla iz iste kolekcije.

### Opšta pravila

- Svaki unos mora da ima `status`: `nacrt`, `pregled` ili `objavljeno` (izuzetak je `podesavanja`).
- `slug` je deo adrese: mala slova latinice bez dijakritika, cifre i crtice (`kako-porodica-prepoznaje-problem`). Mora biti jedinstven u svojoj kolekciji. Rezervisane reči: u `clanci` `tema` i `rss.xml`; u `pravno` nazivi glavnih stranica (`kontakt`, `usluge`, `programi`, `organizacije`, `resursi`, `knjige`, `o-nama`, `pricamo-pricu`, `cesta-pitanja`, `dr-dragan-vukadinovic`, `404`).
- Sav tekst je na latinici; ćirilica obara build.
- Slike su `.webp` fajlovi u `src/assets/img/`, a u unosu se navodi samo ime fajla (`clanak-porodica.webp`). Uz sliku članka obavezan je `slikaAlt`, kratak opis slike za čitače ekrana.
- Vrednost u uglastim zagradama, na primer `[TELEFON]`, znači „još nije popunjeno“. U dev pregledu je označena, a produkcijski build pada dok ijedna takva vrednost postoji na vidljivoj stranici.
- `id` pitanja (`pitanja`) i `id` priča i njihovih pitanja (`price`, `nedelje`) su trajni: ne menjaju se, ne prenumerišu i ne koriste ponovo za drugi sadržaj.

Polja zajednička kolekcijama iz tabela ispod (osim `pitanja` i `podesavanja`):

| Polje | Obavezno | Značenje | Primer |
|---|---|---|---|
| `status` | da | faza objave | `nacrt` |
| `seo` | ne | izuzeci za pretraživače: `naslov`, `opis`, `slika`, `noindex` | `{ "noindex": true }` |
| `pravnaNapomena` | ne | pravna napomena uz tekst unosa | `[Pravna napomena]` |

### `clanci` (članci, `.md`)

| Polje | Obavezno | Značenje | Primer |
|---|---|---|---|
| `naslov` | da | naslov članka | `Kako porodica prepoznaje problem` |
| `slug` | da | adresa: `/resursi/<slug>/` | `kako-porodica-prepoznaje-problem` |
| `autor` | da | potpis autora | `[Autor]` |
| `recenzent` | ne | ko je uradio stručni pregled | `[Recenzent]` |
| `kategorija` | da | jedna od: `zavisnosti`, `porodica`, `mladi`, `oporavak`, `radno-mesto`, `pravni-sektor`, `zdravi-stilovi-zivota` | `porodica` |
| `sazetak` | da | uvod ispod naslova, tekst kartice i opis za pretraživače | `Razgovor koji otvara vrata, umesto predavanja koje ih zatvara.` |
| `datum` | ne | datum objave | `2026-10-03` |
| `datumRevizije` | ne | datum poslednje revizije | `2026-11-15` |
| `slika` | ne | ime fajla slike | `clanak-porodica.webp` |
| `slikaAlt` | uz sliku da | opis slike | `razgovor u porodici` |

### `pitanja` (najčešća pitanja)

| Polje | Obavezno | Značenje | Primer |
|---|---|---|---|
| `status` | da | faza objave | `objavljeno` |
| `id` | da | trajna oznaka i sidro na stranici `/cesta-pitanja/#<id>` | `sta-ako-je-hitno` |
| `pitanje` | da | tekst pitanja | `Šta ako je situacija hitna?` |
| `odgovor` | da | tekst odgovora | `Centar nije hitna služba.` |
| `kategorija` | da | jedna od: `opste`, `porodica`, `mladi`, `posle-rehabilitacije`, `programi`, `organizacije`, `pravni-sektor`, `privatnost`, `pricamo-pricu` | `opste` |
| `redosled` | da | redni broj unutar kategorije | `3` |

### `usluge`

| Polje | Obavezno | Značenje | Primer |
|---|---|---|---|
| `naziv` | da | naziv usluge | `Preventivni rad sa mladima` |
| `slug` | da | oznaka usluge | `mladi` |
| `meta` | da | kratak red ispod naziva (trajanje, uslovi) | `45 min · uz saglasnost roditelja` |
| `opis` | da | opis usluge | `Rizici, donošenje odluka, vršnjački pritisak i zdrave alternative.` |
| `ciljneGrupe` | ne | slugovi iz `ciljneGrupe` na čijim se stranicama usluga prikazuje | `["mladi"]` |
| `prikazCene`, `cena` | ne | način prikaza cene (`tacna`, `od`, `na-upit`, `skriveno`) i njen tekst; bez odobrenja vlasnika ostaje `skriveno`, a `cena` se ne upisuje | `skriveno` |
| `redosled` | ne | redni broj u listi | `5` |

### `programi`

| Polje | Obavezno | Značenje | Primer |
|---|---|---|---|
| `naziv` | da | naziv programa | `Adiktologija u pravu` |
| `slug` | da | adresa: `/programi/<slug>/` | `adiktologija-u-pravu` |
| `publika` | da | kome je program namenjen | `Advokati` |
| `opis` | da | opis programa | `Razumevanje zavisnosti u pravnom kontekstu kroz edukaciju i stručni konsalting.` |
| `format` | da | oblik rada | `Konsultacije i obuke` |
| `ciljneGrupe` | ne | slugovi iz `ciljneGrupe` | `["porodice"]` |
| `prikazCene`, `cena` | ne | isto kao kod usluga | `skriveno` |
| `uIzradi` | ne | `true` dok program nije spreman (stranica se tada ne indeksira) | `false` |
| `kategorijaPitanja` | ne | kategorija pitanja prikazanih na stranici programa (podrazumevano `programi`) | `pravni-sektor` |
| `redosled` | ne | redni broj u listi | `5` |

### `knjige`

| Polje | Obavezno | Značenje | Primer |
|---|---|---|---|
| `naslov` | da | naslov knjige | `Pričamo priču` |
| `slug` | da | adresa: `/knjige/<slug>/` | `pricamo-pricu` |
| `autor` | da | autor | `[Autor]` |
| `godina`, `izdavac`, `isbn` | ne | bibliografski podaci | `2026.` |
| `korica` | ne | ime fajla slike korice | `korica-knjige.webp` |
| `opis` | ne | kratak opis | `Pedeset priča u deset tema.` |
| `nabavka` | ne | gde se knjiga nabavlja | `[Knjižara, izdavač ili upit centru]` |
| `oznaka` | ne | kratka oznaka na kartici | `Novo · 2026.` |
| `spoljnaStranica` | ne | adresa sopstvene stranice knjige na sajtu, umesto `/knjige/<slug>/` | `/pricamo-pricu/` |
| `izdanje`, `format`, `cenaNapomena` | ne | redovi „Izdanje“, „Format“ i „Cena“ u prozoru „Kako do knjige“; `cenaNapomena` je napomena, ne iznos | `Verzija 1.2, 2026.` |
| `redosled` | ne | redni broj u listi | `1` |

### `tim`

| Polje | Obavezno | Značenje | Primer |
|---|---|---|---|
| `ime` | da | ime i prezime | `[IME I PREZIME]` |
| `slug` | da | oznaka člana | `psiholog` |
| `uloga` | da | uloga u centru | `Master psiholog, stručni saradnik` |
| `kratko` | da | jedna rečenica na kartici | `Radionice za mlade i roditelje, psihoedukacija, razvoj materijala.` |
| `bio` | da | biografija u prozoru člana | `[Kratka biografija]` |
| `zadaci` | da | lista zadataka u centru | `["Radionice za mlade i roditelje"]` |
| `napomena` | ne | napomena ispod biografije | `Prikazuje se tek kada se potvrdi pravni osnov angažmana.` |
| `fotografija` | da | ime fajla fotografije | `tim-psiholog.webp` |
| `oblik` | ne | `krug` (podrazumevano) ili `kvadrat` | `krug` |
| `zdravstvenaUloga` | ne | `true` ako je uloga zdravstvena (podrazumevano `false`) | `false` |
| `stranica` | ne | adresa stranice sa celom biografijom | `/dr-dragan-vukadinovic/` |
| `redosled` | ne | redni broj u listi | `2` |

### `mediji`

| Polje | Obavezno | Značenje | Primer |
|---|---|---|---|
| `naslov` | da | naslov emisije ili objave | `Kako se boriti protiv bolesti zavisnosti` |
| `slug` | da | oznaka unosa (isto kao ime fajla) | `kako-se-boriti-protiv-bolesti-zavisnosti` |
| `medij` | da | naziv medija, po želji i emisije | `TV Zona Plus · Iz jutra u dan` |
| `datum` | ne | datum ili godina, kao tekst; izostavlja se dok datum nije potvrđen | `23. 8. 2024.` |
| `youtubeId` | ne | oznaka YouTube videa od 11 znakova (ne cela adresa) | `AbCdEfGhIjK` |
| `pocetak` | ne | sekunda od koje video počinje (ceo broj, 0 ili više), kada je nastup deo dužeg snimka | `2141` |
| `link` | ne | adresa objave, počinje sa `http://` ili `https://` | `https://example.rs/emisija` |
| `opis` | ne | kratak opis, prikazan na kartici i u prozoru sa videom | `Studijski razgovor na temu…` |
| `redosled` | ne | redni broj u listi (podrazumevano `0`); isti brojevi se ređaju po naslovu | `2` |

### `pravno` (pravne stranice, `.md`)

| Polje | Obavezno | Značenje | Primer |
|---|---|---|---|
| `naslov` | da | naslov stranice | `Politika privatnosti` |
| `slug` | da | adresa: `/<slug>/` | `politika-privatnosti` |
| `datumIzmene` | ne | datum poslednje izmene | `2026-10-03` |

### `podesavanja` (jedan fajl, `sajt.json`; sva polja su obavezna osim `viber`, nema `status`)

| Polje | Značenje | Primer |
|---|---|---|
| `naziv`, `podnaslov`, `slogan` | ime centra, opis ispod imena i slogan na početnoj | `Trezvenoumlje` |
| `email`, `telefon`, `adresa`, `radnoVreme` | kontakt podaci | `[TELEFON]` |
| `viber` | nije obavezno: broj na koji je prijavljen Viber, u međunarodnom obliku (`+` i 8 do 15 cifara, bez razmaka). Kada postoji, uz telefon se na ekranima užim od 900 px prikazuje veza „Viber“ | `+381111234567` |
| `hitnaSluzba` | broj hitne službe u napomeni o hitnim slučajevima | `[BROJ HITNE SLUŽBE]` |
| `poslovniPodaci` | poslovni podaci u podnožju | `[PUNI POSLOVNI PODACI POSLE REGISTRACIJE]` |
| `rokOdgovora`, `rokCuvanja` | rok odgovora na upit i rok čuvanja upita | `[BROJ] radnih dana` |
| `facebook` | tekst o Facebook stranici u podnožju | `Facebook: Trezvenoumlje` |

### Objavljivanje

1. U unosu promenite `status` u `objavljeno`.
2. Pokrenite `npm run verify`. Ako sve prođe, izmena može na `main`.

### Dva upozorenja

- Greška u `ciljneGrupe`: build pada kada usluga ili program navede slug koji ne postoji u kolekciji `ciljneGrupe`. Slug koji postoji, ali je pogrešan, build ne može da prepozna: unos se tada tiho ne pojavi na stranici ciljne grupe kojoj je bio namenjen. Posle izmene proverite tu stranicu.
- `robots.txt` u podfolderu GitHub Pages (`/trezvenoumlje/robots.txt`) pretraživači ne čitaju. Dev pregled van pretrage drži `noindex` oznaka na svakoj stranici.

## Dev pregled i produkcija

Ponašanje određuju tri vrednosti okruženja: `SITE_ENV`, `SITE_URL` i `BASE_PATH`.

| | Dev pregled (GitHub Pages) | Produkcija (domen) |
|---|---|---|
| `SITE_ENV` | `preview` | `production` |
| `SITE_URL` | `https://<nalog>.github.io` | `https://<domen>` |
| `BASE_PATH` | `/trezvenoumlje/` | `/` |
| Indeksiranje | `noindex` na svim stranicama, `robots.txt` zabranjuje sve | dozvoljeno |
| Nacrti | vidljivi, označeni | sakriveni |
| Nepopunjeni podaci u zagradama | vidljivi, označeni | obaraju build |
| Traka „Dev pregled“ | prikazana | nema je |

Push na `main` pokreće GitHub Actions: provere, testove u pregledaču, build i objavu na GitHub Pages. Testovi u pregledaču rade nad lokalnim buildom pod `/trezvenoumlje/`; ako se repozitorijum ikada preimenuje, treba uskladiti `BASE` u `playwright.config.ts`.

## Prelazak na domen

Build za produkciju pokreće se ovako:

```bash
SITE_ENV=production SITE_URL=https://<domen> BASE_PATH=/ npm run build
```

Produkcijski build namerno pada dok god je bilo koja vrednost u zagradama (na primer `[TELEFON]`) nepopunjena ili je neka pravna stranica još nacrt. Greška izlistuje sve takve slučajeve, pa se popune redom i build se ponovi.

## Pravila

- **Cene se ne upisuju u repozitorijum dok ih vlasnik ne odobri.**
- **Folder `design-source/` se nikada ne komituje.**
