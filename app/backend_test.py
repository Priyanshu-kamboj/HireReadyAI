#!/usr/bin/env python3

import requests
import sys
import json
import io
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

class HireReadyAPITester:
    def __init__(self, base_url="https://placement-ai-5.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.resume_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {name}: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    headers.pop('Content-Type', None)
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)[:200]}..."
                    self.log_test(name, True, details)
                    return True, response_data
                except:
                    self.log_test(name, True, details)
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Error: {response.text[:200]}"
                self.log_test(name, False, details)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def create_test_pdf(self):
        """Create a test PDF resume"""
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # Add resume content
        p.drawString(100, 750, "John Doe")
        p.drawString(100, 730, "Software Engineer")
        p.drawString(100, 710, "Email: john.doe@example.com")
        p.drawString(100, 690, "Phone: +91-9876543210")
        
        p.drawString(100, 650, "EXPERIENCE:")
        p.drawString(100, 630, "• Software Developer at TechCorp (2022-2024)")
        p.drawString(100, 610, "• Developed web applications using React and Python")
        p.drawString(100, 590, "• Worked with MongoDB and FastAPI")
        
        p.drawString(100, 550, "SKILLS:")
        p.drawString(100, 530, "• Programming: Python, JavaScript, React")
        p.drawString(100, 510, "• Databases: MongoDB, PostgreSQL")
        p.drawString(100, 490, "• Frameworks: FastAPI, Express.js")
        
        p.drawString(100, 450, "EDUCATION:")
        p.drawString(100, 430, "• B.Tech Computer Science - ABC University (2018-2022)")
        
        p.save()
        buffer.seek(0)
        return buffer

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": "Test User",
                "email": test_email,
                "password": "TestPass123!"
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # First register a user
        test_email = f"login_test_{datetime.now().strftime('%H%M%S')}@example.com"
        
        # Register
        success, response = self.run_test(
            "Register for Login Test",
            "POST",
            "auth/register",
            200,
            data={
                "name": "Login Test User",
                "email": test_email,
                "password": "LoginTest123!"
            }
        )
        
        if not success:
            return False
        
        # Clear token to test login
        self.token = None
        
        # Login
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": test_email,
                "password": "LoginTest123!"
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_resume_analysis(self):
        """Test resume upload and analysis"""
        if not self.token:
            self.log_test("Resume Analysis", False, "No authentication token")
            return False
        
        # Create test PDF
        pdf_buffer = self.create_test_pdf()
        
        files = {
            'file': ('test_resume.pdf', pdf_buffer, 'application/pdf')
        }
        
        success, response = self.run_test(
            "Resume Analysis",
            "POST",
            "resume/analyze",
            200,
            files=files
        )
        
        if success and 'id' in response:
            self.resume_id = response['id']
            return True
        return False

    def test_usage_limit_enforcement(self):
        """Test free plan usage limit (2 analyses)"""
        if not self.token:
            self.log_test("Usage Limit Test", False, "No authentication token")
            return False
        
        # Try to upload a third resume (should fail for free users)
        pdf_buffer = self.create_test_pdf()
        
        # Use the same file upload method as successful tests
        url = f"{self.base_url}/resume/analyze"
        headers = {'Authorization': f'Bearer {self.token}'}
        files = {'file': ('test_resume_3.pdf', pdf_buffer, 'application/pdf')}
        
        try:
            response = requests.post(url, files=files, headers=headers)
            success = response.status_code == 403
            
            if success:
                self.log_test("Usage Limit Enforcement", True, f"Correctly blocked third analysis: {response.status_code}")
            else:
                try:
                    error_data = response.json()
                    self.log_test("Usage Limit Enforcement", False, f"Status: {response.status_code}, Error: {error_data}")
                except:
                    self.log_test("Usage Limit Enforcement", False, f"Status: {response.status_code}, Text: {response.text[:200]}")
            
            return success
        except Exception as e:
            self.log_test("Usage Limit Enforcement", False, f"Exception: {str(e)}")
            return False

    def test_resume_history(self):
        """Test getting resume history"""
        success, response = self.run_test(
            "Get Resume History",
            "GET",
            "resume/history",
            200
        )
        
        if success and 'resumes' in response:
            return len(response['resumes']) > 0
        return False

    def test_jd_matching(self):
        """Test job description matching"""
        if not self.resume_id:
            self.log_test("JD Matching", False, "No resume ID available")
            return False
        
        job_description = """
        We are looking for a Software Engineer with experience in:
        - Python programming
        - React.js development
        - MongoDB database management
        - FastAPI framework
        - RESTful API development
        - Agile development methodologies
        
        Requirements:
        - Bachelor's degree in Computer Science
        - 2+ years of experience
        - Strong problem-solving skills
        """
        
        success, response = self.run_test(
            "Job Description Matching",
            "POST",
            "resume/jd-match",
            200,
            data={
                "resume_id": self.resume_id,
                "job_description": job_description
            }
        )
        
        return success and 'jd_match_score' in response

    def test_interview_questions(self):
        """Test interview question generation"""
        if not self.resume_id:
            self.log_test("Interview Questions", False, "No resume ID available")
            return False
        
        success, response = self.run_test(
            "Generate Interview Questions",
            "POST",
            "resume/interview-questions",
            200,
            data={
                "resume_id": self.resume_id
            }
        )
        
        return success and 'technical' in response and 'hr' in response

    def test_pro_upgrade(self):
        """Test upgrading to Pro plan"""
        success, response = self.run_test(
            "Upgrade to Pro",
            "POST",
            "payment/upgrade",
            200
        )
        
        return success and response.get('plan_type') == 'pro'

    def test_admin_stats(self):
        """Test admin statistics endpoint"""
        success, response = self.run_test(
            "Admin Statistics",
            "GET",
            "admin/stats",
            200
        )
        
        return success and 'total_users' in response

    def test_invalid_authentication(self):
        """Test API with invalid token"""
        original_token = self.token
        self.token = "invalid_token_12345"
        
        success, response = self.run_test(
            "Invalid Authentication Test",
            "GET",
            "auth/me",
            401  # Should return unauthorized
        )
        
        # Restore original token
        self.token = original_token
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting HireReady AI API Tests")
        print("=" * 50)
        
        # Authentication Tests
        print("\n📝 Authentication Tests:")
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        self.test_invalid_authentication()
        
        # Resume Analysis Tests
        print("\n📄 Resume Analysis Tests:")
        self.test_resume_analysis()
        
        # Upload second resume to test usage
        pdf_buffer = self.create_test_pdf()
        files = {'file': ('test_resume_2.pdf', pdf_buffer, 'application/pdf')}
        self.run_test("Second Resume Analysis", "POST", "resume/analyze", 200, files=files)
        
        self.test_usage_limit_enforcement()
        self.test_resume_history()
        
        # AI Features Tests
        print("\n🤖 AI Features Tests:")
        self.test_jd_matching()
        self.test_interview_questions()
        
        # Payment Tests
        print("\n💳 Payment Tests:")
        self.test_pro_upgrade()
        
        # Admin Tests
        print("\n👑 Admin Tests:")
        self.test_admin_stats()
        
        # Print Results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            print("\nFailed Tests:")
            for result in self.test_results:
                if result['status'] == 'FAIL':
                    print(f"  - {result['test']}: {result['details']}")
            return 1

def main():
    tester = HireReadyAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())