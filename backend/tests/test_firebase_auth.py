"""
Smart Schedule Planner - Firebase Auth Tests (Iteration 3)
Tests for Firebase Google Authentication migration:
- Firebase ID token verification
- User upsert by firebase_uid
- Legacy email-match migration
- Removed endpoints (session, logout)
- All CRUD routes with Firebase Bearer token
- User isolation
- No MongoDB _id in responses
"""
import pytest
import requests
import os
import firebase_admin
from firebase_admin import credentials, auth as fb_auth
from datetime import datetime, timedelta
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_KEY = 'AIzaSyDiEygXj9X-DWauVLIvA-Dw9A_saY9zTG4'

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    cred = credentials.Certificate('/app/backend/firebase-admin.json')
    firebase_admin.initialize_app(cred)


def get_firebase_id_token(uid: str, email: str = None, name: str = None) -> str:
    """Generate a Firebase ID token for testing by creating custom token and exchanging it"""
    # Create or get user in Firebase Auth
    try:
        fb_auth.get_user(uid)
    except fb_auth.UserNotFoundError:
        fb_auth.create_user(
            uid=uid,
            email=email or f"{uid}@planmate.local",
            display_name=name or f"Test User {uid}"
        )
    
    # Create custom token
    custom_token = fb_auth.create_custom_token(uid)
    
    # Exchange for ID token
    exchange_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}"
    response = requests.post(exchange_url, json={
        "token": custom_token.decode(),
        "returnSecureToken": True
    })
    
    if response.status_code != 200:
        raise Exception(f"Failed to exchange token: {response.text}")
    
    return response.json()['idToken']


@pytest.fixture(scope="module")
def token_user_1():
    """Firebase ID token for test user 1"""
    return get_firebase_id_token('test-uid-001', 'test1@planmate.local', 'Test User One')


@pytest.fixture(scope="module")
def token_user_2():
    """Firebase ID token for test user 2 (for isolation tests)"""
    return get_firebase_id_token('test-uid-002', 'test2@planmate.local', 'Test User Two')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_client_1(api_client, token_user_1):
    """Session with User 1 Firebase auth"""
    api_client.headers.update({"Authorization": f"Bearer {token_user_1}"})
    return api_client


@pytest.fixture
def auth_client_2(api_client, token_user_2):
    """Session with User 2 Firebase auth"""
    api_client.headers.update({"Authorization": f"Bearer {token_user_2}"})
    return api_client


# ==================== ROOT ENDPOINT ====================
class TestRootEndpoint:
    """Test GET /api/ returns hello message (public)"""
    
    def test_root_returns_200_with_message(self, api_client):
        """GET /api/ returns 200 with message"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Smart Schedule Planner" in data["message"]


# ==================== AUTH ENDPOINTS ====================
class TestAuthEndpoints:
    """Test Firebase authentication endpoints"""
    
    def test_auth_me_without_token_returns_401(self, api_client):
        """GET /api/auth/me without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        data = response.json()
        assert "Missing bearer token" in data.get("detail", "")
    
    def test_auth_me_with_garbage_token_returns_401(self, api_client):
        """GET /api/auth/me with garbage Bearer token returns 401"""
        api_client.headers.update({"Authorization": "Bearer garbage_token_12345"})
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        data = response.json()
        assert "Invalid token" in data.get("detail", "")
    
    def test_auth_me_with_valid_token_returns_user(self, auth_client_1):
        """GET /api/auth/me with valid Firebase ID token returns 200 with user fields"""
        response = auth_client_1.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "user_id" in data
        assert "firebase_uid" in data
        assert "email" in data
        assert "name" in data
        assert "profile_type" in data
        assert "theme" in data
        assert "created_at" in data
        
        # Verify values
        assert data["firebase_uid"] == "test-uid-001"
        assert data["email"] == "test1@planmate.local"
        assert data["name"] == "Test User One"
        
        # Verify _id is excluded
        assert "_id" not in data
    
    def test_first_time_token_creates_user(self):
        """First-time valid token creates MongoDB user with firebase_uid"""
        # Create a brand new Firebase user
        new_uid = f"test-uid-new-{int(time.time())}"
        token = get_firebase_id_token(new_uid, f"{new_uid}@planmate.local", "New Test User")
        
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        
        # First call should create user
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        
        assert data["firebase_uid"] == new_uid
        assert "user_id" in data
        first_user_id = data["user_id"]
        
        # Second call should return same user_id (no duplicate)
        response2 = session.get(f"{BASE_URL}/api/auth/me")
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["user_id"] == first_user_id
    
    def test_removed_endpoint_session_returns_404(self, api_client):
        """POST /api/auth/session should not exist anymore (404)"""
        response = api_client.post(f"{BASE_URL}/api/auth/session", json={"session_id": "test"})
        assert response.status_code == 404
    
    def test_removed_endpoint_logout_returns_404(self, api_client):
        """POST /api/auth/logout should not exist anymore (404)"""
        response = api_client.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 404


# ==================== USER PROFILE ====================
class TestUserProfile:
    """Test user profile update with Firebase auth"""
    
    def test_update_profile_type(self, auth_client_1):
        """PATCH /api/user/profile with valid token updates profile_type"""
        response = auth_client_1.patch(f"{BASE_URL}/api/user/profile", json={
            "profile_type": "student"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["profile_type"] == "student"
        assert "_id" not in data
    
    def test_update_theme(self, auth_client_1):
        """PATCH /api/user/profile with valid token updates theme"""
        response = auth_client_1.patch(f"{BASE_URL}/api/user/profile", json={
            "theme": "dark"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "dark"
        
        # Reset
        auth_client_1.patch(f"{BASE_URL}/api/user/profile", json={"theme": "system"})


# ==================== TASKS CRUD WITH FIREBASE AUTH ====================
class TestTasksCRUD:
    """Test Task CRUD operations with Firebase Bearer token"""
    
    def test_create_task_success(self, auth_client_1):
        """POST /api/tasks creates task with Firebase auth"""
        # Ensure profile is set
        auth_client_1.patch(f"{BASE_URL}/api/user/profile", json={"profile_type": "student"})
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = auth_client_1.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Firebase_Task",
            "description": "Task created with Firebase auth",
            "date": today,
            "priority": "high"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Firebase_Task"
        assert "task_id" in data
        assert "_id" not in data
    
    def test_list_tasks(self, auth_client_1):
        """GET /api/tasks returns list with Firebase auth"""
        response = auth_client_1.get(f"{BASE_URL}/api/tasks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for task in data:
            assert "_id" not in task
    
    def test_update_task(self, auth_client_1):
        """PATCH /api/tasks/{id} updates task with Firebase auth"""
        # Create task
        today = datetime.now().strftime("%Y-%m-%d")
        create_resp = auth_client_1.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Task_To_Update",
            "date": today
        })
        task_id = create_resp.json()["task_id"]
        
        # Update
        response = auth_client_1.patch(f"{BASE_URL}/api/tasks/{task_id}", json={
            "title": "TEST_Updated_Task",
            "status": "done"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Updated_Task"
        assert data["status"] == "done"
    
    def test_delete_task(self, auth_client_1):
        """DELETE /api/tasks/{id} removes task with Firebase auth"""
        # Create task
        today = datetime.now().strftime("%Y-%m-%d")
        create_resp = auth_client_1.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Task_To_Delete",
            "date": today
        })
        task_id = create_resp.json()["task_id"]
        
        # Delete
        response = auth_client_1.delete(f"{BASE_URL}/api/tasks/{task_id}")
        assert response.status_code == 200


# ==================== USER ISOLATION ====================
class TestUserIsolation:
    """Test that user A's data is not visible to user B"""
    
    def test_task_isolation(self, token_user_1, token_user_2):
        """Tasks created by user 1 not visible to user 2"""
        session_1 = requests.Session()
        session_1.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token_user_1}"
        })
        
        session_2 = requests.Session()
        session_2.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token_user_2}"
        })
        
        # Ensure user 1 has profile set
        session_1.patch(f"{BASE_URL}/api/user/profile", json={"profile_type": "student"})
        
        # User 1 creates a task
        today = datetime.now().strftime("%Y-%m-%d")
        create_resp = session_1.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Private_Task_User1",
            "date": today
        })
        assert create_resp.status_code == 200
        task_id = create_resp.json()["task_id"]
        
        # User 2 should not see it
        list_resp = session_2.get(f"{BASE_URL}/api/tasks")
        assert list_resp.status_code == 200
        tasks = list_resp.json()
        assert not any(t["task_id"] == task_id for t in tasks)


# ==================== SUBJECTS CRUD ====================
class TestSubjectsCRUD:
    """Test Subject CRUD with Firebase auth"""
    
    def test_create_subject(self, auth_client_1):
        """POST /api/subjects creates subject"""
        response = auth_client_1.post(f"{BASE_URL}/api/subjects", json={
            "name": "TEST_Firebase_Subject",
            "color": "#10B981"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Firebase_Subject"
        assert "subject_id" in data
        assert "_id" not in data
    
    def test_list_subjects(self, auth_client_1):
        """GET /api/subjects returns list"""
        response = auth_client_1.get(f"{BASE_URL}/api/subjects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for subject in data:
            assert "_id" not in subject
    
    def test_delete_subject(self, auth_client_1):
        """DELETE /api/subjects/{id} removes subject"""
        create_resp = auth_client_1.post(f"{BASE_URL}/api/subjects", json={
            "name": "TEST_Subject_To_Delete"
        })
        subject_id = create_resp.json()["subject_id"]
        
        response = auth_client_1.delete(f"{BASE_URL}/api/subjects/{subject_id}")
        assert response.status_code == 200


# ==================== EXAMS CRUD ====================
class TestExamsCRUD:
    """Test Exam CRUD with Firebase auth"""
    
    def test_create_exam(self, auth_client_1):
        """POST /api/exams creates exam"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        response = auth_client_1.post(f"{BASE_URL}/api/exams", json={
            "name": "TEST_Firebase_Exam",
            "date": future_date,
            "subject_ids": []
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Firebase_Exam"
        assert "exam_id" in data
        assert "_id" not in data
    
    def test_list_exams(self, auth_client_1):
        """GET /api/exams returns list"""
        response = auth_client_1.get(f"{BASE_URL}/api/exams")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_exam(self, auth_client_1):
        """DELETE /api/exams/{id} removes exam"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        create_resp = auth_client_1.post(f"{BASE_URL}/api/exams", json={
            "name": "TEST_Exam_To_Delete",
            "date": future_date
        })
        exam_id = create_resp.json()["exam_id"]
        
        response = auth_client_1.delete(f"{BASE_URL}/api/exams/{exam_id}")
        assert response.status_code == 200


# ==================== CLIENTS CRUD ====================
class TestClientsCRUD:
    """Test Client CRUD with Firebase auth"""
    
    def test_create_client(self, auth_client_1):
        """POST /api/clients creates client"""
        response = auth_client_1.post(f"{BASE_URL}/api/clients", json={
            "name": "TEST_Firebase_Client",
            "company": "Test Corp"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Firebase_Client"
        assert "client_id" in data
        assert "_id" not in data
    
    def test_list_clients(self, auth_client_1):
        """GET /api/clients returns list"""
        response = auth_client_1.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_client(self, auth_client_1):
        """DELETE /api/clients/{id} removes client"""
        create_resp = auth_client_1.post(f"{BASE_URL}/api/clients", json={
            "name": "TEST_Client_To_Delete"
        })
        client_id = create_resp.json()["client_id"]
        
        response = auth_client_1.delete(f"{BASE_URL}/api/clients/{client_id}")
        assert response.status_code == 200


# ==================== TIME LOGS CRUD ====================
class TestTimeLogsCRUD:
    """Test Time Log CRUD with Firebase auth"""
    
    def test_create_time_log(self, auth_client_1):
        """POST /api/time-logs creates time log"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = auth_client_1.post(f"{BASE_URL}/api/time-logs", json={
            "description": "TEST_Firebase_TimeLog",
            "date": today,
            "minutes": 60
        })
        assert response.status_code == 200
        data = response.json()
        assert data["minutes"] == 60
        assert "log_id" in data
        assert "_id" not in data
    
    def test_list_time_logs(self, auth_client_1):
        """GET /api/time-logs returns list"""
        response = auth_client_1.get(f"{BASE_URL}/api/time-logs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_time_log(self, auth_client_1):
        """DELETE /api/time-logs/{id} removes log"""
        today = datetime.now().strftime("%Y-%m-%d")
        create_resp = auth_client_1.post(f"{BASE_URL}/api/time-logs", json={
            "description": "TEST_Log_To_Delete",
            "date": today,
            "minutes": 30
        })
        log_id = create_resp.json()["log_id"]
        
        response = auth_client_1.delete(f"{BASE_URL}/api/time-logs/{log_id}")
        assert response.status_code == 200


# ==================== PAYMENTS CRUD ====================
class TestPaymentsCRUD:
    """Test Payment CRUD with Firebase auth"""
    
    def test_create_payment(self, auth_client_1):
        """POST /api/payments creates payment"""
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        response = auth_client_1.post(f"{BASE_URL}/api/payments", json={
            "title": "TEST_Firebase_Payment",
            "amount": 1000.00,
            "due_date": due_date
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Firebase_Payment"
        assert "payment_id" in data
        assert "_id" not in data
    
    def test_list_payments(self, auth_client_1):
        """GET /api/payments returns list"""
        response = auth_client_1.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_payment(self, auth_client_1):
        """PATCH /api/payments/{id} updates payment"""
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        create_resp = auth_client_1.post(f"{BASE_URL}/api/payments", json={
            "title": "TEST_Payment_To_Update",
            "amount": 500.00,
            "due_date": due_date
        })
        payment_id = create_resp.json()["payment_id"]
        
        response = auth_client_1.patch(f"{BASE_URL}/api/payments/{payment_id}", json={
            "status": "received"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "received"
    
    def test_delete_payment(self, auth_client_1):
        """DELETE /api/payments/{id} removes payment"""
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        create_resp = auth_client_1.post(f"{BASE_URL}/api/payments", json={
            "title": "TEST_Payment_To_Delete",
            "amount": 100.00,
            "due_date": due_date
        })
        payment_id = create_resp.json()["payment_id"]
        
        response = auth_client_1.delete(f"{BASE_URL}/api/payments/{payment_id}")
        assert response.status_code == 200


# ==================== IDEAS CRUD ====================
class TestIdeasCRUD:
    """Test Idea CRUD with Firebase auth"""
    
    def test_create_idea(self, auth_client_1):
        """POST /api/ideas creates idea"""
        response = auth_client_1.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Firebase_Idea",
            "notes": "Test idea with Firebase auth"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Firebase_Idea"
        assert "idea_id" in data
        assert "_id" not in data
    
    def test_list_ideas(self, auth_client_1):
        """GET /api/ideas returns list"""
        response = auth_client_1.get(f"{BASE_URL}/api/ideas")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_idea(self, auth_client_1):
        """PATCH /api/ideas/{id} updates idea"""
        create_resp = auth_client_1.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Idea_To_Update"
        })
        idea_id = create_resp.json()["idea_id"]
        
        response = auth_client_1.patch(f"{BASE_URL}/api/ideas/{idea_id}", json={
            "status": "planned"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "planned"
    
    def test_delete_idea(self, auth_client_1):
        """DELETE /api/ideas/{id} removes idea"""
        create_resp = auth_client_1.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Idea_To_Delete"
        })
        idea_id = create_resp.json()["idea_id"]
        
        response = auth_client_1.delete(f"{BASE_URL}/api/ideas/{idea_id}")
        assert response.status_code == 200


# ==================== PLATFORMS CRUD ====================
class TestPlatformsCRUD:
    """Test Platform CRUD with Firebase auth"""
    
    def test_create_platform(self, auth_client_1):
        """POST /api/platforms creates platform"""
        response = auth_client_1.post(f"{BASE_URL}/api/platforms", json={
            "name": "TEST_Firebase_Platform",
            "color": "#FF0000"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Firebase_Platform"
        assert "platform_id" in data
        assert "_id" not in data
    
    def test_list_platforms(self, auth_client_1):
        """GET /api/platforms returns list"""
        response = auth_client_1.get(f"{BASE_URL}/api/platforms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_platform(self, auth_client_1):
        """DELETE /api/platforms/{id} removes platform"""
        create_resp = auth_client_1.post(f"{BASE_URL}/api/platforms", json={
            "name": "TEST_Platform_To_Delete"
        })
        platform_id = create_resp.json()["platform_id"]
        
        response = auth_client_1.delete(f"{BASE_URL}/api/platforms/{platform_id}")
        assert response.status_code == 200


# ==================== DASHBOARD STATS ====================
class TestDashboardStats:
    """Test dashboard stats with Firebase auth"""
    
    def test_get_stats(self, auth_client_1):
        """GET /api/dashboard/stats returns stats object"""
        response = auth_client_1.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "done" in data
        assert "today" in data
        assert "pending" in data


# ==================== LEGACY EMAIL MIGRATION ====================
class TestLegacyEmailMigration:
    """Test that legacy users (email match, no firebase_uid) get linked"""
    
    def test_legacy_email_match_links_firebase_uid(self):
        """Legacy user with matching email but no firebase_uid gets linked"""
        import subprocess
        
        # Create a legacy user in MongoDB without firebase_uid
        legacy_email = f"legacy_{int(time.time())}@planmate.local"
        legacy_user_id = f"legacy_user_{int(time.time())}"
        
        # Insert legacy user via mongosh
        result = subprocess.run([
            "mongosh", "--quiet", "--eval",
            f"""
            use('test_database');
            db.users.insertOne({{
                user_id: '{legacy_user_id}',
                email: '{legacy_email}',
                name: 'Legacy User',
                profile_type: 'student',
                theme: 'system',
                created_at: new Date()
            }});
            print('Created legacy user');
            """
        ], capture_output=True, text=True)
        
        # Create Firebase user with same email
        new_uid = f"firebase-uid-{int(time.time())}"
        try:
            fb_auth.create_user(
                uid=new_uid,
                email=legacy_email,
                display_name='Legacy User Firebase'
            )
        except Exception:
            pass  # User might already exist
        
        # Get token and call auth/me
        token = get_firebase_id_token(new_uid, legacy_email, 'Legacy User Firebase')
        
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        })
        
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        
        # Should have linked firebase_uid to existing user
        assert data["user_id"] == legacy_user_id
        assert data["firebase_uid"] == new_uid
        assert data["email"] == legacy_email


# ==================== CLEANUP ====================
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup test data after all tests"""
    def cleanup_data():
        import subprocess
        subprocess.run([
            "mongosh", "--quiet", "--eval",
            """
            use('test_database');
            db.tasks.deleteMany({ title: { $regex: /^TEST_/ } });
            db.subjects.deleteMany({ name: { $regex: /^TEST_/ } });
            db.exams.deleteMany({ name: { $regex: /^TEST_/ } });
            db.clients.deleteMany({ name: { $regex: /^TEST_/ } });
            db.time_logs.deleteMany({ description: { $regex: /^TEST_/ } });
            db.payments.deleteMany({ title: { $regex: /^TEST_/ } });
            db.ideas.deleteMany({ title: { $regex: /^TEST_/ } });
            db.platforms.deleteMany({ name: { $regex: /^TEST_/ } });
            db.users.deleteMany({ user_id: { $regex: /^legacy_user_/ } });
            print('Cleaned up TEST_ prefixed data for Firebase auth tests');
            """
        ], capture_output=True)
    request.addfinalizer(cleanup_data)
