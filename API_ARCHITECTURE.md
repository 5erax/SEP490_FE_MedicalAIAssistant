# API Architecture

This frontend uses a centralized API layer so endpoints, request behavior, auth headers, and error handling stay consistent across the application.

## Structure

```txt
src/
  services/
    apiClient.js
    endpoints.js
    api.js
    authService.js
    userService.js
    doctorService.js
    aiConfigService.js
    departmentService.js
    facilityService.js
    patientProfileService.js
    subscriptionService.js
    chatbotService.js
    staffService.js
    anthropicService.js
```

## Responsibilities

### `apiClient.js`

Owns the common request behavior:

- API base URL resolution.
- `apiRequest(path, options)`.
- Auth token storage helpers.
- Auth header injection.
- JSON parsing.
- Backend error normalization.
- Pagination query helper.

Do not define domain endpoints in this file.

### `endpoints.js`

Owns every API path in one place.

Examples:

```js
ENDPOINTS.USERS.BASE
ENDPOINTS.USERS.BY_ID(userId)
ENDPOINTS.DOCTORS.STATUS(id)
ENDPOINTS.AI_CONFIGS.BY_TASK_TYPE(taskType)
```

Do not hardcode `/api/...` strings in service files. Add or update endpoint paths here first.

### Domain service files

Domain services expose product-level APIs to pages/components.

Examples:

```js
usersApi.list(1, 10)
doctorManagementApi.list(filters)
aiConfigManagementApi.setStatus(id, true)
webChatbotApi.message(message, { auth: true })
```

Service files should only compose:

```txt
apiRequest + ENDPOINTS + request payload/query params
```

They should not contain raw endpoint strings.

### `api.js`

`api.js` is a compatibility facade. Existing imports such as:

```js
import { authApi, usersApi } from "../services/api";
```

continue to work, but the implementation now lives in domain service files.

## Request Flow

```txt
Component/Page
  -> Domain Service
  -> ENDPOINTS
  -> apiRequest()
  -> Backend
```

Example:

```txt
AdminWorkspacePage
  -> aiConfigManagementApi.create(payload)
  -> ENDPOINTS.AI_CONFIGS.BASE
  -> apiRequest(path, { method: "POST", body, auth: true })
  -> POST /api/ai-configs
```

## Adding A New Endpoint

1. Add the endpoint to `src/services/endpoints.js`.

```js
export const ENDPOINTS = {
  EXAMPLE: {
    BASE: "/api/examples",
    BY_ID: (id) => `/api/examples/${id}`,
  },
};
```

2. Create or update the matching service file.

```js
import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export const exampleApi = {
  list() {
    return apiRequest(ENDPOINTS.EXAMPLE.BASE, { auth: true });
  },
};
```

3. Import the service from the page/component.

```js
import { exampleApi } from "../services/exampleService";
```

4. If the API must remain available through legacy imports, re-export it from `src/services/api.js`.

## Conventions

- Use `ENDPOINTS` for all backend paths.
- Use `apiRequest` for all HTTP requests unless a library-specific SDK is required.
- Keep service names domain-oriented: `authService`, `doctorService`, `aiConfigService`.
- Keep component/page code unaware of raw endpoint URLs.
- Prefer compatibility facades when refactoring existing imports.
- Do not mix UI state management into service files.
- Do not store business copy or mock data in endpoint/service files unless the feature is explicitly mock-only.

## Current Compatibility Files

These files intentionally preserve old import paths:

- `src/services/api.js`
- `src/services/doctors.js`
- `src/services/aiConfigManagement.js`
- `src/services/staffRegistration.js`

They should stay thin and only re-export the new domain services.

## Notes

- Production `/api/*` requests are still handled by `vercel.json` rewrites.
- Development `/api/*` requests are still handled by Vite proxy and `VITE_API_BASE_URL`.
- `anthropicService.js` centralizes the existing external Anthropic call used by the standalone chatbot page.
