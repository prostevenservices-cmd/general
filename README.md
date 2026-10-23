# Amy Deluxe USA Store Questionnaire

A responsive, multi-step discovery questionnaire for the Amy Deluxe USA online
store project.

## Run locally

No build step or dependencies are required. To test the submission endpoint,
serve the project with PHP:

```bash
php -S localhost:4173
```

Open `http://localhost:4173`.

## Included

- Ten-step guided questionnaire
- Conditional B2B, tax, payment, pickup, and accounting questions
- Automatic browser-based progress saving
- Responsive desktop and mobile layouts
- Downloadable text summary after completion
- Email delivery to `prostevenservices@gmail.com` through the cPanel mail service

## cPanel deployment

Upload `index.html`, `styles.css`, `app.js`, and `submit.php` to the same
directory. Confirm that PHP's `mail()` function works on the account and that
Email Deliverability shows valid SPF and DKIM records for the hosting domain.
The server does not retain a copy of submitted answers.
