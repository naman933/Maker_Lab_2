"""
Test suite for Selective Query Assignment feature
Tests the isAvailable field for AdCom Members and availability toggling
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://doc-verify-14.preview.emergentagent.com')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# --- isAvailable Field Tests ---

class TestIsAvailableField:
    """Test suite for isAvailable field in user API responses"""

    def test_get_users_returns_isAvailable(self, api_client):
        """GET /api/users returns isAvailable field for each user"""
        response = api_client.get(f"{BASE_URL}/api/users")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        users = response.json()
        assert isinstance(users, list), "Response should be a list"
        
        for user in users:
            assert "isAvailable" in user, f"User {user['username']} should have isAvailable field"
            assert isinstance(user["isAvailable"], bool), f"isAvailable should be boolean for {user['username']}"
        
        print(f"All {len(users)} users have isAvailable field")

    def test_create_user_default_isAvailable_true(self, api_client):
        """POST /api/users creates user with isAvailable=true by default"""
        unique_id = str(uuid.uuid4())[:8]
        test_username = f"TEST_avail_{unique_id}"
        
        payload = {
            "name": "Test Availability User",
            "username": test_username,
            "password": "testpass123",
            "email": f"test_{unique_id}@example.com",
            "role": "AdCom Member"
        }
        
        response = api_client.post(f"{BASE_URL}/api/users", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("isAvailable") == True, "New user should have isAvailable=true by default"
        
        user_id = data["id"]
        print(f"New user created with isAvailable=true")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/users/{user_id}")

    def test_create_user_with_isAvailable_false(self, api_client):
        """POST /api/users can create user with isAvailable=false"""
        unique_id = str(uuid.uuid4())[:8]
        test_username = f"TEST_unavail_{unique_id}"
        
        payload = {
            "name": "Test Unavailable User",
            "username": test_username,
            "password": "testpass123",
            "email": f"test_{unique_id}@example.com",
            "role": "AdCom Member",
            "isAvailable": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/users", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("isAvailable") == False, "User should be created with isAvailable=false"
        
        user_id = data["id"]
        print(f"User created with isAvailable=false")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/users/{user_id}")


class TestUpdateAvailability:
    """Test suite for updating user availability via PUT /api/users/{id}"""

    def test_update_isAvailable_to_false(self, api_client):
        """PUT /api/users/{id} with isAvailable=false updates the user's availability in DB"""
        # Create test user
        unique_id = str(uuid.uuid4())[:8]
        test_username = f"TEST_toggle_{unique_id}"
        
        create_resp = api_client.post(f"{BASE_URL}/api/users", json={
            "name": "Toggle Test User",
            "username": test_username,
            "password": "testpass123",
            "role": "AdCom Member"
        })
        assert create_resp.status_code == 200
        user_id = create_resp.json()["id"]
        assert create_resp.json()["isAvailable"] == True, "User should start with isAvailable=true"
        
        # Update to false
        update_resp = api_client.put(f"{BASE_URL}/api/users/{user_id}", json={
            "isAvailable": False
        })
        
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        assert update_resp.json()["isAvailable"] == False, "isAvailable should be false after update"
        print("User availability updated to false")
        
        # Verify persistence via GET
        get_resp = api_client.get(f"{BASE_URL}/api/users")
        users = get_resp.json()
        user = next((u for u in users if u["id"] == user_id), None)
        assert user is not None, "User should exist"
        assert user["isAvailable"] == False, "isAvailable=false should persist in DB"
        print("Verified: isAvailable=false persisted in database")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/users/{user_id}")

    def test_update_isAvailable_to_true(self, api_client):
        """PUT /api/users/{id} with isAvailable=true restores availability"""
        # Create test user with isAvailable=false
        unique_id = str(uuid.uuid4())[:8]
        test_username = f"TEST_restore_{unique_id}"
        
        create_resp = api_client.post(f"{BASE_URL}/api/users", json={
            "name": "Restore Test User",
            "username": test_username,
            "password": "testpass123",
            "role": "AdCom Member",
            "isAvailable": False
        })
        assert create_resp.status_code == 200
        user_id = create_resp.json()["id"]
        assert create_resp.json()["isAvailable"] == False, "User should start with isAvailable=false"
        
        # Update to true
        update_resp = api_client.put(f"{BASE_URL}/api/users/{user_id}", json={
            "isAvailable": True
        })
        
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        assert update_resp.json()["isAvailable"] == True, "isAvailable should be true after update"
        print("User availability restored to true")
        
        # Verify persistence via GET
        get_resp = api_client.get(f"{BASE_URL}/api/users")
        users = get_resp.json()
        user = next((u for u in users if u["id"] == user_id), None)
        assert user is not None, "User should exist"
        assert user["isAvailable"] == True, "isAvailable=true should persist in DB"
        print("Verified: isAvailable=true persisted in database")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/users/{user_id}")

    def test_update_only_isAvailable_preserves_other_fields(self, api_client):
        """Updating only isAvailable should preserve name, email, role"""
        # Create test user
        unique_id = str(uuid.uuid4())[:8]
        test_username = f"TEST_preserve_{unique_id}"
        original_name = "Preserve Fields User"
        original_email = f"preserve_{unique_id}@example.com"
        
        create_resp = api_client.post(f"{BASE_URL}/api/users", json={
            "name": original_name,
            "username": test_username,
            "password": "testpass123",
            "email": original_email,
            "role": "AdCom Member"
        })
        assert create_resp.status_code == 200
        user_id = create_resp.json()["id"]
        
        # Update only isAvailable
        update_resp = api_client.put(f"{BASE_URL}/api/users/{user_id}", json={
            "isAvailable": False
        })
        
        assert update_resp.status_code == 200
        data = update_resp.json()
        
        # Verify other fields preserved
        assert data["name"] == original_name, "Name should be preserved"
        assert data["email"] == original_email, "Email should be preserved"
        assert data["role"] == "AdCom Member", "Role should be preserved"
        assert data["isAvailable"] == False, "isAvailable should be updated"
        print("Verified: Other fields preserved after isAvailable update")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/users/{user_id}")


class TestLoginWithIsAvailable:
    """Test that isAvailable is returned on login"""

    def test_login_returns_isAvailable(self, api_client):
        """POST /api/auth/login returns isAvailable in user object"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "member1",
            "password": "member123"
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        user = data.get("user")
        assert user is not None, "Login should return user object"
        assert "isAvailable" in user, "User object should have isAvailable field"
        print(f"Login returns isAvailable={user['isAvailable']} for member1")

    def test_admin_login_returns_isAvailable(self, api_client):
        """POST /api/auth/login for admin returns isAvailable"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        user = data.get("user")
        assert user is not None, "Login should return user object"
        assert "isAvailable" in user, "Admin user object should have isAvailable field"
        print(f"Admin login returns isAvailable={user['isAvailable']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
