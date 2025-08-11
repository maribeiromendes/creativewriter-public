### Phase 1: Replace PouchDB/CouchDB with Firestore

1.  **Firebase Project Setup:**
    *   Create a new Firebase project in the Firebase console.
    *   Add a new web application to the project and copy the Firebase configuration object.
2.  **Install Dependencies:**
    *   Install the AngularFire library: `npm install @angular/fire`.
3.  **Initialize Firebase:**
    *   Create a new file `src/environments/environment.ts` (and `environment.prod.ts`) to store your Firebase configuration.
    *   Import and initialize Firebase in `app.config.ts` using `provideFirebaseApp` and `initializeApp`.
    *   Import and configure Firestore using `provideFirestore` and `getFirestore`.
4.  **Analyze Data Models:**
    *   I will read the contents of `src/app/core/models` and `src/app/stories/models` to understand the exact data structures that need to be migrated.
5.  **Create a Firestore Service:**
    *   I will create a new service `src/app/core/services/firestore.service.ts`.
    *   This service will use AngularFire to provide generic methods for CRUD (Create, Read, Update, Delete) operations on Firestore collections.
6.  **Migrate `database.service.ts`:**
    *   I will read `src/app/core/services/database.service.ts` to understand its public API.
    *   I will then replace the PouchDB implementation within this service with calls to the new `firestore.service.ts`, ensuring the public methods of `database.service.ts` remain the same to minimize impact on other services.
7.  **Update Dependent Services (One by One):**
    *   I will identify all services that use `database.service.ts`.
    *   I will then update each of these services one at a time, ensuring they work correctly with the new Firestore-backed `database.service.ts`.

### Phase 2: Implement Firebase Authentication

1.  **Enable Firebase Authentication:**
    *   In the Firebase console, I will enable the "Email/Password" and "Google" sign-in providers.
2.  **Configure Firebase Auth in App:**
    *   In `app.config.ts`, I will import and configure Firebase Auth using `provideAuth` and `getAuth`.
3.  **Refactor `auth.service.ts`:**
    *   I will replace the logic in `src/app/core/services/auth.service.ts` with calls to AngularFire Auth for login, logout, and checking the current user's authentication state.
4.  **Update Login Component:**
    *   I will update `src/app/shared/components/login.component.ts` to use the refactored `auth.service.ts`.
5.  **Create Route Guard:**
    *   I will create a new route guard using `CanActivateFn` that uses the `auth.service.ts` to protect authenticated routes.
6.  **Update Routes:**
    *   I will apply the new route guard to the relevant routes in `app.routes.ts`.

### Phase 3: Remove Proxies and Update API Services

1.  **Update API Services:**
    *   I will modify `src/app/core/services/openrouter-api.service.ts` to use the official API endpoint directly, removing the proxy path.
2.  **Secure API Keys:**
    *   I will move the API keys from the client-side code to a secure backend. I will start by creating Firebase Cloud Functions to handle the API requests.
3.  **Delete Proxy Files:**
    *   I will delete the `gemini-proxy` and `proxy` directories, as well as the `proxy.conf.json` file.

### Phase 4: Update Configuration and Deployment

1.  **Update `angular.json`:**
    *   I will remove the `proxyConfig` setting from the `serve` target in `angular.json`.
2.  **Update Docker Configuration:**
    *   I will remove the `gemini-proxy` and `proxy` services from `docker-compose.yml`.
    *   I will delete the `Dockerfile.gemini-proxy` and `Dockerfile.proxy` files.
3.  **Update Nginx Configuration:**
    *   I will remove the proxy-related `location` blocks from `nginx.conf`.

### Phase 5: OpenRouter-Only Refactoring

1.  **Remove Google Gemini Service:**
    *   I will delete the file `src/app/core/services/google-gemini-api.service.ts`.
2.  **Refactor Model Service:**
    *   I will refactor `src/app/core/services/model.service.ts` to remove any logic that uses the `GoogleGeminiApiService` and make it exclusively use `OpenRouterApiService`.
3.  **Update Settings:**
    *   I will review `src/app/settings/settings.component.ts` and `src/app/core/models/settings.interface.ts` to remove any settings related to selecting Google Gemini as the AI provider.
4.  **Update UI:**
    *   I will remove any UI elements that allow the user to select Google Gemini as the AI provider.
