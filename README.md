# Satish Patil — Portfolio

Live website: https://satishrp303.github.io/Self_portfolio_website/

GitHub Pages serves this repository's `main` branch from `/ (root)`. Keep `index.html`, `styles.css`, `cinematic.css`, `app.js`, `voice.js`, and `assets/` together at the repository root. `.nojekyll` tells Pages to serve the static files directly.

The website includes a talking introduction, captions, three GitHub projects, professional experience, and a downloadable résumé. The introduction uses a synthetic voice; HeyGen's video watermark is retained.

The introduction starts muted when its portrait enters view, including on the first page load, and loops while muted. **Sound on** enables narration; audible playback finishes once. Scrolling away or hiding the tab pauses playback; returning resumes it. A visitor's explicit pause or stop remains in effect until they choose play again. Reduced-motion preferences disable automatic playback. If a browser blocks autoplay, the play control remains available. Audio-only fallbacks require a click.

## Editing

- `index.html`: biography, experience, education, contact details, and page metadata.
- `styles.css` and `cinematic.css`: responsive layout and appearance.
- `app.js`: project details, filtering, and navigation.
- `voice.js`: video playback and audio fallback.
- `assets/`: portrait, video, captions, narration, and résumé.

Use relative asset links so the website works under `/Self_portfolio_website/`.

The local `satish-portfolio/` folder is a separate checkout for the Sites edition. It is ignored here to avoid embedding one Git repository inside another. GitHub Pages publishes the files at this repository's root; the deployment archive alone is not a website entry point.

## Validation

Run `node --check app.js` and `node --check voice.js` before pushing. After a push, check the repository's **Actions → pages build and deployment** run, then open the live website.
