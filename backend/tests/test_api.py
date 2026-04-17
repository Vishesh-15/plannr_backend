"""
Smart Schedule Planner API Tests
Tests all CRUD operations, auth flows, and user isolation
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session tokens (seeded via mongosh)
TOKEN_USER_A = "test_session_A_001"  # Student profile
TOKEN_USER_B = "test_session_B_001"  # Freelancer profile
TOKEN_USER_C = "test_session_C_001"  # No profile set


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_client_a(api_client):
    """Session with User A auth (student)"""
    api_client.headers.update({"Authorization": f"Bearer {TOKEN_USER_A}"})
    return api_client


@pytest.fixture
def auth_client_b(api_client):
    """Session with User B auth (freelancer)"""
    api_client.headers.update({"Authorization": f"Bearer {TOKEN_USER_B}"})
    return api_client


@pytest.fixture
def auth_client_c(api_client):
    """Session with User C auth (no profile)"""
    api_client.headers.update({"Authorization": f"Bearer {TOKEN_USER_C}"})
    return api_client


# ==================== ROOT ENDPOINT ====================
class TestRootEndpoint:
    """Test GET /api/ returns hello message"""
    
    def test_root_returns_message(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Smart Schedule Planner" in data["message"]


# ==================== AUTH ENDPOINTS ====================
class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_session_invalid_returns_401(self, api_client):
        """POST /api/auth/session with invalid session_id returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/session", json={
            "session_id": "invalid_session_id_12345"
        })
        assert response.status_code == 401
    
    def test_session_missing_id_returns_400(self, api_client):
        """POST /api/auth/session without session_id returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/session", json={})
        assert response.status_code == 400
    
    def test_me_without_token_returns_401(self, api_client):
        """GET /api/auth/me without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
    
    def test_me_with_valid_token_returns_user(self, auth_client_a):
        """GET /api/auth/me with valid Bearer token returns user"""
        response = auth_client_a.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert data["email"] == "TEST_userA@example.com"
        assert data["profile_type"] == "student"
        # Verify _id is excluded
        assert "_id" not in data


# ==================== USER PROFILE ====================
class TestUserProfile:
    """Test user profile update"""
    
    def test_update_profile_type(self, auth_client_a):
        """PATCH /api/user/profile with profile_type updates user"""
        response = auth_client_a.patch(f"{BASE_URL}/api/user/profile", json={
            "profile_type": "student"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["profile_type"] == "student"
        assert "_id" not in data
    
    def test_update_theme(self, auth_client_a):
        """PATCH /api/user/profile with theme updates user"""
        response = auth_client_a.patch(f"{BASE_URL}/api/user/profile", json={
            "theme": "dark"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "dark"
        
        # Reset to system
        auth_client_a.patch(f"{BASE_URL}/api/user/profile", json={"theme": "system"})


# ==================== TASKS CRUD ====================
class TestTasksCRUD:
    """Test Task CRUD operations"""
    
    @pytest.mark.skip(reason="User C now has creator profile for iteration 2 tests")
    def test_create_task_without_profile_returns_400(self, auth_client_c):
        """Task creation before profile_type set returns 400"""
        response = auth_client_c.post(f"{BASE_URL}/api/tasks", json={
            "title": "Test Task",
            "date": datetime.now().strftime("%Y-%m-%d")
        })
        assert response.status_code == 400
        data = response.json()
        assert "Profile type not set" in data.get("detail", "")
    
    def test_create_task_success(self, auth_client_a):
        """POST /api/tasks creates task successfully"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = auth_client_a.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Study Math",
            "description": "Chapter 5 review",
            "date": today,
            "time": "14:00",
            "priority": "high",
            "category": "study"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Study Math"
        assert data["profile_type"] == "student"
        assert "task_id" in data
        assert "_id" not in data
        return data["task_id"]
    
    def test_list_tasks_with_date_filter(self, auth_client_a):
        """GET /api/tasks with date_from/date_to filter"""
        today = datetime.now().strftime("%Y-%m-%d")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = auth_client_a.get(f"{BASE_URL}/api/tasks", params={
            "date_from": today,
            "date_to": tomorrow
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned tasks should be within date range
        for task in data:
            assert "_id" not in task
    
    def test_update_task(self, auth_client_a):
        """PATCH /api/tasks/{id} updates task"""
        # First create a task
        today = datetime.now().strftime("%Y-%m-%d")
        create_resp = auth_client_a.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Task to Update",
            "date": today
        })
        task_id = create_resp.json()["task_id"]
        
        # Update it
        response = auth_client_a.patch(f"{BASE_URL}/api/tasks/{task_id}", json={
            "title": "TEST_Updated Task Title",
            "status": "done"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Updated Task Title"
        assert data["status"] == "done"
        
        # Verify persistence with GET
        list_resp = auth_client_a.get(f"{BASE_URL}/api/tasks")
        tasks = list_resp.json()
        updated_task = next((t for t in tasks if t["task_id"] == task_id), None)
        assert updated_task is not None
        assert updated_task["title"] == "TEST_Updated Task Title"
    
    def test_delete_task(self, auth_client_a):
        """DELETE /api/tasks/{id} removes task"""
        # Create a task
        create_resp = auth_client_a.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Task to Delete",
            "date": datetime.now().strftime("%Y-%m-%d")
        })
        task_id = create_resp.json()["task_id"]
        
        # Delete it
        response = auth_client_a.delete(f"{BASE_URL}/api/tasks/{task_id}")
        assert response.status_code == 200
        
        # Verify it's gone
        list_resp = auth_client_a.get(f"{BASE_URL}/api/tasks")
        tasks = list_resp.json()
        assert not any(t["task_id"] == task_id for t in tasks)


# ==================== USER ISOLATION ====================
class TestUserIsolation:
    """Test that tasks created by user A are not visible to user B"""
    
    def test_user_isolation(self):
        """Tasks created by user A not visible to user B"""
        # Create separate sessions for each user
        session_a = requests.Session()
        session_a.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TOKEN_USER_A}"
        })
        
        session_b = requests.Session()
        session_b.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TOKEN_USER_B}"
        })
        
        # User A creates a task
        create_resp = session_a.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_User A Private Task Isolation",
            "date": datetime.now().strftime("%Y-%m-%d")
        })
        assert create_resp.status_code == 200
        task_id = create_resp.json()["task_id"]
        
        # User B should not see it
        list_resp = session_b.get(f"{BASE_URL}/api/tasks")
        assert list_resp.status_code == 200
        tasks = list_resp.json()
        assert not any(t["task_id"] == task_id for t in tasks)


# ==================== SUBJECTS CRUD (Student) ====================
class TestSubjectsCRUD:
    """Test Subject CRUD operations"""
    
    def test_create_subject(self, auth_client_a):
        """POST /api/subjects creates subject"""
        response = auth_client_a.post(f"{BASE_URL}/api/subjects", json={
            "name": "TEST_Mathematics",
            "color": "#10B981"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Mathematics"
        assert "subject_id" in data
        assert "_id" not in data
        return data["subject_id"]
    
    def test_list_subjects(self, auth_client_a):
        """GET /api/subjects returns list"""
        response = auth_client_a.get(f"{BASE_URL}/api/subjects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for subject in data:
            assert "_id" not in subject
    
    def test_delete_subject(self, auth_client_a):
        """DELETE /api/subjects/{id} removes subject"""
        # Create
        create_resp = auth_client_a.post(f"{BASE_URL}/api/subjects", json={
            "name": "TEST_Subject to Delete"
        })
        subject_id = create_resp.json()["subject_id"]
        
        # Delete
        response = auth_client_a.delete(f"{BASE_URL}/api/subjects/{subject_id}")
        assert response.status_code == 200
        
        # Verify
        list_resp = auth_client_a.get(f"{BASE_URL}/api/subjects")
        subjects = list_resp.json()
        assert not any(s["subject_id"] == subject_id for s in subjects)


# ==================== EXAMS CRUD (Student) ====================
class TestExamsCRUD:
    """Test Exam CRUD operations"""
    
    def test_create_exam(self, auth_client_a):
        """POST /api/exams creates exam"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        response = auth_client_a.post(f"{BASE_URL}/api/exams", json={
            "name": "TEST_Final Exam",
            "date": future_date,
            "notes": "Study chapters 1-10"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Final Exam"
        assert "exam_id" in data
        assert "_id" not in data
    
    def test_list_exams(self, auth_client_a):
        """GET /api/exams returns list"""
        response = auth_client_a.get(f"{BASE_URL}/api/exams")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_exam(self, auth_client_a):
        """DELETE /api/exams/{id} removes exam"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        create_resp = auth_client_a.post(f"{BASE_URL}/api/exams", json={
            "name": "TEST_Exam to Delete",
            "date": future_date
        })
        exam_id = create_resp.json()["exam_id"]
        
        response = auth_client_a.delete(f"{BASE_URL}/api/exams/{exam_id}")
        assert response.status_code == 200


# ==================== CLIENTS CRUD (Freelancer) ====================
class TestClientsCRUD:
    """Test Client CRUD operations"""
    
    def test_create_client(self, auth_client_b):
        """POST /api/clients creates client"""
        response = auth_client_b.post(f"{BASE_URL}/api/clients", json={
            "name": "TEST_Acme Corp",
            "company": "Acme Corporation",
            "email": "contact@acme.com",
            "color": "#3B82F6"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Acme Corp"
        assert "client_id" in data
        assert "_id" not in data
    
    def test_list_clients(self, auth_client_b):
        """GET /api/clients returns list"""
        response = auth_client_b.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_client(self, auth_client_b):
        """DELETE /api/clients/{id} removes client"""
        create_resp = auth_client_b.post(f"{BASE_URL}/api/clients", json={
            "name": "TEST_Client to Delete"
        })
        client_id = create_resp.json()["client_id"]
        
        response = auth_client_b.delete(f"{BASE_URL}/api/clients/{client_id}")
        assert response.status_code == 200


# ==================== TIME LOGS CRUD (Freelancer) ====================
class TestTimeLogsCRUD:
    """Test Time Log CRUD operations"""
    
    def test_create_time_log(self, auth_client_b):
        """POST /api/time-logs creates time log"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = auth_client_b.post(f"{BASE_URL}/api/time-logs", json={
            "description": "TEST_Project work",
            "date": today,
            "minutes": 120
        })
        assert response.status_code == 200
        data = response.json()
        assert data["minutes"] == 120
        assert "log_id" in data
        assert "_id" not in data
    
    def test_list_time_logs(self, auth_client_b):
        """GET /api/time-logs returns list"""
        response = auth_client_b.get(f"{BASE_URL}/api/time-logs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_time_log(self, auth_client_b):
        """DELETE /api/time-logs/{id} removes log"""
        today = datetime.now().strftime("%Y-%m-%d")
        create_resp = auth_client_b.post(f"{BASE_URL}/api/time-logs", json={
            "description": "TEST_Log to Delete",
            "date": today,
            "minutes": 30
        })
        log_id = create_resp.json()["log_id"]
        
        response = auth_client_b.delete(f"{BASE_URL}/api/time-logs/{log_id}")
        assert response.status_code == 200


# ==================== PAYMENTS CRUD (Freelancer) ====================
class TestPaymentsCRUD:
    """Test Payment CRUD operations"""
    
    def test_create_payment(self, auth_client_b):
        """POST /api/payments creates payment"""
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        response = auth_client_b.post(f"{BASE_URL}/api/payments", json={
            "title": "TEST_Invoice #001",
            "amount": 1500.00,
            "currency": "USD",
            "due_date": due_date,
            "status": "pending"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Invoice #001"
        assert data["amount"] == 1500.00
        assert "payment_id" in data
        assert "_id" not in data
    
    def test_list_payments(self, auth_client_b):
        """GET /api/payments returns list"""
        response = auth_client_b.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_payment_status(self, auth_client_b):
        """PATCH /api/payments/{id} changes status to received"""
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        create_resp = auth_client_b.post(f"{BASE_URL}/api/payments", json={
            "title": "TEST_Payment to Update",
            "amount": 500.00,
            "due_date": due_date
        })
        payment_id = create_resp.json()["payment_id"]
        
        # Update status
        response = auth_client_b.patch(f"{BASE_URL}/api/payments/{payment_id}", json={
            "status": "received"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "received"
    
    def test_delete_payment(self, auth_client_b):
        """DELETE /api/payments/{id} removes payment"""
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        create_resp = auth_client_b.post(f"{BASE_URL}/api/payments", json={
            "title": "TEST_Payment to Delete",
            "amount": 100.00,
            "due_date": due_date
        })
        payment_id = create_resp.json()["payment_id"]
        
        response = auth_client_b.delete(f"{BASE_URL}/api/payments/{payment_id}")
        assert response.status_code == 200


# ==================== IDEAS CRUD (Creator) ====================
class TestIdeasCRUD:
    """Test Idea CRUD operations"""
    
    def test_create_idea(self, auth_client_a):
        """POST /api/ideas creates idea"""
        response = auth_client_a.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Video Idea",
            "notes": "Tutorial on Python testing",
            "platform": "youtube",
            "tags": ["python", "testing"],
            "status": "new"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Video Idea"
        assert "idea_id" in data
        assert "_id" not in data
    
    def test_list_ideas(self, auth_client_a):
        """GET /api/ideas returns list"""
        response = auth_client_a.get(f"{BASE_URL}/api/ideas")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_idea(self, auth_client_a):
        """PATCH /api/ideas/{id} updates idea"""
        create_resp = auth_client_a.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Idea to Update"
        })
        idea_id = create_resp.json()["idea_id"]
        
        response = auth_client_a.patch(f"{BASE_URL}/api/ideas/{idea_id}", json={
            "status": "planned",
            "platform": "instagram"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "planned"
        assert data["platform"] == "instagram"
    
    def test_delete_idea(self, auth_client_a):
        """DELETE /api/ideas/{id} removes idea"""
        create_resp = auth_client_a.post(f"{BASE_URL}/api/ideas", json={
            "title": "TEST_Idea to Delete"
        })
        idea_id = create_resp.json()["idea_id"]
        
        response = auth_client_a.delete(f"{BASE_URL}/api/ideas/{idea_id}")
        assert response.status_code == 200


# ==================== DASHBOARD STATS ====================
class TestDashboardStats:
    """Test dashboard stats endpoint"""
    
    def test_get_stats(self, auth_client_a):
        """GET /api/dashboard/stats returns stats object"""
        response = auth_client_a.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "done" in data
        assert "today" in data
        assert "pending" in data
        assert isinstance(data["total"], int)
        assert isinstance(data["done"], int)
        assert isinstance(data["today"], int)
        assert isinstance(data["pending"], int)


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
            print('Cleaned up TEST_ prefixed data');
            """
        ], capture_output=True)
    request.addfinalizer(cleanup_data)
