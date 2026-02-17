# Family Tracker - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Family Tracker System                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Client App     │◄───────►│    API Server    │◄───────►│    MongoDB       │
│  (React + Vite)  │  HTTP   │  (Express ESM)   │  Mongo  │  Collections     │
│  Port: 5173      │         │  Port: 5000      │         │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
        │                            │                            │
        │                            │                            │
        ▼                            ▼                            ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Mappls SDK      │         │  Firebase Admin  │         │  • families      │
│  - Maps v3.0     │         │  Authentication  │         │  • users         │
│  - Direction     │         │  JWT Validation  │         │  • livelocations │
│  - Tracking      │         │                  │         │  • counters      │
└──────────────────┘         └──────────────────┘         │  • trips         │
                                                           └──────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  FamilyTrackerPage (Pages)                                  │    │
│  │  ├── Distance Alert System                                  │    │
│  │  ├── Lost Member Notifications                              │    │
│  │  └── Browser Notification Integration                       │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  FamilyTracker Component (Main View)                        │    │
│  │  ├── Create / Join Family Forms                             │    │
│  │  ├── Family Info Display                                    │    │
│  │  ├── Member List                                            │    │
│  │  ├── Location Sharing Controls                              │    │
│  │  ├── Lost Member Reporting                                  │    │
│  │  └── Navigate Button (per member)                           │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  FamilyMap Component (Navigation)                           │    │
│  │  ├── Mappls Map Integration                                 │    │
│  │  ├── Custom Markers (User + Member)                         │    │
│  │  ├── Route Display                                          │    │
│  │  ├── Live Tracking Toggle                                   │    │
│  │  └── Distance Calculator                                    │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Backend Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend (Express)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Routes (family.routes.js)                                  │    │
│  │  ▪ POST /create                                             │    │
│  │  ▪ POST /join                                               │    │
│  │  ▪ GET  /                                                   │    │
│  │  ▪ GET  /all (admin)                                        │    │
│  │  ▪ POST /location/update                                    │    │
│  │  ▪ POST /location/toggle                                    │    │
│  │  ▪ POST /trip/start                                         │    │
│  │  ▪ POST /member/lost/report                                 │    │
│  │  ▪ POST /member/lost/resolve                                │    │
│  │  ▪ POST /leave                                              │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Controllers (family.controller.js)                         │    │
│  │  ▪ Family CRUD Operations                                   │    │
│  │  ▪ Location Tracking Logic                                  │    │
│  │  ▪ Distance Calculation (Haversine)                         │    │
│  │  ▪ Lost Member Management                                   │    │
│  │  ▪ Trip Control                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Models (Mongoose Schemas)                                  │    │
│  │  ▪ family.model.js (with auto-increment & code gen)         │    │
│  │  ▪ user.model.js (updated with location fields)             │    │
│  │  ▪ liveLocation.model.js (existing)                         │    │
│  │  ▪ trip.model.js (existing)                                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Family Creation Flow

```
User Action                   Frontend                Backend                 Database
──────────                   ────────                ───────                 ────────
                                                                             
Click "Create"  ──────►  Enter Name  ──────►  POST /create  ──────►  Check if in family
                                                    │                        │
                                                    │                   ✓ Not in family
                                                    │                        │
                                                    ▼                        ▼
                         Display Code  ◄──────  Generate ID  ◄──────  Counter.findAndUpdate
                                                    │                   (1000 → 1001)
                                                    │                        │
                                                    │                        ▼
                         Save Family  ◄──────  Create Family  ◄──────  Generate Code
                                                    │                   (ABC123)
                                                    │                        │
                                                    ▼                        ▼
                         Update UI    ◄──────  Add Admin     ◄──────  Assign memberId
                                               (role: admin)           (1001.1)
```

### 2. Location Tracking Flow

```
GPS Position               Frontend                Backend                 Database
────────────              ────────                ───────                 ────────
                                                                         
Get Location  ──────►  navigator.geolocation  ──►  POST /location/update
                       getCurrentPosition()              │
                              │                          │
                              ▼                          ▼
                       {lat, lng, accuracy}      Store in User.currentLocation
                              │                          │
                              │                          ▼
                              │                   Update LiveLocation
                              │                          │
                              │                          ▼
                              │                   Calculate Distance
                              │                   to Family Admin
                              │                          │
                              │                    ✓ > 500m?
                              │                          │
                              ▼                          ▼
                       Show Alert  ◄──────────  Return Alert Data
                       Browser Notify
```

### 3. Navigation Flow

```
User Action               Frontend                Backend                 Mappls SDK
───────────              ────────                ───────                 ──────────
                                                                         
Click Navigate ──►  Open FamilyMap  ──────►  Load SDK Scripts  ──────►  Web SDK v3.0
                         │                          │                   Direction Plugin
                         ▼                          │                        │
                    Get Current Position            │                        │
                         │                          │                        │
                         ▼                          ▼                        ▼
                    Fetch Member Location      Return Coords           Initialize Map
                         │                          │                        │
                         ▼                          ▼                        ▼
                    Create Map Container       Set Center               Add Markers
                         │                          │                   (User + Member)
                         ▼                          ▼                        │
                    Load Direction Plugin      Calculate Route  ◄──────────┘
                         │                          │                        │
                         ▼                          ▼                        ▼
                    Display Route              Show Turn-by-Turn       Draw Polyline
                         │                                                   │
                         ▼                                                   ▼
              Enable Live Tracking  ──────►  Watch Position  ──────►  Update Route
                    (every 5 sec)              navigator.watchPosition   Auto Re-route
```

## Member ID Generation Logic

```
Family Creation:
  familyId = 1000 (from counter)
  Admin joins as first member
  Admin memberId = 1000.1

Member 2 Joins:
  Find family by code
  Count existing members (1)
  New memberIndex = 2
  memberId = 1000.2

Member 3 Joins:
  Count existing members (2)
  New memberIndex = 3
  memberId = 1000.3

Result:
  Family 1000
  ├─ 1000.1 (Admin)
  ├─ 1000.2 (Member)
  └─ 1000.3 (Member)
```

## Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │ Firebase │         │   API    │         │ MongoDB  │
└──────────┘         └──────────┘         └──────────┘         └──────────┘
     │                     │                     │                     │
     │  1. Sign In         │                     │                     │
     ├────────────────────►│                     │                     │
     │                     │                     │                     │
     │  2. ID Token        │                     │                     │
     │◄────────────────────┤                     │                     │
     │                     │                     │                     │
     │  3. API Request + Token                   │                     │
     ├──────────────────────────────────────────►│                     │
     │                     │                     │                     │
     │                     │  4. Verify Token    │                     │
     │                     │◄────────────────────┤                     │
     │                     │                     │                     │
     │                     │  5. Token Valid     │                     │
     │                     ├────────────────────►│                     │
     │                     │                     │                     │
     │                     │                     │  6. Query User      │
     │                     │                     ├────────────────────►│
     │                     │                     │                     │
     │                     │                     │  7. User Data       │
     │                     │                     │◄────────────────────┤
     │                     │                     │                     │
     │  8. Response Data   │                     │                     │
     │◄────────────────────────────────────────┤                     │
     │                     │                     │                     │
```

## Database Schema Relationships

```
┌─────────────────┐           ┌─────────────────┐
│     Counter     │           │      Family     │
├─────────────────┤           ├─────────────────┤
│ _id: "familyId" │───generates──►│ familyId: 1000 │
│ seq: 1000       │           │ familyCode: ABC │
└─────────────────┘           │ adminUserId ────┼────┐
                              │ members[]       │    │
                              │ activeTripId ───┼──┐ │
                              │ lostMembers[]   │  │ │
                              └─────────────────┘  │ │
                                      │            │ │
                                      │references  │ │
                                      ▼            │ │
                              ┌─────────────────┐ │ │
                              │      User       │◄┘ │
                              ├─────────────────┤   │
                              │ _id             │   │
                              │ familyId ───────┼───┤
                              │ memberId        │   │
                              │ currentLocation │   │references
                              │ isSharingLoc    │   │
                              └─────────────────┘   │
                                      │             │
                                      │references   │
                                      ▼             ▼
                              ┌─────────────────┐ ┌─────────────────┐
                              │  LiveLocation   │ │      Trip       │
                              ├─────────────────┤ ├─────────────────┤
                              │ userId          │ │ _id             │
                              │ familyId        │ │ familyId        │
                              │ location (GeoJ) │ │ createdBy       │
                              │ isSharing       │ │ status          │
                              │ lastUpdatedAt   │ │ itinerary[]     │
                              └─────────────────┘ └─────────────────┘
```

## Geospatial Indexing

```
LiveLocation Collection:
  {
    location: {
      type: "Point",
      coordinates: [longitude, latitude]  // [85.8245, 20.2961]
    }
  }
  
Index: location_2dsphere

Query Example:
  db.livelocations.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [85.8245, 20.2961]
        },
        $maxDistance: 500  // meters
      }
    }
  })
```

## State Management

```
FamilyTracker Component State:
  ├─ family (object)
  ├─ loading (boolean)
  ├─ error (string)
  ├─ showMap (boolean)
  ├─ selectedMember (object)
  ├─ locationSharing (boolean)
  ├─ showLostMemberDialog (boolean)
  └─ [form states]

FamilyMap Component State:
  ├─ isTracking (boolean)
  ├─ currentPosition (object)
  ├─ error (string)
  └─ [map refs]

FamilyTrackerPage State:
  ├─ distanceAlerts (array)
  └─ lostMemberAlerts (array)
```

## Technology Stack Summary

```
Frontend:
  ├─ React 19
  ├─ React Router
  ├─ Vite (build tool)
  ├─ Tailwind CSS
  ├─ Mappls Maps SDK v3.0
  ├─ HTML5 Geolocation API
  └─ Browser Notification API

Backend:
  ├─ Node.js
  ├─ Express (ESM modules)
  ├─ Mongoose (MongoDB ODM)
  ├─ Firebase Admin SDK
  └─ dotenv

Database:
  ├─ MongoDB
  └─ GeoJSON (for locations)

External Services:
  ├─ Firebase Authentication
  └─ Mappls Maps & Navigation
```

---

This architecture provides:
- ✅ Scalable family management
- ✅ Real-time location tracking
- ✅ Secure authentication
- ✅ Efficient geospatial queries
- ✅ Live navigation
- ✅ Alert system
