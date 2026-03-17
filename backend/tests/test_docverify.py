"""
Test suite for Document Verification API - /api/docverify/verify endpoint
Tests bulk PDF verification against CSV/Excel candidate data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDocVerifyAPI:
    """Document Verification endpoint tests"""
    
    def test_api_root_health(self):
        """Test API root endpoint health check"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "AQIS API Running" in data["message"]

    def test_docverify_with_valid_files(self):
        """Test document verification with valid CSV and PDF files"""
        csv_path = "/tmp/test_csv.csv"
        pdf_john = "/tmp/test_scorecard_john.pdf"
        pdf_jane = "/tmp/test_scorecard_jane.pdf"
        
        with open(csv_path, 'rb') as csv_file, \
             open(pdf_john, 'rb') as pdf1, \
             open(pdf_jane, 'rb') as pdf2:
            
            files = {
                'formdata_file': ('test_csv.csv', csv_file, 'text/csv'),
                'pdf_files': [
                    ('pdf_files', ('test_scorecard_john.pdf', pdf1, 'application/pdf')),
                    ('pdf_files', ('test_scorecard_jane.pdf', pdf2, 'application/pdf'))
                ]
            }
            
            # Use requests with multiple files
            response = requests.post(
                f"{BASE_URL}/api/docverify/verify",
                files=[
                    ('formdata_file', ('test_csv.csv', open(csv_path, 'rb'), 'text/csv')),
                    ('pdf_files', ('test_scorecard_john.pdf', open(pdf_john, 'rb'), 'application/pdf')),
                    ('pdf_files', ('test_scorecard_jane.pdf', open(pdf_jane, 'rb'), 'application/pdf'))
                ]
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "summary" in data
        assert "results" in data
        
        # Verify summary data
        summary = data["summary"]
        assert "total" in summary
        assert "verified" in summary
        assert "needs_review" in summary
        assert "discrepancy" in summary
        assert "missing_document" in summary
        
        # Verify total count matches expected
        assert summary["total"] == 2
        
        # Verify results contain expected candidates
        results = data["results"]
        assert len(results) == 2
        
        # Check each result has required fields
        for result in results:
            assert "name" in result
            assert "status" in result
            assert "fields" in result
            assert result["status"] in ["VERIFIED", "NEEDS_REVIEW", "DISCREPANCY", "MISSING_DOCUMENT"]

    def test_docverify_response_has_match_info(self):
        """Test that verification results contain match method and PDF confidence"""
        csv_path = "/tmp/test_csv.csv"
        pdf_john = "/tmp/test_scorecard_john.pdf"
        pdf_jane = "/tmp/test_scorecard_jane.pdf"
        
        response = requests.post(
            f"{BASE_URL}/api/docverify/verify",
            files=[
                ('formdata_file', ('test_csv.csv', open(csv_path, 'rb'), 'text/csv')),
                ('pdf_files', ('test_scorecard_john.pdf', open(pdf_john, 'rb'), 'application/pdf')),
                ('pdf_files', ('test_scorecard_jane.pdf', open(pdf_jane, 'rb'), 'application/pdf'))
            ]
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for result in data["results"]:
            # Check match method is present
            assert "match_method" in result
            # Check PDF confidence is present
            assert "pdf_confidence" in result
            # Check PDF filename is present
            assert "pdf_filename" in result
            # If matched, should have match_method
            if result["status"] != "MISSING_DOCUMENT":
                assert result["pdf_filename"] is not None

    def test_docverify_field_comparison(self):
        """Test that field comparisons are properly returned"""
        csv_path = "/tmp/test_csv.csv"
        pdf_john = "/tmp/test_scorecard_john.pdf"
        pdf_jane = "/tmp/test_scorecard_jane.pdf"
        
        response = requests.post(
            f"{BASE_URL}/api/docverify/verify",
            files=[
                ('formdata_file', ('test_csv.csv', open(csv_path, 'rb'), 'text/csv')),
                ('pdf_files', ('test_scorecard_john.pdf', open(pdf_john, 'rb'), 'application/pdf')),
                ('pdf_files', ('test_scorecard_jane.pdf', open(pdf_jane, 'rb'), 'application/pdf'))
            ]
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for result in data["results"]:
            if result["status"] != "MISSING_DOCUMENT":
                fields = result["fields"]
                # Check expected field keys exist
                expected_fields = ["cat_reg_no", "varc", "dilr", "qa", "overall"]
                for field in expected_fields:
                    assert field in fields
                    # Each field should have a status value
                    assert fields[field] in ["match", "mismatch", "not_in_pdf", "not_in_form", "both_empty"]

    def test_docverify_missing_csv(self):
        """Test API returns error when CSV file is missing"""
        pdf_john = "/tmp/test_scorecard_john.pdf"
        
        # Only send PDF files, no CSV
        response = requests.post(
            f"{BASE_URL}/api/docverify/verify",
            files=[
                ('pdf_files', ('test_scorecard_john.pdf', open(pdf_john, 'rb'), 'application/pdf'))
            ]
        )
        
        # Should return 422 Unprocessable Entity for missing required field
        assert response.status_code == 422

    def test_docverify_missing_pdfs(self):
        """Test API returns error when PDF files are missing"""
        csv_path = "/tmp/test_csv.csv"
        
        # Only send CSV, no PDFs
        response = requests.post(
            f"{BASE_URL}/api/docverify/verify",
            files=[
                ('formdata_file', ('test_csv.csv', open(csv_path, 'rb'), 'text/csv'))
            ]
        )
        
        # Should return 422 Unprocessable Entity for missing required field
        assert response.status_code == 422


class TestAIAnalyzeAPI:
    """AI Analysis endpoint tests"""
    
    def test_ai_analyze_endpoint_exists(self):
        """Test that AI analyze endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/ai/analyze",
            headers={"Content-Type": "application/json"},
            json={"description": "Test query about admission status"}
        )
        # Should return 200 with AI response or error message about API key
        assert response.status_code == 200
        data = response.json()
        # Either has AI response fields or error field
        assert any(key in data for key in ["summary", "intent", "error"])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
