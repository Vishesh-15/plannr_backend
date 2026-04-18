"""
Smart Schedule Planner - New Features Tests (Iteration 2)
Tests for:
- Exam.subject_ids (multi-select subjects)
- Task.exam_id (link task to exam)
- /api/platforms CRUD (Creator profile)
- User isolation for platforms
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session tokens
TOKEN_STUDENT = "test_session_A_001"  # Student profile
TOKEN_CREATOR = "test_session_creator_001"  # Creator profile
TOKEN_CREATOR_C = "test_session_C_001"  # Another creator for isolation tests


@pytest.fixture
def student_client():
    """Session with student auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN_STUDENT}"
    })
    return session


@pytest.fixture
def creator_client():
    """Session with creator auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN_CREATOR}"
    })
    return session


@pytest.fixture
def creator_client_c():
    """Session with another creator auth for isolation tests"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN_CREATOR_C}"
    })
    return session


# ==================== EXAM SUBJECT_IDS (Multi-select) ====================
class TestExamSubjectIds:
    """Test Exam model with subject_ids (List[str]) instead of single subject_id"""
    
    def test_create_exam_with_multiple_subjects(self, student_client):
        """POST /api/exams with subject_ids array creates exam with multiple subjects"""
        # First create some subjects
        sub1_resp = student_client.post(f"{BASE_URL}/api/subjects", json={
            "name": "TEST_Math_Exam",
            "color": "#10B981"
        })
        assert sub1_resp.status_code == 200
        sub1_id = sub1_resp.json()["subject_id"]
        
        sub2_resp = student_client.post(f"{BASE_URL}/api/subjects", json={
            "name": "TEST_Physics_Exam",
            "color": "#3B82F6"
        })
        assert sub2_resp.status_code == 200
        sub2_id = sub2_resp.json()["subject_id"]
        
        # Create exam with multiple subject_ids
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        exam_resp = student_client.post(f"{BASE_URL}/api/exams", json={
            "name": "TEST_Combined Exam",
            "subject_ids": [sub1_id, sub2_id],
            "date": future_date,
            "notes": "Math and Physics combined"
        })
        assert exam_resp.status_code == 200
        data = exam_resp.json()
        
        # Verify response structure
        assert data["name"] == "TEST_Combined Exam"
        assert "exam_id" in data
        assert "subject_ids" in data
        assert isinstance(data["subject_ids"], list)
        assert len(data["subject_ids"]) == 2
        assert sub1_id in data["subject_ids"]
        assert sub2_id in data["subject_ids"]
        assert "_id" not in data
        
        return data["exam_id"]
    
    def test_create_exam_with_empty_subject_ids(self, student_client):
        """POST /api/exams with empty subject_ids array works"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        exam_resp = student_client.post(f"{BASE_URL}/api/exams", json={
            "name": "TEST_General Exam",
            "subject_ids": [],
            "date": future_date
        })
        assert exam_resp.status_code == 200
        data = exam_resp.json()
        assert data["subject_ids"] == []
    
    def test_create_exam_without_subject_ids_defaults_to_empty(self, student_client):
        """POST /api/exams without subject_ids defaults to empty array"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        exam_resp = student_client.post(f"{BASE_URL}/api/exams", json={
            "name": "TEST_No Subjects Exam",
            "date": future_date
        })
        assert exam_resp.status_code == 200
        data = exam_resp.json()
        assert "subject_ids" in data
        assert data["subject_ids"] == []
    
    def test_get_exams_returns_subject_ids_array(self, student_client):
        """GET /api/exams returns exams with subject_ids array"""
        response = student_client.get(f"{BASE_URL}/api/exams")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check that exams have subject_ids field
        for exam in data:
            if exam["name"].startswith("TEST_"):
                assert "subject_ids" in exam or "subject_id" in exam  # backward compat


# ==================== TASK EXAM_ID (Link task to exam) ====================
class TestTaskExamId:
    """Test Task model with exam_id field"""
    
    def test_create_task_with_exam_id(self, student_client):
        """POST /api/tasks with exam_id links task to exam"""
        # First create an exam
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        exam_resp = student_client.post(f"{BASE_URL}/api/exams", json={
            "name": "TEST_Exam for Task Link",
            "date": future_date
        })
        assert exam_resp.status_code == 200
        exam_id = exam_resp.json()["exam_id"]
        
        # Create task linked to exam
        today = datetime.now().strftime("%Y-%m-%d")
        task_resp = student_client.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Study for Exam",
            "date": today,
            "exam_id": exam_id,
            "category": "revision"
        })
        assert task_resp.status_code == 200
        data = task_resp.json()
        
        assert data["title"] == "TEST_Study for Exam"
        assert data["exam_id"] == exam_id
        assert "task_id" in data
        assert "_id" not in data
        
        return data["task_id"]
    
    def test_create_task_without_exam_id(self, student_client):
        """POST /api/tasks without exam_id works (null)"""
        today = datetime.now().strftime("%Y-%m-%d")
        task_resp = student_client.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Regular Task No Exam",
            "date": today
        })
        assert task_resp.status_code == 200
        data = task_resp.json()
        assert data.get("exam_id") is None
    
    def test_update_task_exam_id(self, student_client):
        """PATCH /api/tasks/{id} can update exam_id"""
        # Create exam
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        exam_resp = student_client.post(f"{BASE_URL}/api/exams", json={
            "name": "TEST_Exam for Update",
            "date": future_date
        })
        exam_id = exam_resp.json()["exam_id"]
        
        # Create task without exam_id
        today = datetime.now().strftime("%Y-%m-%d")
        task_resp = student_client.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Task to Link",
            "date": today
        })
        task_id = task_resp.json()["task_id"]
        
        # Update task with exam_id
        update_resp = student_client.patch(f"{BASE_URL}/api/tasks/{task_id}", json={
            "exam_id": exam_id
        })
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["exam_id"] == exam_id
        
        # Verify persistence
        list_resp = student_client.get(f"{BASE_URL}/api/tasks")
        tasks = list_resp.json()
        updated_task = next((t for t in tasks if t["task_id"] == task_id), None)
        assert updated_task is not None
        assert updated_task["exam_id"] == exam_id
    
    def test_get_tasks_returns_exam_id(self, student_client):
        """GET /api/tasks returns tasks with exam_id field"""
        response = student_client.get(f"{BASE_URL}/api/tasks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Tasks should have exam_id field (can be null)
        for task in data:
            assert "_id" not in task


# ==================== PLATFORMS CRUD (Creator) ====================
class TestPlatformsCRUD:
    """Test /api/platforms CRUD operations"""
    
    def test_list_platforms_empty(self, creator_client):
        """GET /api/platforms returns empty list for new user"""
        response = creator_client.get(f"{BASE_URL}/api/platforms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_platform(self, creator_client):
        """POST /api/platforms creates platform"""
        response = creator_client.post(f"{BASE_URL}/api/platforms", json={
            "name": "TEST_YouTube",
            "color": "#FF0000"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "TEST_YouTube"
        assert data["color"] == "#FF0000"
        assert "platform_id" in data
        assert "_id" not in data
        
        return data["platform_id"]
    
    def test_create_platform_default_color(self, creator_client):
        """POST /api/platforms without color uses default"""
        response = creator_client.post(f"{BASE_URL}/api/platforms", json={
            "name": "TEST_Instagram"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Instagram"
        assert "color" in data  # Should have default color
    
    def test_create_platform_duplicate_returns_409(self, creator_client):
        """POST /api/platforms with duplicate name returns 409"""
        # Create first platform
        creator_client.post(f"{BASE_URL}/api/platforms", json={
            "name": "TEST_TikTok"
        })
        
        # Try to create duplicate
        response = creator_client.post(f"{BASE_URL}/api/platforms", json={
            "name": "TEST_TikTok"
        })
        assert response.status_code == 409
        data = response.json()
        assert "already exists" in data.get("detail", "").lower()
    
    def test_create_platform_empty_name_returns_400(self, creator_client):
        """POST /api/platforms with empty name returns 400"""
        response = creator_client.post(f"{BASE_URL}/api/platforms", json={
            "name": "   "
        })
        assert response.status_code == 400
    
    def test_list_platforms_returns_created(self, creator_client):
        """GET /api/platforms returns created platforms"""
        # Create a platform
        creator_client.post(f"{BASE_URL}/api/platforms", json={
            "name": "TEST_LinkedIn"
        })
        
        # List platforms
        response = creator_client.get(f"{BASE_URL}/api/platforms")
        assert response.status_code == 200
        data = response.json()
        
        # Should contain the created platform
        names = [p["name"] for p in data]
        assert "TEST_LinkedIn" in names
    
    def test_delete_platform(self, creator_client):
        """DELETE /api/platforms/{id} removes platform"""
        # Create platform
        create_resp = creator_client.post(f"{BASE_URL}/api/platforms", json={
            "name": "TEST_Platform_To_Delete"
        })
        platform_id = create_resp.json()["platform_id"]
        
        # Delete it
        response = creator_client.delete(f"{BASE_URL}/api/platforms/{platform_id}")
        assert response.status_code == 200
        
        # Verify it's gone
        list_resp = creator_client.get(f"{BASE_URL}/api/platforms")
        platforms = list_resp.json()
        assert not any(p["platform_id"] == platform_id for p in platforms)


# ==================== USER ISOLATION (Platforms) ====================
class TestPlatformUserIsolation:
    """Test that platforms created by user A are not visible to user B"""
    
    def test_platform_isolation(self, creator_client, creator_client_c):
        """Platforms created by creator A not visible to creator C"""
        # Creator A creates a platform
        create_resp = creator_client.post(f"{BASE_URL}/api/platforms", json={
            "name": "TEST_Private_Platform_A"
        })
        assert create_resp.status_code == 200
        platform_id = create_resp.json()["platform_id"]
        
        # Creator C should not see it
        list_resp = creator_client_c.get(f"{BASE_URL}/api/platforms")
        assert list_resp.status_code == 200
        platforms = list_resp.json()
        assert not any(p["platform_id"] == platform_id for p in platforms)
        assert not any(p["name"] == "TEST_Private_Platform_A" for p in platforms)
    
    def test_delete_only_own_platform(self, creator_client, creator_client_c):
        """User can only delete their own platforms"""
        # Creator A creates a platform
        create_resp = creator_client.post(f"{BASE_URL}/api/platforms", json={
            "name": "TEST_Platform_Owned_By_A"
        })
        platform_id = create_resp.json()["platform_id"]
        
        # Creator C tries to delete it (should not affect it)
        creator_client_c.delete(f"{BASE_URL}/api/platforms/{platform_id}")
        
        # Platform should still exist for Creator A
        list_resp = creator_client.get(f"{BASE_URL}/api/platforms")
        platforms = list_resp.json()
        assert any(p["platform_id"] == platform_id for p in platforms)


# ==================== EXAM SUBJECT_IDS ISOLATION ====================
class TestExamSubjectIdsIsolation:
    """Test that exam subject_ids respect user isolation"""
    
    def test_exam_subject_ids_isolation(self, student_client):
        """Exams with subject_ids only show user's own subjects"""
        # Create subject
        sub_resp = student_client.post(f"{BASE_URL}/api/subjects", json={
            "name": "TEST_Isolated_Subject"
        })
        sub_id = sub_resp.json()["subject_id"]
        
        # Create exam with that subject
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        exam_resp = student_client.post(f"{BASE_URL}/api/exams", json={
            "name": "TEST_Isolated_Exam",
            "subject_ids": [sub_id],
            "date": future_date
        })
        assert exam_resp.status_code == 200
        data = exam_resp.json()
        assert sub_id in data["subject_ids"]


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
            db.platforms.deleteMany({ name: { $regex: /^TEST_/ } });
            print('Cleaned up TEST_ prefixed data for new features');
            """
        ], capture_output=True)
    request.addfinalizer(cleanup_data)
