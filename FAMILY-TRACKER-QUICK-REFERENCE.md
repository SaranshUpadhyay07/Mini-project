# Family Tracker - Quick Reference Card

## 🎯 Core Features Checklist

- [x] Auto-incrementing Family IDs (starting from 1000)
- [x] 6-character unique family codes
- [x] Member IDs in format: familyId.memberIndex (1000.1, 1000.2)
- [x] One family per user enforcement
- [x] Admin-only trip creation
- [x] All members can edit during trips
- [x] Real-time location tracking (lat/lng storage)
- [x] App admin view of all families
- [x] Lost member reporting & alerts
- [x] Distance-based alerts (configurable)
- [x] Navigation to family members
- [x] Mappls integration with live tracking

## 📋 Quick Commands

### Database Migration
```bash
cd api
node migrate-family-tracker.js
```

### Start Development
```bash
# Terminal 1 - API
cd api && npm run dev

# Terminal 2 - Client
cd client && npm run dev
```

### Access Feature
```
URL: http://localhost:5173/family-tracker
Navbar: Click "Family Tracker"
```

## 🔑 Key Data Structures

### Family Object
```javascript
{
  familyId: 1000,
  familyCode: "ABC123",
  familyName: "Smith Family",
  members: [
    { userId: "...", memberId: "1000.1", role: "admin" },
    { userId: "...", memberId: "1000.2", role: "member" }
  ]
}
```

### Member Location
```javascript
{
  currentLocation: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  lastLocationUpdate: Date
}
```

## 🚦 User Flow

### Create Family
1. Login → `/family-tracker`
2. Click "Create New Family"
3. Enter family name
4. **Save the 6-digit code!**

### Join Family
1. Login → `/family-tracker`
2. Click "Join Existing Family"
3. Enter 6-digit code
4. Confirm join

### Track Members
1. Enable "Start Sharing"
2. Allow location permission
3. View member list
4. Click "Navigate" to track

### Report Lost
1. Click 🚨 next to member
2. Confirm report
3. All members notified

## 📡 API Quick Test

```bash
# Create family
curl -X POST http://localhost:5000/api/family/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"familyName": "Test Family"}'

# Update location
curl -X POST http://localhost:5000/api/family/location/update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 20.2961, "longitude": 85.8245, "accuracy": 10}'
```

## 🎨 UI Components

| Component | Path | Purpose |
|-----------|------|---------|
| FamilyTracker | `/components/FamilyTracker.jsx` | Main family view |
| FamilyMap | `/components/FamilyMap.jsx` | Navigation map |
| FamilyTrackerPage | `/pages/FamilyTrackerPage.jsx` | Page with alerts |

## 🔒 Permissions Needed

- ✅ Location Access (GPS)
- ✅ Notifications (optional)

## ⚡ Key Features

| Feature | Implementation |
|---------|----------------|
| Family ID | Auto-increment from 1000 |
| Join Code | 6-char alphanumeric |
| Member ID | {familyId}.{index} |
| Distance Alert | Default 500m threshold |
| Location Update | Every 30 seconds |
| Alert Check | Every 60 seconds |

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| Location not updating | Check browser permissions |
| Can't join family | Verify code & user not in family |
| Map not loading | Check MAPPLS_API_KEY |
| No navigation | Both users must share location |

## 📊 Database Collections

- `families` - Family data
- `users` - Updated with location fields
- `livelocations` - Real-time tracking
- `counters` - Family ID auto-increment
- `trips` - Trip management

## 🎯 Testing Checklist

- [ ] Create family (get code)
- [ ] Join family (use code)
- [ ] Enable location sharing
- [ ] View member locations
- [ ] Navigate to member
- [ ] Start live tracking
- [ ] Report lost member
- [ ] Check distance alerts
- [ ] Admin start trip
- [ ] Leave family

## 📞 API Endpoints Summary

```
POST   /api/family/create               → Create family
POST   /api/family/join                 → Join with code
GET    /api/family                      → Get my family
POST   /api/family/location/update      → Update GPS
POST   /api/family/location/toggle      → Share on/off
POST   /api/family/member/lost/report   → Report lost
```

## 🎓 Example Member IDs

```
Family ID: 1000
├─ Admin:   1000.1 (Alice)
├─ Member:  1000.2 (Bob)
├─ Member:  1000.3 (Charlie)
└─ Member:  1000.4 (Diana)

Family ID: 1001
├─ Admin:   1001.1 (Eve)
└─ Member:  1001.2 (Frank)
```

## ⚙️ Configuration

```javascript
// Adjust in family.model.js
maxDistanceAlert: 500  // meters

// Adjust in FamilyTracker.jsx
const locationInterval = 30000  // ms

// Adjust in FamilyTrackerPage.jsx
const alertInterval = 60000  // ms
```

## 🌟 Pro Tips

1. **Battery**: Disable location sharing when not on trip
2. **Accuracy**: Allow high accuracy GPS in browser
3. **Notifications**: Enable for critical lost alerts
4. **Family Code**: Screenshot and share in family chat
5. **Testing**: Use multiple browsers/devices

---

**All features implemented ✅**
**Ready for testing and deployment 🚀**
