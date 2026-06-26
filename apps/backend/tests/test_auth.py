from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token


class AuthTests(APITestCase):
    def setUp(self):
        self.check_email_url = reverse("auth:check-email")
        self.register_url = reverse("auth:register")
        self.login_url = reverse("auth:login")
        self.logout_url = reverse("auth:logout")
        self.profile_url = reverse("auth:profile")
        
        self.user_data = {
            "email": "test@example.com",
            "password": "strongpassword123",
            "fullName": "Test User"
        }
        
    def test_check_email_not_exists(self):
        response = self.client.post(self.check_email_url, {"email": "nonexistent@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["exists"])

    def test_register_and_check_email_exists(self):
        # Register new user
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["email"], "test@example.com")
        self.assertEqual(response.data["user"]["fullName"], "Test User")
        
        # Check email exists now
        response_check = self.client.post(self.check_email_url, {"email": "test@example.com"})
        self.assertTrue(response_check.data["exists"])

    def test_login_success(self):
        # Register first
        self.client.post(self.register_url, self.user_data)
        
        # Try to login
        response = self.client.post(self.login_url, {
            "email": "test@example.com",
            "password": "strongpassword123"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["fullName"], "Test User")

    def test_login_fail(self):
        # Register first
        self.client.post(self.register_url, self.user_data)
        
        # Invalid password
        response = self.client.post(self.login_url, {
            "email": "test@example.com",
            "password": "wrongpassword"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_and_logout(self):
        # Register first to get token
        response = self.client.post(self.register_url, self.user_data)
        token = response.data["token"]
        
        # Access profile with token
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token)
        response_profile = self.client.get(self.profile_url)
        self.assertEqual(response_profile.status_code, status.HTTP_200_OK)
        self.assertEqual(response_profile.data["email"], "test@example.com")
        self.assertEqual(response_profile.data["fullName"], "Test User")
        
        # Logout
        response_logout = self.client.post(self.logout_url)
        self.assertEqual(response_logout.status_code, status.HTTP_200_OK)
        
        # Attempt to access profile again (should fail)
        self.client.credentials()  # clear credentials
        response_profile_after = self.client.get(self.profile_url)
        self.assertEqual(response_profile_after.status_code, status.HTTP_401_UNAUTHORIZED)
