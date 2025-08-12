# Firebase Migration Status & Implementation Plan

## 📊 Overall Status
- **Core Infrastructure:** ✅ COMPLETED
- **Basic Authentication:** ✅ COMPLETED  
- **Service Migration:** 🟡 IN PROGRESS
- **New Features:** 🟡 PENDING

---

## ✅ COMPLETED PHASES

### Phase 1: Replace PouchDB/CouchDB with Firestore ✅
1.  **Firebase Project Setup:** ✅
    *   ✅ Create a new Firebase project in the Firebase console
    *   ✅ Add a new web application to the project and copy the Firebase configuration object
2.  **Install Dependencies:** ✅
    *   ✅ Install the AngularFire library: `npm install @angular/fire`
3.  **Initialize Firebase:** ✅
    *   ✅ Create `src/environments/environment.ts` and `environment.prod.ts` with Firebase configuration
    *   ✅ Import and initialize Firebase in `app.config.ts` using `provideFirebaseApp` and `initializeApp`
    *   ✅ Import and configure Firestore using `provideFirestore` and `getFirestore`
4.  **Core Services Migration:** ✅
    *   ✅ Create `src/app/core/services/firestore.service.ts` with generic CRUD operations
    *   ✅ Migrate `database.service.ts` to use Firestore with compatibility layer
    *   ✅ Update `auth.service.ts` with Firebase Auth and User interface with `uid` property
    *   ✅ Completely rewrite `story.service.ts` to use Firestore CRUD operations

### Phase 2: Basic Firebase Authentication ✅
1.  **Firebase Console Setup:** ✅
    *   ✅ Enable "Email/Password" and "Google" sign-in providers
2.  **App Configuration:** ✅
    *   ✅ Configure Firebase Auth in `app.config.ts` using `provideAuth` and `getAuth`
3.  **Service Implementation:** ✅
    *   ✅ Refactor `auth.service.ts` with Firebase Auth calls (anonymous login working)
    *   ✅ Update `login.component.ts` to use refactored auth service

### Phase 4: Configuration and Deployment Cleanup ✅
1.  ✅ **Update `angular.json`:** Remove `proxyConfig` setting from serve target
2.  ✅ **Update Docker Configuration:** Remove gemini-proxy and proxy services from docker-compose.yml
3.  ✅ **Update Nginx Configuration:** Remove proxy-related location blocks from nginx.conf

### Phase 5: OpenRouter-Only Refactoring ✅
1.  ✅ **Remove Google Gemini Service:** Delete `google-gemini-api.service.ts`
2.  ✅ **Refactor Model Service:** Remove GoogleGeminiApiService usage, exclusively use OpenRouterApiService

---

## 🟡 PENDING TASKS (Priority Order)

### PRIORITY 1: Complete Google Authentication 🟡
**Current Status:** Anonymous login works, Google login needs implementation

**Tasks:**
- 🟡 **Modify `auth.service.ts` for Google Authentication:**
  - Import `GoogleAuthProvider` and `signInWithPopup` from `@angular/fire/auth`
  - Add `loginWithGoogle()` method with GoogleAuthProvider
  - Ensure consistent error handling with existing login method

- 🟡 **Update `login.component.ts` for Google Login:**
  - Add call to new `authService.loginWithGoogle()` method
  - Change button text from "Start Writing Now" to "Login with Google"
  - Remove "About Anonymous Writing" section from template
  - Add Google icon to login button for better UX

### PRIORITY 2: Route Protection 🟡
**Current Status:** Routes are unprotected

**Tasks:**
- 🟡 **Create Route Guard:** Implement `CanActivateFn` using `auth.service.ts`
- 🟡 **Update Routes:** Apply route guard to relevant routes in `app.routes.ts`

### PRIORITY 3: Complete Service Migration 🟡
**Current Status:** 5 services still using PouchDB methods

**Services Requiring Updates:**

**(A) PouchDB-specific method replacements:**
- 🟡 `src/app/shared/services/image.service.ts`
  - **Methods:** `db.find()`, `db.get()`, `db.put()`, `db.remove()`
  - **Replace with:** `databaseService.getAll()`, `get()`, `create()/update()`, `delete()`
  - **Collection:** `images`

- 🟡 `src/app/shared/services/video.service.ts`
  - **Methods:** `db.find()`, `db.get()`, `db.put()`, `db.remove()`
  - **Replace with:** Firestore equivalents via databaseService
  - **Collection:** `videos`

- 🟡 `src/app/stories/services/codex.service.ts`
  - **Methods:** `db.put()`, `db.get()`, `db.remove()`, `db.find()`
  - **Replace with:** `databaseService` methods for codex entries
  - **Collection:** `codex`

- 🟡 `src/app/shared/services/db-maintenance.service.ts`
  - **Methods:** `db.find()`, `db.info()`, `db.compact()`
  - **Replace with:** `getAll()` for find(), remove info() and compact() (not needed in Firestore)

- 🟡 `src/app/shared/services/novelcrafter-import.service.ts`
  - **Methods:** `storyService.createStory()` method signature
  - **Fix:** Update to provide required story object parameter

### PRIORITY 4: Fix Component Method Issues 🟡
**Current Status:** 3 components have missing/broken method calls

**Components:**
- 🟡 `src/app/stories/components/story-editor.component.ts`
  - **Missing:** `storyService.getScene()` method
  - **Fix:** Add getScene() method to story service or use existing scene access patterns

- 🟡 `src/app/stories/components/story-list.component.ts`
  - **Missing:** `storyService.reorderStories()`, updated `createStory()` signature
  - **Fix:** Add reorderStories() method and fix createStory() calls with proper parameters

- 🟡 `src/app/stories/components/story-structure.component.ts`
  - **Missing:** `addChapter()`, `addScene()`, `formatChapterDisplay()`, `formatSceneDisplay()`
  - **Fix:** Implement missing methods with proper signatures and display formatting

### PRIORITY 5: Final Cleanup 🟡
**Current Status:** Some legacy references remain

**Tasks:**
- 🟡 **Remove Google Gemini UI References:**
  - Clean up `settings.component.ts` - remove Gemini-related form fields, toggles, properties
  - Update `settings.interface.ts` - remove Gemini provider settings
  - Remove any remaining UI elements for Gemini provider selection

- 🟡 **Eliminate PouchDB Remnants:**
  - Delete `src/proxy.conf.json` (still exists)
  - Delete `src/types/pouchdb.d.ts` (still exists)
  - Global search for remaining "pouchdb" references in src directory
  - Refactor any remaining PouchDB code to use Firestore services

- 🟡 **API Services Update:**
  - Modify `openrouter-api.service.ts` to use official API endpoint (remove proxy path)
  - Create Firebase Cloud Functions for secure API key handling
  - Remove client-side API key exposure

---

## 🚀 FUTURE FEATURES (Phase 7)

### Role-Based System Implementation 🟡
**Current Status:** Not started - new feature

**1. Index Page and Role-Based Routing:**
- 🟡 Generate new component `src/app/home/home.component.ts` as landing page
- 🟡 Add buttons: "Enter as Author" and "Enter as Reader"
- 🟡 Create `AuthorModule` for existing writing application
- 🟡 Create `ReaderModule` for new reader functionality  
- 🟡 Create `AdminModule` for admin-specific tasks
- 🟡 Update `app.routes.ts` to make HomeComponent default route (`/`)
- 🟡 Move existing application logic into AuthorModule

**2. Role System Implementation:**
- 🟡 Add `role` property to User interface ('author', 'reader', 'admin')
- 🟡 Implement role assignment logic (default to 'author')
- 🟡 Create role-based route guards (AuthorGuard, ReaderGuard, AdminGuard)
- 🟡 Update Firestore security rules for role-based access control

---

## 📋 Implementation Strategy

**Migration Approach:**
1. **Service-by-Service:** Update each service individually to minimize disruption
2. **Maintain Compatibility:** Keep existing method signatures where possible
3. **Test Incrementally:** Verify each service works after migration before moving to next
4. **Priority-Based:** Focus on authentication and core functionality first
5. **Clean Up Last:** Remove legacy code after all services are migrated

**Current App State:**
- ✅ **Functional:** Firebase/Firestore integrated, anonymous auth working
- ✅ **Stable:** Core writing functionality operational
- 🟡 **Needs Work:** Google auth, some service migrations, component method fixes
- 🟡 **Future:** Role-based system for multi-user scenarios

**Next Recommended Action:** Start with Priority 1 (Google Authentication) to enhance user experience.