# 🏎️ F1 Pitwall: GitHub Veröffentlichungs-Anleitung für @paultleibl75-web

Dein lokales Projekt ist bereits vollständig vorbereitet und committed!

---

## 🚀 Letzter Schritt: Jetzt zu GitHub hochladen

Führe in deiner **PowerShell** einfach folgenden Befehl aus:

```powershell
git push -u origin main
```

### Was passiert jetzt?
1. Ein kleines Browser-Fenster von GitHub öffnet sich (**GitHub Credential Manager**).
2. Klicke auf **„Sign in with your browser“** und bestätige die Autorisierung.
3. Dein Code wird sofort auf dein GitHub-Repository [`paultleibl75-web/F1`](https://github.com/paultleibl75-web/F1) übertragen!

*(Tipp: Falls eine Meldung wie `[rejected] (fetch first)` kommt, weil auf GitHub schon eine README existiert, führe einfach `git push -u origin main --force` aus).*

---

## 🌍 Schritt 4: Kostenlose Live-Website auf GitHub Pages aktivieren

Sobald der Push durch ist:

1. Öffne dein Repository im Browser:
   👉 **[https://github.com/paultleibl75-web/F1](https://github.com/paultleibl75-web/F1)**
2. Klicke oben auf den Reiter **Settings** (Zahnrad-Symbol).
3. Klicke in der linken Leiste auf **Pages**.
4. Wähle unter **Build and deployment** > **Source** im Dropdown-Menü:
   **GitHub Actions**
5. Fertig! Unsere Datei `.github/workflows/deploy.yml` baut die Seite vollautomatisch:
   - Unter **Actions** siehst du den grünen Haken nach ca. 1 Minute.
   - Deine Website ist ab dann weltweit erreichbar unter:
     👉 **`https://paultleibl75-web.github.io/F1/`**

---

## 💻 Wie du das Dashboard in Zukunft ganz einfach bearbeitest

1. **Lokal testen & entwickeln:**
   ```powershell
   npm run dev
   ```
   (im Browser auf `http://localhost:5173/` ansehen).

2. **Änderungen online bringen (nur 2 kurze Befehle):**
   ```powershell
   git add .
   git commit -m "Update"
   git push
   ```
   GitHub Pages baut die Seite automatisch in 60 Sekunden neu!
