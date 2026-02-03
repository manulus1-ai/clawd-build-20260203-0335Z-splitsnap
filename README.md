# SplitSnap

Receipt → items → assign → everyone sees what they owe.

- **Frontend:** Angular (static, deployed to GitHub Pages)
- **Backend:** not required (runs fully in-browser)

## What it does
- Scan a receipt photo using on-device OCR (Tesseract.js)
- Quick-fix item names + prices
- Add people and assign items (multi-select)
- See big, restaurant-friendly totals + per-person audit trail
- Share a link containing compressed state (no server)

## Local dev

### Frontend
```bash
cd frontend/splitsnap
npm install
npm start
```
Open http://localhost:4200

### Build
```bash
cd frontend/splitsnap
npm run build -- --base-href "/clawd-build-20260203-0335Z-splitsnap/"
```

## Notes
- GitHub Pages hosts only the static frontend.
- OCR happens locally; the optional share link encodes state into the URL.
