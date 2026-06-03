# Categorie spelling

Spelling test with words from 10 categories. This folder is **standalone** — you do not need `niet_ww`.

## How it works

- Each round: choose how many words per category, plus words from the **review queue**
- Wrong on the **first try**? Type the word again; it is added to the review queue for the **next** round
- **First try correct** removes the word from the review queue
- Your **name** is remembered in the browser
- **Asked words log** and **round history** are saved in the browser

## Run locally

```bash
cd /Users/sveta/taal/niet_ww_category
python3 -m http.server 8081
```

Open [http://localhost:8081](http://localhost:8081)

Or from the parent `taal` folder on port 8080: [http://localhost:8080/niet_ww_category/](http://localhost:8080/niet_ww_category/)

## Files

| File | Purpose |
|------|---------|
| `index.html`, `app.js`, `style.css` | App |
| `*_words.js` | Word lists per category |
| `speech.js` | Dutch pronunciation (browser TTS) |

Speech uses the browser’s Dutch voice (Web Speech API). Chrome and Safari work best.
