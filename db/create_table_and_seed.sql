-- Run inside proiectdb (psql -U proiectuser -d proiectdb)
-- Create enum and produse table
CREATE TYPE categorie_mare AS ENUM ('compact','sedan','suv','coupe','electric','van');

CREATE TABLE produse (
  id SERIAL PRIMARY KEY,
  nume TEXT NOT NULL,
  descriere TEXT,
  imagine TEXT,
  categorie_mare categorie_mare NOT NULL,
  subcategorie TEXT,
  pret NUMERIC,
  putere_cp INTEGER,
  data_adaugare DATE,
  culoare TEXT,
  caracteristici_multiple TEXT,
  in_stoc BOOLEAN
);

-- Seed sample rows (match data/produse.json)
INSERT INTO produse (nume,descriere,imagine,categorie_mare,subcategorie,pret,putere_cp,data_adaugare,culoare,caracteristici_multiple,in_stoc) VALUES
('Compacta A1','Model compact, consum redus, ideal pentru oras.','imagini/galerie/car1.jpg','compact','benzina',13500,95,'2023-03-15','Rosu','ABS,Airbag,Bluetooth',true),
('Sedan B2','Sedan confortabil pentru familii mici.','imagini/galerie/car2.jpg','sedan','diesel',22500,150,'2024-01-10','Negru','Clima,ParkingAssist,Tempomat',true),
('SUV X3','SUV robust, ideal pentru drumuri lungi.','imagini/galerie/car3.jpg','suv','benzina',34500,190,'2022-11-05','Albastru','4x4,Panorama,Camera',false),
('Coupe R','Sportiv si elegant.','imagini/galerie/car4.jpg','coupe','benzina',41200,260,'2021-06-21','Gri','Spoiler,InteriorPiele,FaruriLED',true),
('Electric E1','Autonomie mare, costuri reduse.','imagini/galerie/car5.jpg','electric','electric',38900,200,'2024-04-02','Alb','Autopilot,FastCharge,Regenerare',true);
