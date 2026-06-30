# Project Context: NexRetail (Small Vendor POS)

## Overview
NexRetail is a modern Point of Sale (POS) and store management application built for small vendors. The system is designed with a microservices backend architecture and a React Native (Expo) frontend client.

## Technology Stack
- **Frontend**: React Native (Expo), Zustand (State Management), Axios, Expo Secure Store.
- **Backend Services**: Node.js, Express, Prisma ORM, PostgreSQL.
- **Microservices**:
  - `sv-user-service` (Port 3002): Handles authentication, store creation, and user/cashier management.
  - `sv-transaction-service` (Port 3001): Manages catalog (products, variants, inventory), POS checkout transactions, and telemetry (abandoned carts).
  - `sv-vision-service` (Port 3003): Handles ML-powered visual product search (pgvector based similarity matching).

## Architecture & Design Patterns
- **Service-Store Pattern**: The client separates API calls into pure services (`AuthService`, `CatalogService`, `TransactionService`, `VisionService`) and manages state using Zustand stores (`useAuthStore`, `useCatalogStore`, `useCartStore`).
- **Axios Interceptors**: The client uses multiple Axios instances (`userApi`, `txApi`, `visionApi`) configured in `src/config/api.ts`. A shared interceptor injects the JWT token stored securely via `expo-secure-store`.
- **Telemetry**: A non-blocking `TelemetryService` captures OLAP analytics (like abandoned carts or visual search failures) without interrupting the user experience.

## Completed Milestones
1. **Database Infrastructure**: Local PostgreSQL running on port 15432 via Docker. Prisma schemas for `sv-user-service` and `sv-transaction-service` have been successfully migrated (`db push`).
2. **Client Config & Networking**: Network map (`src/config/network.ts`) established for connecting to the three local microservices (10.0.2.2 alias for Android emulator).
3. **Authentication Layer**: Implemented backend auth routes, client `AuthService`, `useAuthStore`, and the initial Login/Register UI screen (`app/(auth)/index.tsx`).
4. **State Management Migration**: Legacy monolithic services have been broken down.
5. **Vision Service Integration**: Replaced legacy visual search in the POS screen (`app/(app)/pos.tsx`) with the new `VisionService`, correctly routing ML inference to the `sv-vision-service`.
6. **Telemetry Hookup**: Failed visual searches in the POS now report metrics via `TelemetryService`.

## Current State / Work in Progress
We are currently focusing on finishing the UI implementation and wiring it to the new robust state stores and API endpoints.

## Remaining Tasks (What needs to be done next)
1. **Product Onboarding UI (`app/(app)/products.tsx`)**:
   - Needs a significant update to support parent products and **variants** (e.g., sizes, flavors).
   - Must allow capturing separate images per variant, setting prices, and entering expiry information.
   - Design constraint: Must look modern and not cluttered.
2. **Complete POS Checkout (`app/(app)/pos.tsx`)**:
   - The UI cart logic is built, but the actual "Checkout" button needs to invoke `useCartStore.checkout()` to process the real ACID transaction against the backend.
3. **Order History Screen**:
   - Build a screen to fetch and display past receipts using `TransactionService.fetchHistory()`.
4. **Cashier Management Screen**:
   - Build a UI (accessible only to store owners) to register and manage employee cashier accounts via the user service.
5. **End-to-End Testing**:
   - Validate the entire flow from store registration -> adding product variants -> visual scanning in POS -> checkout -> viewing history.
