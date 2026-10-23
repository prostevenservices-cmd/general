# Amy Deluxe USA Store Questionnaire

A responsive, multi-step discovery questionnaire for the Amy Deluxe USA online
store project.

## Run locally

No build step or dependencies are required:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Included

- Ten-step guided questionnaire
- Conditional B2B, tax, payment, pickup, and accounting questions
- Automatic browser-based progress saving
- Responsive desktop and mobile layouts
- Downloadable text summary after completion

Questionnaire answers currently remain in the visitor's browser. Connect the
submit handler in `app.js` to the chosen backend, CRM, or form service before
production use.
