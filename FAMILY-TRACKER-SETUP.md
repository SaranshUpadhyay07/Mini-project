# Family Tracker Setup Guide

## Quick Setup Instructions

### 1. Backend Setup (API)

The family tracking routes are already integrated into your API server. Just make sure your MongoDB connection is working.

No additional installation needed - the routes are already added to `api/index.js`.

### 2. Frontend Setup (Client)

The components and pages are already created. The route is accessible at `/family-tracker`.

### 3. Testing the Feature

#### Start the servers:

**Terminal 1 - API Server:**
```bash
cd api
npm install
npm run dev
```

**Terminal 2 - Client:**
```bash
cd client
npm install
npm run dev
```

#### Test Flow:

1. **Create a Family:**
   - Sign in to the app
   - Navigate to `/family-tracker` or click "Family Tracker" in navbar
   - Click "Create New Family"
   - Enter a family name (e.g., "Smith Family")
   - Note the 6-character family code displayed (e.g., "ABC123")

2. **Join a Family (Use another browser/incognito):**
   - Sign in with a different account
   - Navigate to `/family-tracker`
   - Click "Join Existing Family"
   - Enter the family code from step 1
   - You should now see both members

3. **Test Location Sharing:**
   - Click "Start Sharing" button
   - Allow location permissions when prompted
   - Click "Update Now" to manually update location
   - Other family members should see location status

4. **Test Navigation:**
   - From one member's view, click "Navigate" next to another member
   - Map should open showing both locations
   - Click "Start Live Tracking" for real-time navigation

5. **Test Lost Member Alert:**
   - Click the 🚨 button next to a member
   - Confirm the alert
   - All family members should be notified

## Required Environment Variables

Make sure you have in `client/.env`:
```
VITE_MAPPLS_API_KEY=your_mappls_api_key_here
```

And in `api/.env`:
```
MONGO_URI=your_mongodb_connection_string
FIREBASE_SERVICE_ACCOUNT_PATH=./config/pilgrim-itinerary-odisha-firebase-adminsdk-fbsvc-c490868502.json
```

## Database Collections

The feature uses these MongoDB collections:
- `families` - Family data with members and settings
- `users` - Updated with familyId, memberId, and location fields
- `livelocations` - Real-time location tracking
- `counters` - Auto-incrementing family IDs
- `trips` - Trip management (existing)

## Feature Access

After setup, access the feature at:
```
http://localhost:5173/family-tracker
```

Or click "Family Tracker" in the navigation menu.

## Permission Requirements

The feature requires:
1. **Browser Location Permission**: For GPS tracking
2. **Notification Permission**: For alerts (optional but recommended)

## Troubleshooting

### Issue: "You are already part of a family"
**Solution:** Leave your current family first, or use the existing family.

### Issue: Location not updating
**Solution:** 
- Check browser permissions
- Enable location sharing
- Try manual update button

### Issue: Navigation not working
**Solution:**
- Verify VITE_MAPPLS_API_KEY is set correctly
- Check console for Mappls SDK errors
- Ensure both users have shared locations

### Issue: Can't see family members
**Solution:**
- Both users must be logged in
- Verify family code was entered correctly
- Check API server is running

## Next Steps

1. Test with multiple users
2. Test distance alerts by moving far apart
3. Test lost member reporting
4. Test admin trip creation (only family admin can start trips)
5. Test app admin view (user with role: "admin" can see all families)

## Admin Features

To test app admin features:
1. Set a user's role to "admin" in MongoDB:
   ```javascript
   db.users.updateOne(
     { email: "admin@example.com" },
     { $set: { role: "admin" } }
   )
   ```
2. Login as that user
3. Access `/family-tracker`
4. The "All Families" endpoint will show all families in the system

## API Testing with Postman/Thunder Client

Test endpoints:
```
POST http://localhost:5000/api/family/create
Headers: Authorization: Bearer YOUR_FIREBASE_TOKEN
Body: { "familyName": "Test Family" }

POST http://localhost:5000/api/family/join
Headers: Authorization: Bearer YOUR_FIREBASE_TOKEN
Body: { "familyCode": "ABC123" }

GET http://localhost:5000/api/family
Headers: Authorization: Bearer YOUR_FIREBASE_TOKEN

POST http://localhost:5000/api/family/location/update
Headers: Authorization: Bearer YOUR_FIREBASE_TOKEN
Body: { "latitude": 20.2961, "longitude": 85.8245, "accuracy": 10 }
```

## Production Deployment Notes

Before deploying to production:
1. Set appropriate maxDistanceAlert values per family needs
2. Configure notification preferences
3. Set up proper error logging
4. Add rate limiting to location update endpoints
5. Consider battery optimization for location updates
6. Test with real GPS devices (phones/tablets)

## Support

Check the main documentation at `FAMILY-TRACKER-DOCUMENTATION.md` for detailed feature information.
