# Backend - Frontend Contract Audit

Audit date: 2026-06-12

Backend source: `http://52.77.210.243:8080/swagger/v1/swagger.json`

## Integrated backend groups

- Authentication: login, register, Google login, refresh, logout, forgot password, OTP password change, staff registration and approval.
- Users: list, current user, update and delete.
- Medical departments: list and full admin/staff CRUD.
- Medical facilities: public active list, admin list and creation with `departmentIds`.
- Facility departments: public active list used as the required doctor assignment value.
- Doctors: list, create, update, status, delete and active list.
- Doctor invitations: admin create/revoke and public validate/register.
- Patient profiles: list, create, update and delete service; profile UI uses the supported schema.
- Subscription plans, checkout, current subscription, cancellation and payment status.
- AI configurations: list and full admin CRUD/status.
- Web chatbot.
- Symptom analysis: analyze request and backend response rendering.
- Feedback reviews: facility review list and authenticated creation.

## Backend contract limitations

- Doctor invitations have create and revoke endpoints, but no endpoint to list invitations. The frontend can only revoke an invitation retained in the current UI session.
- `DoctorInvitationResponse` does not expose an invitation URL or token. The frontend assumes backend email delivery is responsible for distributing the link.
- Facility departments only expose an active-list endpoint. Their lifecycle is indirectly managed through `MedicalFacility.departmentIds`.
- Swagger operations do not declare security metadata even where runtime responses include `401` and `403`. Client authentication requirements must currently be inferred.
- The backend is HTTP-only. Browser clients must use the same-origin Vite/Vercel `/api` proxy to avoid CORS and HTTPS mixed-content failures.
- Current live data returns one medical department (`Tim mạch`) but zero active medical facilities and zero active facility departments. Doctor assignment remains unavailable until backend data includes a facility-department link.

## Frontend screens without backend APIs

These screens are explicitly marked as demo and were not expanded:

- `/records`: medical records, uploads, lab values and record AI analysis.
- `/medication`: medicine image recognition and drug interaction checking.

The Swagger document currently has no matching endpoint group for those features.

## Provider-only backend endpoints

The PayOS return, cancel and webhook endpoints are backend/provider callbacks. They do not require separate data-entry UI; the frontend consumes the payment status and renders `/payment/return` and `/payment/cancel`.
