# 🏎️ F1 Pitwall: GitHub Veröffentlichungs-Anleitung

Mit dieser Anleitung bringst du dein F1 Pitwall Dashboard in wenigen Minuten kostenlos auf **GitHub** und machst es als echte Live-Website über **GitHub Pages** weltweit auf dem PC, iPad und Handy erreichbar!

---

## 🛠️ Schritt 1: Git installieren (Einmalig)

Falls du `git` noch nicht auf deinem PC installiert hast:

1. Drücke die Windows-Taste, tippe `powershell` ein und öffne die **Windows PowerShell** (oder das Terminal).
2. Führe folgenden schnellen Befehl aus:
   ```powershell
   winget install --id Git.Git -e --source winget
   ```
   *(Alternativ kannst du Git einfach von [git-scm.com](https://git-scm.com/) oder [desktop.github.com](https://desktop.github.com/) herunterladen und installieren).*
3. Schließe das PowerShell-Fenster nach der Installation und öffne ein neues Terminal, damit `git` aktiv ist.

---

## 🌐 Schritt 2: Kostenloses GitHub-Repository erstellen

1. Gehe im Browser auf [github.com](https://github.com) und logge dich ein (oder erstelle ein kostenloses Konto).
2. Klicke oben rechts auf das **`+`**-Symbol und wähle **New repository**.
3. **Repository name:** Gib z. B. `F1` oder `f1-pitwall` ein.
4. **Visibility:** Wähle **Public** (öffentlich, damit GitHub Pages kostenlos funktioniert).
5. **WICHTIG:** Lasse die Häkchen bei *„Add a README file“*, *„Add .gitignore“* und *„Choose a license“* **leer** (deaktiviert), da wir diese Dateien bereits lokal für dich angelegt haben!
6. Klicke unten auf den grünen Button **Create repository**.
7. Kopiere den dort angezeigten HTTPS-Link (sieht z. B. so aus: `https://github.com/DEIN-BENUTZERNAME/F1.git`).

---

## 🚀 Schritt 3: Projekt auf GitHub hochladen (Einmalig)

Öffne ein Terminal im Projektordner `C:\Users\pault\Desktop\F1` und gib nacheinander diese 4 kurzen Befehle ein:

```powershell
# 1. Git-Repository initialisieren
git init -b main

# 2. Alle Dateien hinzufügen und ersten Stand speichern
git add .
git commit -m "Initial release: Responsive F1 Pitwall Dashboard"

# 3. Mit deinem GitHub-Repository verknüpfen (ersetze die URL mit deinem Link aus Schritt 2)
git remote add origin https://github.com/DEIN-BENUTZERNAME/F1.git

# 4. Code zu GitHub hochladen
git push -u origin main
```
*(Beim ersten Mal öffnet sich kurz ein Fenster im Browser, in dem du dich bei GitHub autorisierst – einfach auf Bestätigen klicken).*

---

## 🌍 Schritt 4: Kostenlose Live-Website auf GitHub Pages aktivieren

1. Gehe in deinem GitHub-Repository auf den Reiter **Settings** (oben rechts im Menü).
2. Klicke in der linken Seitenleiste auf **Pages**.
3. Unter **Build and deployment** > **Source**:
   - Wähle im Dropdown-Menü **GitHub Actions** aus.
4. Fertig! Unsere vorbereitete Datei `.github/workflows/deploy.yml` übernimmt ab jetzt alles automatisch:
   - Unter dem Reiter **Actions** siehst du, wie die Seite in ca. 1 Minute vollautomatisch gebaut und bereitgestellt wird.
   - Deine Website ist ab sofort weltweit unter folgender Adresse erreichbar:
     ```
     https://DEIN-BENUTZERNAME.github.io/F1/
     ```

---

## 💻 Schritt 5: Wie du das Dashboard in Zukunft ganz einfach bearbeitest

Du kannst jederzeit lokal Änderungen vornehmen:

1. **Lokal entwickeln:**
   ```powershell
   npm run dev
   ```
   Öffne `http://localhost:5173/`, nimm Änderungen an deinem Code vor und prüfe das Ergebnis live.

2. **Änderungen auf GitHub & Live-Website übertragen (nur 2 Befehle!):**
   Sobald du zufrieden bist, führst du im Terminal einfach aus:
   ```powershell
   git add .
   git commit -m "Update layout / styles"
   git push
   ```
   **Das war's schon!** GitHub Pages aktualisiert deine Live-Website innerhalb von 60 Sekunden vollautomatisch.
