"""
Test suite for Authentication and User Management APIs
Tests the Supabase PostgreSQL backend with bcrypt password hashing and JWT tokens
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://doc-verify-14.preview.emergentagent.com')

# --- Test Fixtures ---

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")

# --- Authentication Tests ---

class TestAuthentication:
    """Test suite for /api/auth/login endpoint"""

    def test_admin_login_success(self, api_client):
        """POST /api/auth/login with admin/admin123 returns success with token and user object"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "token" in data, "Response should contain token"
        assert isinstance(data["token"], str) and len(data["token"]) > 0, "Token should be non-empty string"
        
        # User object validation
        assert "user" in data, "Response should contain user object"
        user = data["user"]
        assert user.get("username") == "admin", "Username should be 'admin'"
        assert user.get("role") == "Admin", "Role should be 'Admin'"
        assert "id" in user, "User should have id"
        print(f"Admin login SUCCESS - User ID: {user['id']}, Role: {user['role']}")

    def test_member_login_success(self, api_client):
        """POST /api/auth/login with member1/member123 returns success"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "member1",
            "password": "member123"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "token" in data, "Response should contain token"
        
        user = data["user"]
        assert user.get("username") == "member1", "Username should be 'member1'"
        assert user.get("role") == "AdCom Member", "Role should be 'AdCom Member'"
        print(f"Member login SUCCESS - User ID: {user['id']}, Role: {user['role']}")

    def test_login_wrong_password(self, api_client):
        """POST /api/auth/login with wrong password returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should contain detail"
        print(f"Wrong password correctly rejected: {data['detail']}")

    def test_login_nonexistent_user(self, api_client):
        """POST /api/auth/login with non-existent user returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "nonexistentuser",
            "password": "anypassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Non-existent user correctly rejected")

# --- User Management Tests ---

class TestUserList:
    """Test suite for GET /api/users endpoint"""

    def test_list_users(self, api_client):
        """GET /api/users returns list of users from Supabase DB"""
        response = api_client.get(f"{BASE_URL}/api/users")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 2, "Should have at least admin and member1 users"
        
        # Verify user structure
        for user in data:
            assert "id" in user, "User should have id"
            assert "username" in user, "User should have username"
            assert "name" in user, "User should have name"
            assert "role" in user, "User should have role"
        
        # Verify seed users exist
        usernames = [u["username"] for u in data]
        assert "admin" in usernames, "admin user should exist"
        assert "member1" in usernames, "member1 user should exist"
        print(f"Found {len(data)} users: {usernames}")

class TestUserCRUD:
    """Test suite for user CRUD operations - Create, Read, Update, Delete"""

    def test_create_user_success(self, api_client):
        """POST /api/users creates a new user in DB"""
        unique_id = str(uuid.uuid4())[:8]
        test_username = f"TEST_user_{unique_id}"
        
        payload = {
            "name": "Test User",
            "username": test_username,
            "password": "testpass123",
            "email": f"test_{unique_id}@example.com",
            "role": "AdCom Member",
            "isAdminAccess": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/users", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("username") == test_username, "Created user should have correct username"
        assert data.get("name") == "Test User", "Created user should have correct name"
        assert data.get("role") == "AdCom Member", "Created user should have correct role"
        assert "id" in data, "Created user should have id"
        
        user_id = data["id"]
        print(f"User created SUCCESS - ID: {user_id}, Username: {test_username}")
        
        # Verify persistence - GET to confirm user exists in DB
        get_response = api_client.get(f"{BASE_URL}/api/users")
        assert get_response.status_code == 200
        all_users = get_response.json()
        created_user = next((u for u in all_users if u["id"] == user_id), None)
        assert created_user is not None, "Created user should be retrievable"
        assert created_user["username"] == test_username, "Retrieved user should have correct username"
        
        # Cleanup - delete the test user
        delete_response = api_client.delete(f"{BASE_URL}/api/users/{user_id}")
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"Test user cleaned up successfully")

    def test_create_duplicate_username_fails(self, api_client):
        """POST /api/users with duplicate username returns 400 error"""
        response = api_client.post(f"{BASE_URL}/api/users", json={
            "name": "Duplicate Admin",
            "username": "admin",  # Already exists
            "password": "somepassword",
            "email": "dup@example.com",
            "role": "Admin"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should contain detail"
        assert "exists" in data["detail"].lower() or "already" in data["detail"].lower(), \
            f"Error should mention duplicate: {data['detail']}"
        print(f"Duplicate username correctly rejected: {data['detail']}")

    def test_update_user(self, api_client):
        """PUT /api/users/{id} updates user name/email/role"""
        # First create a test user
        unique_id = str(uuid.uuid4())[:8]
        test_username = f"TEST_update_{unique_id}"
        
        create_response = api_client.post(f"{BASE_URL}/api/users", json={
            "name": "Original Name",
            "username": test_username,
            "password": "testpass123",
            "email": f"original_{unique_id}@example.com",
            "role": "AdCom Member"
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        user_id = create_response.json()["id"]
        
        # Update the user
        update_payload = {
            "name": "Updated Name",
            "email": f"updated_{unique_id}@example.com",
            "role": "Admin"
        }
        
        update_response = api_client.put(f"{BASE_URL}/api/users/{user_id}", json=update_payload)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_user = update_response.json()
        assert updated_user["name"] == "Updated Name", "Name should be updated"
        assert updated_user["email"] == f"updated_{unique_id}@example.com", "Email should be updated"
        assert updated_user["role"] == "Admin", "Role should be updated"
        print(f"User updated SUCCESS - New name: {updated_user['name']}")
        
        # Verify persistence - GET to confirm update persisted
        get_response = api_client.get(f"{BASE_URL}/api/users")
        all_users = get_response.json()
        fetched_user = next((u for u in all_users if u["id"] == user_id), None)
        assert fetched_user is not None, "Updated user should still exist"
        assert fetched_user["name"] == "Updated Name", "Update should persist in DB"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/users/{user_id}")

    def test_delete_user(self, api_client):
        """DELETE /api/users/{id} removes user from DB"""
        # First create a test user
        unique_id = str(uuid.uuid4())[:8]
        test_username = f"TEST_delete_{unique_id}"
        
        create_response = api_client.post(f"{BASE_URL}/api/users", json={
            "name": "To Be Deleted",
            "username": test_username,
            "password": "testpass123",
            "email": f"delete_{unique_id}@example.com",
            "role": "AdCom Member"
        })
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Delete the user
        delete_response = api_client.delete(f"{BASE_URL}/api/users/{user_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("success") == True, "Delete should return success=True"
        print(f"User deleted SUCCESS - ID: {user_id}")
        
        # Verify deletion - user should no longer exist
        get_response = api_client.get(f"{BASE_URL}/api/users")
        all_users = get_response.json()
        deleted_user = next((u for u in all_users if u["id"] == user_id), None)
        assert deleted_user is None, "Deleted user should not exist in database"
        print("Verified: User no longer exists in database")

    def test_delete_nonexistent_user(self, api_client):
        """DELETE /api/users/{id} with non-existent ID returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = api_client.delete(f"{BASE_URL}/api/users/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent user deletion correctly rejected with 404")

class TestUserLoginAfterDelete:
    """Test that deleted user cannot login"""

    def test_deleted_user_cannot_login(self, api_client):
        """After deleting a test user, login with that user should fail"""
        # Create a test user
        unique_id = str(uuid.uuid4())[:8]
        test_username = f"TEST_login_delete_{unique_id}"
        test_password = "testpass123"
        
        create_response = api_client.post(f"{BASE_URL}/api/users", json={
            "name": "Login Delete Test",
            "username": test_username,
            "password": test_password,
            "email": f"login_delete_{unique_id}@example.com",
            "role": "AdCom Member"
        })
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Verify user can login
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": test_username,
            "password": test_password
        })
        assert login_response.status_code == 200, f"User should be able to login: {login_response.text}"
        print(f"User {test_username} can login before deletion")
        
        # Delete the user
        delete_response = api_client.delete(f"{BASE_URL}/api/users/{user_id}")
        assert delete_response.status_code == 200
        
        # Try to login again - should fail
        login_after_delete = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": test_username,
            "password": test_password
        })
        assert login_after_delete.status_code == 401, \
            f"Deleted user should not be able to login, got {login_after_delete.status_code}"
        print(f"Deleted user {test_username} correctly cannot login - got 401")

# --- API Health Check ---

class TestAPIHealth:
    """Basic API health checks"""

    def test_api_root(self, api_client):
        """GET /api/ returns success"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"API root check failed: {response.status_code}"
        data = response.json()
        assert "message" in data, "API root should return message"
        print(f"API health check: {data['message']}")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
