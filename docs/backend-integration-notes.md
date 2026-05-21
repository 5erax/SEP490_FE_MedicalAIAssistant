# Backend Integration Notes

Checked against `https://sep490-medicalaiassistant.onrender.com/swagger/v1/swagger.json`.

## Connected From Frontend

- Auth: `/api/authentication/login`, `/register`, `/register/staff`, `/google`, `/refresh`, `/logout`, `/forgot-password`, `/change-password`
- Current user and user admin: `/api/users/me`, `/api/users`, `/api/users/{userId}`
- Staff approval: `/api/authentication/{userId}/approve-staff`
- Departments: `/api/medical-departments`
- Patient profiles: `/api/patient-profiles`
- Web chatbot: `/api/web-chatbot/message`
- Medical facilities: `/api/medical-facilities`
- Subscription plans: `/api/subscription-plans`

## Backend Notes

1. `GET /api/medical-facilities` is available but currently returns no items. The map and hospital recommendation UI now calls it first, then falls back to demo data when the response is empty. Seed active facilities with valid `latitude` and `longitude` to make the frontend fully live.

2. `GET /api/subscription-plans` is available but currently returns an empty array. The pricing UI now calls it first, then falls back to default plans. Seed at least one free plan and one paid active plan. If `featureLimitJson` includes a `features` array, the frontend will render those feature rows.

3. The frontend previously expected `POST /api/users/{userId}/approve`; Swagger exposes `POST /api/authentication/{userId}/approve-staff`. Frontend has been updated to the Swagger endpoint.

4. `POST /api/web-chatbot/message` works for the landing chat and symptom assistant. For richer symptom routing, consider returning structured fields such as recommended department IDs, urgency, follow-up questions, and matching facility IDs in addition to `answer`.

5. Medical records and medication scanning screens are still demo-only. Backend APIs needed for full connection:
   - Medical records: upload/list/get records, file attachments, lab values, AI analysis result.
   - Medication scanning: image upload/OCR, medicine recognition result, drug interaction check.
   - Treatment reminders: reminders, follow-up visits, lab test tasks.

6. Existing facility API can support the map, but a dedicated nearby search would improve UX:
   - Query by `latitude`, `longitude`, `radiusKm`, `facilityType`, `departmentId`, `isOpenNow`.
   - Return `distanceKm` computed server-side.
