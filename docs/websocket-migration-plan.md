# WebSocket Migration Plan: Socket.IO to Raw WebSocket

**Status:** 📋 PLANNED (Not yet implemented)
**Current Workaround:** ✅ Socket.IO client added to mobile app (Feb 2026)
**Timeline:** 3-4 days when ready to implement
**Priority:** Medium (system works with current workaround)

---

## Executive Summary

This document outlines the migration plan from Socket.IO to raw WebSocket for the Wheels On Go platform's real-time communication layer. The migration will improve performance, reduce dependencies, and simplify the architecture while maintaining full backward compatibility with existing mobile clients.

### Current State (Workaround)
- **Backend:** Socket.IO gateways for `/dispatch` and `/tracking` namespaces
- **Mobile:** Socket.IO client library added (io.socket:socket.io-client:2.1.1)
- **Status:** System functional, but adds ~250KB to APK size

### Future State (After Migration)
- **Backend:** Raw WebSocket gateways using `ws` library
- **Mobile:** Revert to native OkHttp WebSocket (removes Socket.IO client dependency)
- **Benefits:** Faster, lighter, simpler, production-ready

---

## Context

### The Problem
When drivers toggle "Online" in the mobile app, they experienced a recurring error toast: **"Unexpected end of stream on http://10.0.2.2:3000/..."** that appeared every 5 seconds.

**Root Cause:** Protocol mismatch between mobile and backend WebSocket implementations.

- **Backend** ([dispatch.gateway.ts:22-28](apps/api/src/dispatch/dispatch.gateway.ts#L22-L28)): Uses **Socket.IO** (not raw WebSocket)
  - Imports `Server, Socket` from `socket.io`
  - Expects Socket.IO handshake protocol with session negotiation, heartbeats
  - NestJS `@WebSocketGateway` decorator with Socket.IO adapter

- **Mobile (Originally)** ([DispatchSocketClient.kt:37-59](apps/mobile/app/src/main/java/com/wheelsongo/app/data/network/DispatchSocketClient.kt#L37-L59)): Used **OkHttp raw WebSocket**
  - Native WebSocket protocol (RFC 6455)
  - Direct connection to `ws://10.0.2.2:3000/dispatch`
  - No Socket.IO client library

**What was happening:**
1. Driver goes online → [DriverHomeViewModel.kt:113](apps/mobile/app/src/main/java/com/wheelsongo/app/ui/screens/driver/DriverHomeViewModel.kt#L113) calls `socketClient.connect()`
2. OkHttp sends raw WebSocket handshake
3. Backend Socket.IO server expects Socket.IO protocol → rejects connection
4. Connection fails → "Unexpected end of stream" error
5. Auto-reconnect retries every 5 seconds → recurring error toast

### Quick Fix Implemented (Feb 2026)
Added Socket.IO client to mobile app as a temporary workaround:
- [build.gradle.kts:114](apps/mobile/app/build.gradle.kts#L114): `implementation("io.socket:socket.io-client:2.1.1")`
- [DispatchSocketClient.kt](apps/mobile/app/src/main/java/com/wheelsongo/app/data/network/DispatchSocketClient.kt): Refactored to use Socket.IO client
- **Result:** System now works, but adds dependency weight

---

## System Architecture Analysis

### Current WebSocket Infrastructure

**Backend has TWO Socket.IO namespaces:**

| Namespace | Purpose | Events | Status |
|-----------|---------|--------|--------|
| `/dispatch` | Ride dispatch workflow | dispatch:request, dispatch:accept/decline, ride:driver_assigned | ✅ Working (with Socket.IO client on mobile) |
| `/tracking` | Driver location tracking | driver:location:update, driver:location broadcasts, geofence events | ✅ Backend ready, ⏸️ Mobile not integrated yet |

**Mobile has ONE WebSocket client:**
- [DispatchSocketClient.kt](apps/mobile/app/src/main/java/com/wheelsongo/app/data/network/DispatchSocketClient.kt) (~264 lines)
- Used by DriverHomeViewModel and ActiveRideViewModel
- Clean architecture: Kotlin Flow, sealed DispatchEvent class
- Currently using Socket.IO client (temporary)

**Dependencies:**
- Backend: `socket.io: ^4.8.3`, `@nestjs/platform-socket.io: ^10.4.22`, `@nestjs/websockets: ^10.4.22`
- Mobile: `io.socket:socket.io-client:2.1.1` (workaround), `okhttp: 4.12.0` (for HTTP)

---

## Solution Options Analysis

### Option 1: Keep Socket.IO Client on Mobile ❌ NOT RECOMMENDED FOR LONG-TERM

**Current State:**
- Socket.IO client added to mobile
- Works correctly
- System functional

**Cons:**
- ❌ Adds 250KB+ to APK size
- ❌ Socket.IO protocol has overhead vs. raw WebSocket
- ❌ Backend Socket.IO setup **isn't production-ready** (uses in-memory adapter, needs Redis for multi-server scaling)
- ❌ More complex than needed for this use case
- ❌ Future tracking namespace would also use Socket.IO client

**Use Case:** Acceptable as short-term workaround while planning proper migration.

---

### Option 2: Convert Backend to Raw WebSocket ✅ RECOMMENDED FOR LONG-TERM

**Implementation:**
- Replace NestJS Socket.IO gateways with raw WebSocket implementation
- Keep same authentication pattern (JWT via query param)
- Maintain same message format (JSON with event/data structure)
- Add room management for user-specific and ride-specific subscriptions
- Revert mobile app to OkHttp WebSocket (remove Socket.IO client)

**Pros:**
- ✅ **Simpler protocol** - raw WebSocket is lightweight, faster, no handshake overhead
- ✅ **Removes dependencies** - eliminates 3 Socket.IO packages from backend, 1 from mobile
- ✅ **Reduces APK size** - removes ~250KB Socket.IO client from mobile
- ✅ **Production-ready from day 1** - no Redis adapter needed for multi-server (can use sticky sessions or Redis pub/sub if needed later)
- ✅ **Better performance** - no Socket.IO overhead, direct message passing
- ✅ **Full control** - custom protocol tailored to our needs
- ✅ **Future-proof** - tracking namespace will use same raw WebSocket approach
- ✅ **Maintainability** - less complex than Socket.IO abstraction
- ✅ **Mobile-first design** - returns mobile to its original clean architecture

**Cons:**
- ⚠️ Backend refactoring required (2 gateways)
- ⚠️ Need to implement room management manually (straightforward with Map)
- ⚠️ Need to implement heartbeat/ping-pong for connection health
- ⚠️ Requires 3-4 days of focused work

**Code Impact:**
- 🟡 Medium-High: Refactor 2 backend gateways (dispatch + tracking)
- 🟢 Low: Mobile reverts to original OkHttp WebSocket implementation
- 🟢 Remove 3 dependencies from backend package.json
- 🟢 Remove 1 dependency from mobile build.gradle.kts

---

## Recommended Approach: Option 2 (Raw WebSocket Backend)

### Why This Is Best for the System

1. **Mobile-first design**: Returns mobile app to its original clean architecture with raw WebSocket
2. **Dependency reduction**: Removes 3 packages from backend, 1 from mobile (~250KB APK savings)
3. **Performance**: Raw WebSocket has lower latency and overhead than Socket.IO
4. **Simplicity**: Easier to debug, test, and maintain than Socket.IO abstraction
5. **Production readiness**: Current Socket.IO setup needs Redis adapter to scale; raw WebSocket can use sticky sessions or simpler pub/sub
6. **Consistency**: Both namespaces (/dispatch and /tracking) will use same raw WebSocket approach
7. **HTTP fallback already exists**: Tracking has HTTP endpoints, so WebSocket is enhancement not requirement

---

## Implementation Plan

### Phase 1: Create Raw WebSocket Gateway (Dispatch)

**New file:** `apps/api/src/dispatch/dispatch-ws.gateway.ts`

**Architecture:**
- Extend NestJS `@WebSocketGateway()` without Socket.IO platform
- Use `ws` library (standard WebSocket) instead of `socket.io`
- Implement `OnGatewayConnection`, `OnGatewayDisconnect`, `OnGatewayInit`

**Core components:**

```typescript
import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocket, WebSocketServer } from 'ws';

@WebSocketGateway({ path: '/dispatch' })
export class DispatchWsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: WebSocketServer;

  // Maps: userId → WebSocket, socketId → userId
  private userSocketMap = new Map<string, WebSocket>();
  private socketUserMap = new Map<WebSocket, string>();

  // Room management: roomName → Set<WebSocket>
  private rooms = new Map<string, Set<WebSocket>>();

  async handleConnection(client: WebSocket, request: any) {
    // 1. Extract token from query param (ws://host/dispatch?token=xxx)
    // 2. Verify JWT with JwtService
    // 3. Extract userId from payload
    // 4. Store in maps
    // 5. Join user:{userId} room
    // 6. Check for pending dispatch
    // 7. Send connected confirmation
  }

  handleDisconnect(client: WebSocket) {
    // 1. Get userId from socketUserMap
    // 2. Remove from all maps and rooms
    // 3. Log disconnection
  }

  // Helper: Send to specific user
  sendToUser(userId: string, event: string, data: any) { ... }

  // Helper: Broadcast to room
  broadcastToRoom(roomName: string, event: string, data: any) { ... }

  // Helper: Parse incoming message
  handleMessage(client: WebSocket, message: string) {
    const { event, data } = JSON.parse(message);
    switch (event) {
      case 'dispatch:accept': ...
      case 'dispatch:decline': ...
    }
  }
}
```

**Message format (same as current):**
```json
// Client → Server
{"event":"dispatch:accept","data":{"dispatchAttemptId":"<id>"}}

// Server → Client
{"event":"dispatch:request","data":{"dispatchAttemptId":"...","ride":{...}}}
```

**Authentication:**
- Extract token from `ws://host/dispatch?token={jwt}`
- Verify with `JwtService.verify(token, { secret: JWT_SECRET })`
- Disconnect if invalid

**Room management:**
- User-specific: `user:{userId}` (for dispatch requests)
- Ride-specific: `ride:{rideId}` (for status updates)
- Helper methods: `joinRoom()`, `leaveRoom()`, `broadcastToRoom()`

**Heartbeat/ping-pong:**
- Send ping every 30 seconds
- Disconnect if no pong after 60 seconds
- Mobile client responds to ping automatically (OkHttp handles it)

---

### Phase 2: Create Raw WebSocket Gateway (Tracking)

**New file:** `apps/api/src/tracking/tracking-ws.gateway.ts`

**Similar structure to dispatch gateway:**
- Same authentication pattern
- Room subscriptions: `ride:{rideId}` for location broadcasts
- Events:
  - `driver:location:update` (driver → server)
  - `driver:location` (server → subscribed riders)
  - `rider:subscribe:ride`, `rider:unsubscribe:ride`
  - `geofence:event`

---

### Phase 3: Update Backend Modules & Dependencies

**Modify:** `apps/api/src/dispatch/dispatch.module.ts`
```typescript
// Replace DispatchGateway with DispatchWsGateway
providers: [DispatchService, DispatchWsGateway],
exports: [DispatchService, DispatchWsGateway],
```

**Modify:** `apps/api/src/tracking/tracking.module.ts`
```typescript
// Replace TrackingGateway with TrackingWsGateway
providers: [TrackingService, TrackingWsGateway],
exports: [TrackingService, TrackingWsGateway],
```

**Modify:** `apps/api/src/ride/ride.controller.ts`
```typescript
// Update injection
constructor(
  private readonly rideService: RideService,
  private readonly dispatchGateway: DispatchWsGateway, // Changed
)
```

**Modify:** `apps/api/package.json`
```json
// Remove Socket.IO dependencies
- "@nestjs/platform-socket.io": "^10.4.22"
- "socket.io": "^4.8.3"

// Add ws library (if not already included with @nestjs/websockets)
+ "ws": "^8.18.0"
```

**Note:** `@nestjs/websockets` supports both Socket.IO and raw WebSocket, so it stays.

---

### Phase 4: Mobile Client Reversion

**Modify:** `apps/mobile/app/build.gradle.kts`
```kotlin
// REMOVE Socket.IO client dependency
- implementation("io.socket:socket.io-client:2.1.1")
```

**Revert:** [DispatchSocketClient.kt](apps/mobile/app/src/main/java/com/wheelsongo/app/data/network/DispatchSocketClient.kt)

Restore original OkHttp WebSocket implementation:

```kotlin
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

class DispatchSocketClient(...) {
    private var webSocket: WebSocket? = null

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    fun connect() {
        val token = tokenManager.getAccessToken() ?: return
        val wsUrl = AppConfig.BASE_URL
            .replace("http://", "ws://")
            .replace("https://", "wss://")
            .trimEnd('/') + "/dispatch?token=$token"

        val request = Request.Builder().url(wsUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) { ... }
            override fun onMessage(webSocket: WebSocket, text: String) { ... }
            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) { ... }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) { ... }
        })
    }
}
```

**No ViewModel changes needed** - same interface maintained.

---

### Phase 5: Testing & Verification

#### 1. Backend Unit Tests

**New file:** `apps/api/test/dispatch-ws.gateway.spec.ts`
- Test JWT authentication on connection
- Test message parsing and routing
- Test room management (join/leave/broadcast)
- Test disconnect cleanup

**New file:** `apps/api/test/tracking-ws.gateway.spec.ts`
- Test location update handling
- Test rider subscription/unsubscription
- Test geofence event broadcasts

#### 2. Integration Testing

**Test flow 1: Dispatch workflow (driver)**
1. Driver goes online → mobile connects to `ws://localhost:3000/dispatch?token={jwt}`
2. Backend accepts connection, verifies JWT
3. Create ride via HTTP POST
4. Backend sends `dispatch:request` to driver
5. Mobile receives event, shows incoming ride request
6. Driver taps Accept → mobile sends `{"event":"dispatch:accept","data":{...}}`
7. Backend processes, sends `dispatch:accepted` back
8. Driver navigates to ActiveRideScreen

**Test flow 2: Dispatch workflow (rider)**
1. Rider creates ride → backend dispatches to driver
2. Rider's ActiveRideViewModel connects to `/dispatch`
3. Backend sends `dispatch:status` "SEARCHING"
4. Driver accepts → backend sends `ride:driver_assigned`
5. Rider refetches ride, sees driver info

**Test flow 3: Auto-reconnect**
1. Driver connected to /dispatch
2. Restart backend server
3. Mobile auto-reconnects after 5 seconds
4. Backend checks for pending dispatch, sends if exists

**Test flow 4: Concurrent drivers**
1. 5 drivers online, all connected
2. Rider creates ride
3. Backend dispatches to nearest driver only
4. If declined, next driver gets notified

#### 3. Manual Mobile Testing

**Emulator testing:**
1. Build backend with new WebSocket gateways
2. Start backend: `npm run start:dev`
3. Build mobile APK: `cd apps/mobile && java -classpath gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain assembleDebug`
4. Install on emulator
5. Login as driver → toggle Online → **verify no error toast**
6. Login as rider → create ride → verify dispatch works

**Real device testing:**
1. Deploy backend to staging server
2. Install APK on real Android device
3. Test over WiFi and mobile data
4. Verify WebSocket stays connected during screen lock/unlock

#### 4. Load Testing

**Simulate scale:**
1. 50 concurrent drivers online (WebSocket connections)
2. 100 riders creating rides simultaneously
3. Monitor backend memory, CPU, WebSocket connection count
4. Verify no connection leaks, proper cleanup on disconnect

---

## File Changes Summary

### Backend — New (2 files)
| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `apps/api/src/dispatch/dispatch-ws.gateway.ts` | Raw WebSocket dispatch gateway | ~350 |
| `apps/api/src/tracking/tracking-ws.gateway.ts` | Raw WebSocket tracking gateway | ~300 |

### Backend — Modify (5 files)
| File | Change |
|------|--------|
| `apps/api/src/dispatch/dispatch.module.ts` | Replace DispatchGateway with DispatchWsGateway |
| `apps/api/src/tracking/tracking.module.ts` | Replace TrackingGateway with TrackingWsGateway |
| `apps/api/src/ride/ride.controller.ts` | Update DispatchGateway injection |
| `apps/api/package.json` | Remove Socket.IO packages, add ws if needed |
| `apps/api/src/app.module.ts` | (No change needed - modules import automatically) |

### Backend — Delete (2 files)
| File | Reason |
|------|--------|
| `apps/api/src/dispatch/dispatch.gateway.ts` | Replaced by dispatch-ws.gateway.ts |
| `apps/api/src/tracking/tracking.gateway.ts` | Replaced by tracking-ws.gateway.ts |

### Backend — Tests (2 new files)
| File | Purpose |
|------|---------|
| `apps/api/test/dispatch-ws.gateway.spec.ts` | Unit tests for dispatch WebSocket |
| `apps/api/test/tracking-ws.gateway.spec.ts` | Unit tests for tracking WebSocket |

### Mobile — Modify (2 files)
| File | Change |
|------|--------|
| `apps/mobile/app/build.gradle.kts` | Remove Socket.IO client dependency |
| `apps/mobile/app/src/main/java/com/wheelsongo/app/data/network/DispatchSocketClient.kt` | Revert to OkHttp WebSocket implementation |

**No ViewModel changes needed** - interface stays the same.

---

## Migration Strategy

### Step 1: Parallel Implementation (No Downtime)
1. Create new `dispatch-ws.gateway.ts` alongside existing `dispatch.gateway.ts`
2. Both run simultaneously on different paths:
   - Old: `/dispatch` (Socket.IO)
   - New: `/dispatch-ws` (raw WebSocket)
3. Test new gateway thoroughly
4. Once verified, swap paths and deprecate old gateway

### Step 2: Feature Flag (Optional)
```typescript
// In dispatch.module.ts
const useRawWebSocket = configService.get('USE_RAW_WEBSOCKET', false);

providers: [
  DispatchService,
  useRawWebSocket ? DispatchWsGateway : DispatchGateway,
],
```

### Step 3: Mobile App Update
1. Build new APK with OkHttp WebSocket (Socket.IO client removed)
2. Test against new raw WebSocket backend
3. Release updated APK to users

### Step 4: Backend Cutover
1. Deploy backend with both gateways running
2. Monitor for 24 hours
3. Remove old Socket.IO gateways
4. Remove Socket.IO dependencies from package.json

---

## Rollback Plan

If raw WebSocket implementation has issues:

1. **Immediate**: Revert to Socket.IO gateway (keep old code in git)
2. **Short-term**: Re-add Socket.IO client to mobile app (current workaround)
3. **Long-term**: Fix raw WebSocket issues and retry migration

**Risk mitigation:**
- Keep old Socket.IO gateways in git history
- Use feature flag for easy switching
- Thorough testing before full cutover
- Parallel deployment strategy ensures zero downtime

---

## Performance Comparison

| Metric | Socket.IO | Raw WebSocket |
|--------|-----------|---------------|
| **Connection handshake** | 3-4 HTTP requests | 1 HTTP request |
| **Message overhead** | ~20-30 bytes | ~2-6 bytes |
| **Latency** | +5-10ms | Baseline |
| **Memory per connection** | ~50KB | ~20KB |
| **Backend dependencies** | 3 packages (~500KB) | 1 package (~100KB) |
| **Mobile APK size** | +250KB | No additional size |
| **Complexity** | High (abstraction) | Medium (direct) |

---

## Alternative Considered: GraphQL Subscriptions

**Why not GraphQL?**
- Much heavier dependency chain
- Overkill for simple event-based messaging
- Would require complete refactor of mobile data layer
- WebSocket is sufficient for our use case

---

## Timeline Estimate

| Phase | Effort | Duration |
|-------|--------|----------|
| 1. Dispatch gateway | High | 1 day |
| 2. Tracking gateway | High | 1 day |
| 3. Module updates | Low | 2 hours |
| 4. Mobile reversion | Low | 2 hours |
| 5. Testing | Medium | 1 day |
| 6. Deployment | Low | 2 hours |
| **Total** | | **3-4 days** |

---

## Success Criteria

✅ Driver can toggle Online without error toast
✅ Dispatch requests flow driver → accept → rider notified
✅ Auto-reconnect works within 5 seconds
✅ All backend tests pass (130+ tests after adding new ones)
✅ No Socket.IO dependencies in backend package.json
✅ No Socket.IO client in mobile build.gradle.kts
✅ Mobile APK size reduced by ~250KB
✅ WebSocket connections cleaned up on disconnect (no memory leaks)
✅ Load test: 50 drivers + 100 riders with stable connections
✅ Performance improvement: lower latency, reduced overhead

---

## Change Log

**Feb 16, 2026** - Document created with comprehensive migration plan
**Feb 16, 2026** - Socket.IO client workaround implemented on mobile (temporary fix)
**Status:** Migration planned but not yet implemented (waiting for appropriate time)

---

## References

- [Backend Dispatch Gateway](../apps/api/src/dispatch/dispatch.gateway.ts)
- [Backend Tracking Gateway](../apps/api/src/tracking/tracking.gateway.ts)
- [Mobile DispatchSocketClient](../apps/mobile/app/src/main/java/com/wheelsongo/app/data/network/DispatchSocketClient.kt)
- [Mobile Build Config](../apps/mobile/app/build.gradle.kts)
- [NestJS WebSockets Documentation](https://docs.nestjs.com/websockets/gateways)
- [ws Library Documentation](https://github.com/websockets/ws)
- [OkHttp WebSocket Documentation](https://square.github.io/okhttp/4.x/okhttp/okhttp3/-web-socket/)
