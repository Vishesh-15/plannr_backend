# Emergent Auth Testing Playbook

## Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  profile_type: null,
  theme: 'system',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```
curl -X GET "$API_URL/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X PATCH "$API_URL/api/user/profile" -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_SESSION_TOKEN" -d '{"profile_type":"student"}'
```

## Step 3: Browser Testing
Set cookie `session_token` with value YOUR_SESSION_TOKEN, domain set to preview host, path `/`, httpOnly, secure, sameSite None.

## Checklist
- User has user_id (custom UUID). MongoDB _id is separate.
- Session.user_id matches user.user_id
- All queries use `{"_id": 0}` projection
- `/api/auth/me` returns user
- Dashboard renders without redirect
