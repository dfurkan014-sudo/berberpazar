from django.test import TestCase

from accounts.models import CustomUser
from .models import Listing


class ListingTests(TestCase):
    def test_create_listing(self):
        user = CustomUser.objects.create_user(
            username="user1", email="u1@example.com", phone="123456", password="pass"
        )
        listing = Listing.objects.create(owner=user, title="Item", description="desc", price=10)
        self.assertEqual(listing.owner, user)
