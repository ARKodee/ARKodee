from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch


class AuthTests(APITestCase):
    def setUp(self):
        self.check_email_url = reverse("auth:check-email")
        self.register_url = reverse("auth:register")
        self.login_url = reverse("auth:login")
        self.google_login_url = reverse("auth:google-login")
        self.logout_url = reverse("auth:logout")
        self.profile_url = reverse("auth:profile")
        self.profile_stats_url = reverse("auth:profile-stats")
        
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

    def test_profile_stats_returns_complete_payload(self):
        response = self.client.post(self.register_url, self.user_data)
        token = response.data["token"]

        self.client.credentials(HTTP_AUTHORIZATION="Token " + token)
        response_stats = self.client.get(self.profile_stats_url)

        self.assertEqual(response_stats.status_code, status.HTTP_200_OK)
        self.assertIn("user", response_stats.data)
        self.assertIn("stats", response_stats.data)
        self.assertIn("problem_stats", response_stats.data)
        self.assertIn("activity", response_stats.data)
        self.assertIn("contest_stats", response_stats.data)
        self.assertIn("language_stats", response_stats.data)
        self.assertIn("tag_stats", response_stats.data)
        self.assertIn("earned_badges", response_stats.data)
        self.assertEqual(response_stats.data["user"]["email"], self.user_data["email"])
        self.assertGreaterEqual(len(response_stats.data["earned_badges"]), 2)

    def test_profile_update_changes_name_and_avatar(self):
        response = self.client.post(self.register_url, self.user_data)
        token = response.data["token"]

        self.client.credentials(HTTP_AUTHORIZATION="Token " + token)
        response_update = self.client.patch(
            self.profile_url,
            {
                "fullName": "Updated User",
                "avatar_url": "https://example.com/avatar.png",
            },
            format="json",
        )

        self.assertEqual(response_update.status_code, status.HTTP_200_OK)
        self.assertEqual(response_update.data["user"]["fullName"], "Updated User")
        self.assertEqual(response_update.data["stats"]["avatar_url"], "https://example.com/avatar.png")

    @patch("apps.auth.views.id_token.verify_oauth2_token")
    @patch("apps.auth.views.settings.GOOGLE_OAUTH_CLIENT_ID", "test-google-client-id")
    def test_google_login_creates_new_user(self, mock_verify):
        mock_verify.return_value = {
            "email": "googleuser@example.com",
            "email_verified": True,
            "name": "Google User",
        }

        response = self.client.post(self.google_login_url, {"id_token": "valid-token"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["email"], "googleuser@example.com")
        self.assertTrue(User.objects.filter(email="googleuser@example.com").exists())

    @patch("apps.auth.views.id_token.verify_oauth2_token")
    @patch("apps.auth.views.settings.GOOGLE_OAUTH_CLIENT_ID", "test-google-client-id")
    def test_google_login_existing_user(self, mock_verify):
        user = User.objects.create_user(
            username="existing@example.com",
            email="existing@example.com",
            password="strongpassword123",
            first_name="Existing",
            last_name="User",
        )

        mock_verify.return_value = {
            "email": "existing@example.com",
            "email_verified": True,
            "name": "Existing User",
        }

        response = self.client.post(self.google_login_url, {"id_token": "valid-token"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["email"], "existing@example.com")
        self.assertEqual(User.objects.filter(email="existing@example.com").count(), 1)
        self.assertEqual(response.data["user"]["fullName"], "Existing User")

    @patch("apps.auth.views.id_token.verify_oauth2_token")
    @patch("apps.auth.views.settings.GOOGLE_OAUTH_CLIENT_ID", "test-google-client-id")
    def test_google_login_invalid_token(self, mock_verify):
        mock_verify.side_effect = ValueError("invalid")

        response = self.client.post(self.google_login_url, {"id_token": "bad-token"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
