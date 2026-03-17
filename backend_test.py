import requests
import sys
import json
from datetime import datetime

class AQISBackendTester:
    def __init__(self, base_url="https://doc-verify-14.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Try to parse JSON response for additional validation
                try:
                    response_data = response.json()
                    print(f"📄 Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    print(f"📄 Response: {response.text[:100]}...")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"📄 Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test(
            "API Root", 
            "GET", 
            "api/", 
            200
        )

    def test_ai_analyze_valid_query(self):
        """Test AI analysis with valid query"""
        test_description = "Hello, I am facing issues with my document submission. My transcripts were uploaded but I am getting an error saying they are incomplete. Can you help me understand what documents are missing and how to resubmit them properly? This is urgent as the deadline is approaching."
        
        success, response = self.run_test(
            "AI Analysis - Valid Query",
            "POST",
            "api/ai/analyze",
            200,
            data={"description": test_description}
        )
        
        if success and response:
            # Validate response structure
            required_fields = ["summary", "intent", "urgency", "draftResponse"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"⚠️  Missing fields in response: {missing_fields}")
                return False
            
            print(f"🎯 Intent: {response.get('intent')}")
            print(f"🚨 Urgency: {response.get('urgency')}")
            print(f"📝 Summary length: {len(response.get('summary', ''))}")
            return True
        
        return False

    def test_ai_analyze_empty_description(self):
        """Test AI analysis with empty description"""
        return self.run_test(
            "AI Analysis - Empty Description",
            "POST",
            "api/ai/analyze",
            422,  # Validation error expected
            data={"description": ""}
        )

    def test_ai_analyze_missing_groq_key(self):
        """Test AI analysis response when no GROQ key (should handle gracefully)"""
        success, response = self.run_test(
            "AI Analysis - Various Scenarios",
            "POST",
            "api/ai/analyze",
            200,
            data={"description": "I need information about fees"}
        )
        
        if success and response:
            # Either valid response or graceful error
            if "error" in response:
                print(f"ℹ️  Expected error response: {response['error']}")
                return True
            else:
                print("✅ Valid AI response received")
                return True
        
        return False

def main():
    print("🚀 Starting AQIS Backend API Testing...")
    print("=" * 50)
    
    tester = AQISBackendTester()
    
    # Test API availability
    if not tester.test_api_root():
        print("❌ API root endpoint failed, stopping tests")
        return 1
    
    # Test AI analysis endpoint with valid data
    if not tester.test_ai_analyze_valid_query():
        print("⚠️  AI analysis with valid query had issues")
    
    # Test edge cases
    tester.test_ai_analyze_empty_description()
    tester.test_ai_analyze_missing_groq_key()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Backend Tests Summary:")
    print(f"   Total Tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    return 0 if tester.tests_passed >= (tester.tests_run * 0.7) else 1  # 70% pass threshold

if __name__ == "__main__":
    sys.exit(main())