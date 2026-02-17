# తెలుగు Lipi — English to Telugu Transliterator

A beautiful, modern web app for transliterating English (romanized) text into Telugu script in real-time.

🔗 **Live demo**: `https://YOUR_USERNAME.github.io/telugu-lipi/`

---

## ✨ Features

- **Real-time transliteration** as you type
- **Multiple engines**: Claude AI, Google Input Tools, or Auto (Google → Claude fallback)
- **Word suggestions** dropdown with keyboard navigation (↑ ↓ Enter)
- **Text-to-speech** — reads Telugu aloud in browser
- **Audio download** — save transliteration as MP3 via Google TTS
- **Copy to clipboard** with one click
- **Character & word count** for both panels
- **Phonetic fallback** — works offline with built-in rule-based engine
- Beautiful warm saffron / cultural aesthetic design

---

## 🚀 Deploying to GitHub Pages

### 1. Create repo & upload files

```
telugu-lipi/
├── index.html
├── style.css
├── README.md
└── js/
    ├── transliterator.js
    ├── tts.js
    └── app.js
```

Upload all files maintaining this folder structure.

### 2. Enable GitHub Pages

Repo → **Settings → Pages** → Branch: `main` → Folder: `/(root)` → **Save**

### 3. Visit your site

`https://YOUR_USERNAME.github.io/REPO_NAME/`

---

## 🤖 Setting up Claude AI Engine

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Open the app → paste your key in the **Claude API key** field → click 💾
3. Your key is saved in `localStorage` — never leaves your browser

---

## 💡 Usage Tips

| Type this | Gets → |
|-----------|--------|
| `nenu` | నేను |
| `meeru` | మీరు |
| `dhanyavadalu` | ధన్యవాదాలు |
| `namaste` | నమస్తే |
| `chala bagundi` | చాలా బాగుంది |
| `telugu lo matladadam` | తెలుగు లో మట్లాడదం |

---

## 🛠 Tech Stack

- **Vanilla HTML/CSS/JS** — no build step, no framework
- **Claude Sonnet API** — AI transliteration
- **Google Input Tools API** — phonetic suggestions
- **Web Speech API** — text-to-speech
- **Noto Sans Telugu** — beautiful Telugu font

---

## 📁 File Structure

| File | Purpose |
|------|---------|
| `index.html` | App layout & markup |
| `style.css` | All styles (warm saffron theme) |
| `js/transliterator.js` | Transliteration engines (Google, Claude, rule-based) |
| `js/tts.js` | Text-to-speech & audio download |
| `js/app.js` | Main app controller, UI logic |

---

## 📝 License

MIT — free to use and modify.
