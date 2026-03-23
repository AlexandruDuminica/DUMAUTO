# 🚘 DUM AUTO - Dealer Auto Online

**Autor:** Duminică Dănuț-Alexandru  
**Grupa:** CTI 262  

---

## 📋 Etapa 0: Planificarea Proiectului

### 1. Descrierea succintă a temei
Proiectul **„DUM AUTO”** reprezintă o platformă web de tip dealer auto online (showroom virtual). Scopul site-ului este de a aduce experiența achiziționării unui autoturism direct din confortul casei utilizatorului. Platforma se adresează clienților care doresc să achiziționeze mașini noi sau rulate, permițându-le să exploreze modele, să vizualizeze oferte și să își programeze teste de conducere.

---

### 2. Împărțirea informațiilor și serviciilor

* **Autoturisme:**
  * Mașini Noi (Sedan, SUV, Electrice)
  * Mașini Rulate (Verificate, Istoric curat)
* **Mentenanță și Post-Vânzare:**
  * Pachete de Garanție
  * Programare Service Auto (Revizii, Reparații)
* **Despre Noi / Informații:**
  * Viziunea și Misiunea DUM AUTO
  * Evenimente auto și lansări de modele noi
* **Suport și Contact:**
  * Contact și Locație (Hărți interactive)
  * Întrebări Frecvente (FAQ)
  * Termeni și Condiții (Documente utile)

---

### 3. Identificarea paginilor (Structura Site-ului)

Proiectul conține **4 pagini** principale:

1. **Acasă (`index.html`)** * Prezentare generală a conceptului DUM AUTO. 
   * Conține subsecțiuni interne (ex: `#despre`, `#oferte`, `#evenimente`) pentru o navigare rapidă tip *single-page*. 
   * Din secțiunea `#oferte` vor exista legături către pagina de Catalog, iar din `#evenimente` se vor putea citi noutățile.
2. **Catalog și Configurator** * Pagină separată dedicată explorării detaliate a modelelor auto. 
   * Conține tabele cu prețuri, galerii foto pentru diferite mașini și un configurator vizual simplu pentru dotări.
3. **Garanție și Service** * Pagină informativă și practică. 
   * Conține detalii despre pachetele de garanție și un tabel/listă cu serviciile de mentenanță (schimb ulei, revizie anuală). 
   * Include un link de întoarcere către pagina de Catalog.
4. **Contact și Suport** * Pagină de legătură directă cu clientul. 
   * Integrează datele de contact (telefon, email), harta locației showroom-ului fizic și o subsecțiune de FAQ folosind elemente interactive.

---

### 4. Cuvinte și Sintagme Cheie (SEO)

* **Global:** `dealer auto`, `DumAuto`, `showroom auto online`, `masini noi`, `masini rulate`, `oferte auto`, `autoturisme`, `vehicule`.
* **Pagina Acasă:** `concept dealer auto`, `showroom virtual`, `reduceri masini DumAuto`, `test drive`.
* **Pagina Catalog și Configurator:** `configurator auto`, `preturi masini`, `modele SUV`, `sedan`, `masini electrice`, `dotari auto`.
* **Pagina Garanție și Service:** `service auto`, `mentenanta masini`, `revizie auto`, `garantie DumAuto`, `programare service`.
* **Pagina Contact și Suport:** `contact DumAuto`, `locatie dealer auto`, `program showroom`, `numar de telefon dealer auto`, `suport clienti auto`.

---

### 5. Analiza site-urilor similare (Competiție)

#### 1. [Țiriac Auto](https://www.tiriacauto.ro/)
* **Organizare și design:** Design aerisit, elegant și premium, care pune accentul pe imagini mari ale autoturismelor și un meniu de navigare "sticky".
* **Pro 1:** Sistem de filtrare foarte detaliat și eficient în pagina de căutare a mașinilor rulate.
* **Pro 2:** Formularul de programare în service este foarte intuitiv și bine structurat.
* **Contra 1:** Pe versiunea de mobil, anumite elemente grafice se suprapun sau se încarcă greoi.
* **Contra 2:** Lipsa unui configurator vizual direct pe site pentru mașinile noi (redirecționează către site-ul producătorului).

#### 2. [Autovit.ro](https://www.autovit.ro/)
* **Organizare și design:** Design de tip listă/grid specific site-urilor de anunțuri, axat pe densitatea informației mai degrabă decât pe estetică.
* **Pro 1:** Bază de date imensă, interfață foarte familiară pentru piața românească, ușor de înțeles.
* **Pro 2:** Secțiuni clare pentru informații despre dealeri (ratinguri, recenzii direct pe pagina mașinii).
* **Contra 1:** Aspectul este pur utilitar, lipsindu-i senzația de showroom exclusivist pe care și-l dorește DUM AUTO.
* **Contra 2:** Numărul mare de bannere publicitare distrage atenția de la conținutul principal.

#### 3. [Dacia România](https://www.dacia.ro/)
* **Organizare și design:** Design modern, orientat spre conversie, cu butoane de "call to action" foarte vizibile și fonturi mari.
* **Pro 1:** Configurator auto excelent, interactiv (vizualizare 3D din toate unghiurile) – o idee de preluat la nivel conceptual.
* **Pro 2:** Pachetele de garanție și service sunt explicate foarte transparent, cu tabele clare.
* **Contra 1:** Structura meniului principal poate deveni stufoasă (prea multe sub-meniuri) și greu de parcurs.
* **Contra 2:** Site-ul este foarte strict delimitat doar pe mașini noi, fără opțiuni clare pentru vehicule de ocazie.

#### 4. [Carwow UK](https://www.carwow.co.uk/)
* **Organizare și design:** Abordare UX excepțională axată pe fluiditate, cu mult spațiu alb și pași ghidați pentru utilizator.
* **Pro 1:** Integrează ghiduri video direct pe paginile ofertelor (foarte util pentru reținerea atenției).
* **Pro 2:** Designul comparativ (side-by-side) între diverse modele este extrem de eficient vizual.
* **Contra 1:** Procesul obligă utilizatorul să își creeze cont prea devreme pentru a vedea prețurile finale.
* **Contra 2:** Prea mult conținut afișat simultan (densitate mare de text) în zona de specificații tehnice.
