# Prisma-Migrationen

## Baseline-Squash (ab `00000000000000_baseline`)

Die frühere 14-teilige Migrationskette war **nicht mehr auf einer frischen
Datenbank anwendbar**: Mehrere Migrationen `ALTER`-ten Tabellen/Spalten, die
von keiner vorherigen Migration erzeugt wurden (die Produktion war ursprünglich
per `prisma db push` aufgebaut worden, nicht per Migrationen). `prisma migrate
deploy` brach auf einer leeren DB reproduzierbar ab — Disaster-Recovery, CI-DBs
und Onboarding waren damit blockiert.

Die Historie wurde deshalb zu **einer** Baseline-Migration gesquasht, die den
vollständigen Stand aus `schema.prisma` abbildet (generiert mit
`prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma`).

### Frische DB (CI / DR / neue Umgebung)
`prisma migrate deploy` wendet nur die Baseline an → exakt das
`schema.prisma`-Schema. Verifiziert: `migrate diff` gegen die erzeugte DB
liefert exit-code 0 (keine Abweichung).

### Bestehende Produktion
Die Tabellen existieren dort bereits und die alten Migrationsnamen stehen in
`_prisma_migrations`. `docker/deploy.sh` erkennt das (Kern-Tabellen vorhanden,
Baseline noch nicht vermerkt) und führt **einmalig** `prisma migrate resolve
--applied 00000000000000_baseline` aus, BEVOR `migrate deploy` läuft. Dadurch
wird die Baseline als angewandt vermerkt, ohne ihre `CREATE TABLE`s
auszuführen — der Deploy bleibt ein sauberer No-op, ohne manuellen Eingriff.

## Neue Migrationen erzeugen
Ab hier normal weiterarbeiten: `prisma migrate dev --name <änderung>` erzeugt
inkrementelle Migrationen oben auf der Baseline.
