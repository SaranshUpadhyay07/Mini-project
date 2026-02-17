# Family Tracker - Test Scenarios

## Test Plan for Family Tracking Feature

### Prerequisites
- API server running on `http://localhost:5000`
- Client app running on `http://localhost:5173`
- MongoDB connection active
- At least 2 user accounts (for multi-user tests)
- Location permissions enabled in browser

---

## Test Suite 1: Family Creation & Joining

### Test 1.1: Create Family Successfully
**Steps:**
1. Login as User A
2. Navigate to `/family-tracker`
3. Click "Create New Family"
4. Enter family name: "Test Family 1"
5. Click "Create"

**Expected:**
- ✅ Success message displayed
- ✅ 6-character family code shown (e.g., "ABC123")
- ✅ Family view displayed
- ✅ User A shown as Admin with memberId format 1000.1
- ✅ Family ID should be ≥ 1000

**Database Check:**
```javascript
db.families.findOne({ familyCode: "ABC123" })
// Should have: familyId, familyCode, adminUserId, members[0]
```

---

### Test 1.2: Join Family with Valid Code
**Steps:**
1. Login as User B (different browser/incognito)
2. Navigate to `/family-tracker`
3. Click "Join Existing Family"
4. Enter family code from Test 1.1
5. Click "Join"

**Expected:**
- ✅ Success message
- ✅ Family view displayed
- ✅ User B shown as Member with memberId format 1000.2
- ✅ Both User A and User B visible in member list

---

### Test 1.3: Cannot Join Family When Already in One
**Steps:**
1. While logged in as User B (already in a family)
2. Try to join another family

**Expected:**
- ❌ Error: "You are already part of a family"
- ✅ Prompt to leave current family

---

### Test 1.4: Invalid Family Code
**Steps:**
1. Login as User C
2. Try to join with code "INVALID"

**Expected:**
- ❌ Error: "Invalid family code"

---

## Test Suite 2: Location Tracking

### Test 2.1: Enable Location Sharing
**Steps:**
1. Login as User A
2. In family tracker, click "Start Sharing"
3. Allow location permission when prompted

**Expected:**
- ✅ Button changes to "Sharing Location"
- ✅ Green indicator on user's member card
- ✅ Location update timestamp displayed

**Database Check:**
```javascript
db.users.findOne({ email: "userA@example.com" })
// isSharingLocation: true
// currentLocation: { type: "Point", coordinates: [lng, lat] }
```

---

### Test 2.2: Manual Location Update
**Steps:**
1. With location sharing enabled
2. Click "Update Now"

**Expected:**
- ✅ Timestamp updates
- ✅ New coordinates stored in database
- ✅ Other family members see updated timestamp

---

### Test 2.3: Location Sharing Toggle
**Steps:**
1. Click "Start Sharing" (if not sharing)
2. Wait 5 seconds
3. Click "Sharing Location" to disable

**Expected:**
- ✅ Button changes back to "Start Sharing"
- ✅ Location icon shows "Not sharing"
- ✅ No automatic updates

---

### Test 2.4: Automatic Location Updates
**Steps:**
1. Enable location sharing
2. Wait 30 seconds
3. Check timestamp

**Expected:**
- ✅ Timestamp updates automatically
- ✅ Location refreshes every 30 seconds

---

## Test Suite 3: Navigation

### Test 3.1: View Member on Map
**Steps:**
1. Login as User A
2. Ensure User B is sharing location
3. Click "Navigate" button next to User B

**Expected:**
- ✅ Full-screen map opens
- ✅ Both user markers visible (different colors/icons)
- ✅ Route displayed between markers
- ✅ Distance shown in meters
- ✅ Header shows "Navigate to [User B Name]"

---

### Test 3.2: Live Tracking
**Steps:**
1. Open navigation to User B
2. Click "Start Live Tracking"
3. Move your device (or simulate location change)

**Expected:**
- ✅ Button shows "Tracking Active"
- ✅ Route updates as position changes
- ✅ Distance recalculates
- ✅ Blue dot moves on map

---

### Test 3.3: Navigate Without Location Permission
**Steps:**
1. Block location permission in browser
2. Try to navigate to a member

**Expected:**
- ❌ Error message about geolocation
- ✅ Helpful message to enable permissions

---

### Test 3.4: Navigate to Member Not Sharing
**Steps:**
1. User B disables location sharing
2. User A tries to navigate to User B

**Expected:**
- ❌ "Navigate" button disabled or shows error
- ✅ Message: "Member not sharing location"

---

## Test Suite 4: Distance Alerts

### Test 4.1: Distance Alert Trigger
**Setup:** User A and User B in same family, both sharing location

**Steps:**
1. Simulate location: Move User B > 500m from User A
   (Can use browser dev tools to override geolocation)
2. Wait 60 seconds for alert check

**Expected:**
- ✅ Orange alert popup appears
- ✅ Message: "You are XXm away from family head"
- ✅ Browser notification (if permitted)
- ✅ Alert dismissible

---

### Test 4.2: Custom Distance Threshold
**Steps:**
1. Modify family.maxDistanceAlert in database to 100m
2. Move member 150m away
3. Wait for alert check

**Expected:**
- ✅ Alert triggers at new threshold

**Database:**
```javascript
db.families.updateOne(
  { familyCode: "ABC123" },
  { $set: { maxDistanceAlert: 100 } }
)
```

---

## Test Suite 5: Lost Member System

### Test 5.1: Report Member as Lost
**Steps:**
1. Login as User A
2. Click 🚨 button next to User B
3. Confirm in dialog

**Expected:**
- ✅ Success message
- ✅ Red alert appears for all family members
- ✅ Lost member count shown
- ✅ Last known location stored

**Database Check:**
```javascript
db.families.findOne({ familyCode: "ABC123" })
// lostMembers array should have 1 entry
// lostMembers[0].userId = User B's ID
// lostMembers[0].isResolved = false
```

---

### Test 5.2: Lost Member Notifications
**Steps:**
1. User A reports User B as lost
2. Check User C's view (also in family)

**Expected:**
- ✅ Red alert visible to User C
- ✅ Browser notification received
- ✅ Lost member details shown

---

### Test 5.3: Resolve Lost Member
**Steps:**
1. Make API call to resolve lost member
   ```
   POST /api/family/member/lost/resolve
   Body: { lostMemberId: "<lostMemberObjectId>" }
   ```

**Expected:**
- ✅ isResolved = true
- ✅ resolvedAt timestamp set
- ✅ Alert removed from UI

---

## Test Suite 6: Trip Management

### Test 6.1: Admin Start Trip
**Steps:**
1. Login as User A (admin)
2. Make API call or add UI button:
   ```
   POST /api/family/trip/start
   Body: {
     title: "Temple Visit",
     location: "Puri",
     startDate: "2026-02-20",
     endDate: "2026-02-22"
   }
   ```

**Expected:**
- ✅ Trip created
- ✅ family.activeTripId set
- ✅ "Active Trip" indicator shown

---

### Test 6.2: Non-Admin Cannot Start Trip
**Steps:**
1. Login as User B (not admin)
2. Try to start trip

**Expected:**
- ❌ Error: "Only family admin can start a trip"
- ✅ 403 Forbidden status

---

### Test 6.3: Members Edit During Trip
**Steps:**
1. Admin starts trip
2. Non-admin member views trip
3. Non-admin adds to itinerary

**Expected:**
- ✅ All members can edit trip details
- ✅ Changes saved

---

## Test Suite 7: Admin Features

### Test 7.1: App Admin View All Families
**Steps:**
1. Set user role to "admin" in database:
   ```javascript
   db.users.updateOne(
     { email: "admin@example.com" },
     { $set: { role: "admin" } }
   )
   ```
2. Login as admin user
3. Make request to:
   ```
   GET /api/family/all
   ```

**Expected:**
- ✅ Returns all families in system
- ✅ Shows member count per family
- ✅ Shows admin location
- ✅ Does not expose family codes

---

### Test 7.2: Regular User Cannot Access Admin View
**Steps:**
1. Login as regular user (role: "user")
2. Try:
   ```
   GET /api/family/all
   ```

**Expected:**
- ❌ Error: "Access denied. Admin only."
- ✅ 403 Forbidden status

---

## Test Suite 8: Edge Cases

### Test 8.1: Leave Family
**Steps:**
1. Login as User B (non-admin member)
2. Make request:
   ```
   POST /api/family/leave
   ```

**Expected:**
- ✅ User removed from family.members
- ✅ User.familyId = null
- ✅ User.memberId = null
- ✅ Can join another family

---

### Test 8.2: Admin Cannot Leave
**Steps:**
1. Login as User A (admin)
2. Try to leave family

**Expected:**
- ❌ Error: "Admin cannot leave family"
- ✅ Suggestion to transfer admin or delete family

---

### Test 8.3: Multiple Families
**Steps:**
1. Create Family 1 (familyId: 1000)
2. Create Family 2 (familyId: 1001)
3. Verify IDs auto-increment

**Expected:**
- ✅ Family 1: familyId = 1000, members with 1000.x format
- ✅ Family 2: familyId = 1001, members with 1001.x format
- ✅ Unique family codes

---

### Test 8.4: Member ID Consistency
**Steps:**
1. Family 1000 has 3 members
2. Member 2 (1000.2) leaves
3. New member joins

**Expected:**
- ✅ New member gets 1000.4 (not 1000.2)
- ✅ Member IDs never reused

---

### Test 8.5: Concurrent Location Updates
**Steps:**
1. Multiple members update location simultaneously
2. Make 5 rapid location updates

**Expected:**
- ✅ All updates processed
- ✅ No race conditions
- ✅ Latest location stored

---

## Test Suite 9: Performance

### Test 9.1: Large Family
**Steps:**
1. Add 20 members to one family
2. All members enable location sharing
3. View family tracker page

**Expected:**
- ✅ Page loads in < 2 seconds
- ✅ All members displayed
- ✅ No UI lag

---

### Test 9.2: Multiple Active Trips
**Steps:**
1. Start 5 trips for different families
2. Query active trips

**Expected:**
- ✅ All trips returned correctly
- ✅ Query performance acceptable

---

## Test Suite 10: Security

### Test 10.1: Unauthenticated Access
**Steps:**
1. Logout
2. Try to access `/family-tracker`

**Expected:**
- ✅ Redirected to `/signin`
- ✅ Cannot access family data

---

### Test 10.2: Cannot Access Other Family Data
**Steps:**
1. User A in Family 1000
2. Try to get Family 1001 data

**Expected:**
- ❌ Only own family data returned
- ✅ 403 or 404 error for other families

---

### Test 10.3: Token Validation
**Steps:**
1. Make API request with invalid/expired token

**Expected:**
- ❌ 401 Unauthorized
- ✅ Error message about authentication

---

## Test Automation Template

```javascript
// Example Jest test
describe('Family Tracker', () => {
  test('should create family with auto-increment ID', async () => {
    const response = await request(app)
      .post('/api/family/create')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ familyName: 'Test Family' });
    
    expect(response.status).toBe(201);
    expect(response.body.data.family.familyId).toBeGreaterThanOrEqual(1000);
    expect(response.body.data.familyCode).toHaveLength(6);
  });
  
  test('should prevent joining multiple families', async () => {
    // User already in family
    const response = await request(app)
      .post('/api/family/join')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ familyCode: 'ABC123' });
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already part of a family');
  });
});
```

---

## Manual Testing Checklist

- [ ] Family creation with auto-ID
- [ ] Family code generation (6 chars)
- [ ] Member ID format (familyId.index)
- [ ] Join family with code
- [ ] One family per user enforcement
- [ ] Enable/disable location sharing
- [ ] Auto location updates (30s)
- [ ] Manual location update
- [ ] Navigate to member (map view)
- [ ] Live tracking toggle
- [ ] Route display
- [ ] Distance calculation
- [ ] Distance alerts (>500m)
- [ ] Report lost member
- [ ] Lost member notifications
- [ ] Admin start trip
- [ ] Non-admin cannot start trip
- [ ] App admin view all families
- [ ] Leave family (non-admin)
- [ ] Admin cannot leave
- [ ] Browser notifications

---

## Bug Report Template

```
Bug Title: [Short description]

Steps to Reproduce:
1. 
2. 
3. 

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happens]

Environment:
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- User Role: [admin/member]
- Family ID: [1000]

Screenshots:
[If applicable]

Console Errors:
[Copy from browser console]

Database State:
[Relevant data from MongoDB]
```

---

## Test Results Summary

After running all tests, fill in:

```
Total Tests: [ ]
Passed: [ ] ✅
Failed: [ ] ❌
Skipped: [ ] ⚠️

Critical Issues: [ ]
Minor Issues: [ ]
Enhancements Suggested: [ ]

Overall Status: [ PASS / FAIL ]

Notes:
- 
- 
```

---

**Happy Testing! 🧪**
