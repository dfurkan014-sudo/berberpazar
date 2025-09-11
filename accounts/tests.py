from django.test import TestCase

from .models import CustomUser


class UserModelTests(TestCase):
    def test_create_user(self):
        user = CustomUser.objects.create_user(
            username="user1",
            email="u1@example.com",
            phone="1234567890",
            password="testpass",
        )
        self.assertEqual(user.email, "u1@example.com")
