# Family Tracker Feature Documentation

## Overview
The Family Tracker is a comprehensive location tracking system that allows families to track each other's locations during trips, with features for creating/joining families, live location tracking, navigation, and lost member alerts.

## Features Implemented

### 1. Family Management
- **Create Family**: Admin creates a family and receives a unique 6-character code
- **Join Family**: Users can join a family using the family code
- **One Family Per User**: Users can only be part of one family at a time
- **Family ID System**: Auto-incrementing family IDs starting from 1000
- **Member ID System**: Each member gets a unique ID in format `familyId.memberIndex` (e.g., 1000.1, 1000.2)

### 2. Location Tracking
- **Real-time Location Updates**: Members can share their live location
- **Location Storage**: Each member's latitude/longitude is stored in the database
- **Location Sharing Toggle**: Members control when they share their location
- **Location Update Frequency**: Automatic updates every 30 seconds when enabled
- **Last Update Timestamp**: Track when each member's location was last updated

### 3. Trip Management
- **Admin-Only Trip Start**: Only family admin can start a trip
- **Active Trip Tracking**: Family has an active trip indicator
- **Trip Editing**: All members can participate during trips

### 4. Distance Alerts
- **Configurable Distance Threshold**: Default 500 meters
- **Automatic Distance Calculation**: Using Haversine formula
- **Real-time Alerts**: Popup notifications when members are too far
- **Browser Notifications**: Native browser notifications for alerts

### 5. Lost Member System
- **Report Lost Members**: Any family member can report another as lost
- **Last Known Location**: Stores the last known coordinates
- **Alert All Members**: Everyone in the family is notified
- **Resolution Tracking**: Track when lost members are found
- **Visual Indicators**: Red alerts show unreported lost members

### 6. Navigation & Map
- **Mappls Integration**: Using Mappls SDK with direction plugin
- **Member Location View**: Click to see any member's location on map
- **Live Tracking**: Real-time route navigation using Mappls tracking plugin
- **Route Re-calculation**: Automatic route updates as you move
- **Distance Display**: Shows real-time distance to family members
- **Custom Markers**: Visual markers for current user and target member

### 7. Admin Features
- **App-Wide Admin View**: System admins can view all families
- **Family Statistics**: See member count, active trips per family
- **Family Head Location**: View location of each family's admin

## Database Schema

### Family Model
```javascript
{
  familyId: Number (auto-increment from 1000),
  familyCode: String (6-char unique code),
  familyName: String,
  adminUserId: ObjectId (ref: User),
  isChild: Boolean,
  members: [{
    userId: ObjectId (ref: User),
    memberId: String (familyId.index),
    role: String (admin/member),
    joinedAt: Date
  }],
  activeTripId: ObjectId (ref: Trip),
  lostMembers: [{
    userId: ObjectId,
    reportedBy: ObjectId,
    reportedAt: Date,
    lastKnownLocation: GeoJSON Point,
    isResolved: Boolean,
    resolvedAt: Date
  }],
  maxDistanceAlert: Number (default: 500m)
}
```

### User Model Updates
```javascript
{
  // Existing fields...
  familyId: ObjectId,
  memberId: String,
  currentLocation: GeoJSON Point,
  lastLocationUpdate: Date,
  isSharingLocation: Boolean
}
```

## API Endpoints

### Family Management
- `POST /api/family/create` - Create a new family
- `POST /api/family/join` - Join family with code
- `GET /api/family` - Get current user's family
- `POST /api/family/leave` - Leave family
- `GET /api/family/all` - Get all families (admin only)

### Location Tracking
- `POST /api/family/location/update` - Update member location
- `POST /api/family/location/toggle` - Toggle location sharing

### Trip Management
- `POST /api/family/trip/start` - Start a trip (admin only)

### Lost Member Management
- `POST /api/family/member/lost/report` - Report lost member
- `POST /api/family/member/lost/resolve` - Resolve lost member

## Frontend Components

### FamilyTracker Component
Main component that displays:
- Family information and code
- Create/Join family forms
- Family member list with status
- Location sharing controls
- Lost member reporting
- Navigation to member locations

### FamilyMap Component
Full-screen map view with:
- Mappls map integration
- Current user marker
- Target member marker
- Route display
- Live tracking button
- Distance calculation
- Real-time navigation

### FamilyTrackerPage
Wrapper page with:
- Distance alert system
- Lost member notifications
- Auto-refresh alerts
- Browser notification integration

## How to Use

### For Family Admins:
1. Navigate to `/family-tracker`
2. Click "Create New Family"
3. Enter family name
4. Share the generated 6-character code with family members
5. Start a trip when ready (only admin can do this)
6. Enable location sharing to track family
7. View member locations and navigate to them
8. Report lost members if needed

### For Family Members:
1. Navigate to `/family-tracker`
2. Click "Join Existing Family"
3. Enter the family code provided by admin
4. Enable location sharing
5. View other members' locations
6. Navigate to family members
7. Report if someone is lost

### Navigation to Members:
1. In the family tracker, click the "Navigate" button next to any member
2. Map opens with both locations marked
3. Route is automatically displayed
4. Click "Start Live Tracking" for real-time navigation
5. Route updates automatically as you move

## Security & Privacy
- Only authenticated users can access family features
- Users must be family members to view family data
- Location sharing is opt-in
- Only the user can toggle their own location sharing
- Family codes are unique and secure (6 characters, alphanumeric)
- Admin-only actions are enforced server-side

## Technical Details

### Location Accuracy
- Uses HTML5 Geolocation API
- High accuracy mode enabled
- Coordinates stored as GeoJSON Points
- 2dsphere index on location fields for efficient queries

### Distance Calculation
- Haversine formula for sphere distance
- Accuracy within meters
- Real-time calculations client-side and server-side

### Map Integration
- Mappls Maps SDK v3.0
- Direction plugin for navigation
- Tracking plugin for live updates
- Custom markers and icons
- Route optimization

### Real-time Features
- Location updates every 30 seconds
- Alert checks every 60 seconds
- Browser notifications for critical alerts
- Auto-refresh family data

## Environment Variables
```
VITE_MAPPLS_API_KEY=your_mappls_key
```

## Dependencies
- Mappls Maps SDK (loaded dynamically)
- Mappls Direction Plugin
- React Router for navigation
- Firebase Authentication

## Future Enhancements
1. Trip history and analytics
2. Custom geofence boundaries
3. Emergency SOS button
4. Offline mode support
5. Battery status tracking
6. Route sharing
7. Family chat integration
8. Location history playback

## Troubleshooting

### Location not updating
- Check browser location permissions
- Ensure location sharing is enabled
- Verify GPS/location services on device

### Navigation not working
- Check Mappls API key is valid
- Ensure both users have shared locations
- Verify internet connectivity

### Can't join family
- Verify family code is correct (case-sensitive)
- Check if already in another family
- Ensure family exists

### Alerts not showing
- Enable browser notifications
- Check distance threshold settings
- Verify location sharing is active

## Support
For issues or questions, contact the development team or check the console for error messages.
