# Next Steps

## Frontend

1. Migrate legacy page-level `<style>{styles}</style>` blocks into dedicated stylesheets. Keep `src/index.css` as the only CSS entrypoint and preserve the cascade order documented in `src/styles/README.md`.
2. Continue polishing the Stillpoint-inspired visual system in `src/styles/theme-stillpoint.css`, while keeping `Be Vietnam Pro` as the only app font for Vietnamese readability.
3. Review mobile layouts for chat, map, pricing, records, medication scan, and symptom analysis after each page-level CSS migration.
4. Consider code-splitting MapLibre-heavy routes to reduce the production chunk warning.

## Backend Integration

1. Seed `medical-facilities` with active facilities that include valid `latitude` and `longitude`; the map and recommendation flow will automatically use API data when available.
2. Seed `subscription-plans` with at least one free plan and one paid active plan. Use `featureLimitJson.features` when possible so pricing rows render from backend data.
3. Add or expose APIs for medical records, medication scanning/OCR, drug interactions, treatment reminders, and follow-up tasks.
4. Extend `/api/web-chatbot/message` with structured fields for department recommendations, urgency, follow-up questions, and matching facility IDs.
