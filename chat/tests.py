from django.test import TestCase

from accounts.models import CustomUser
from .models import Chat, Message


class ChatTests(TestCase):
    def test_chat_creation(self):
        u1 = CustomUser.objects.create_user(
            username="u1", email="u1@example.com", phone="111", password="pass"
        )
        u2 = CustomUser.objects.create_user(
            username="u2", email="u2@example.com", phone="222", password="pass"
        )
        chat = Chat.objects.create()
        chat.participants.add(u1, u2)
        Message.objects.create(chat=chat, sender=u1, content="hi")
        self.assertEqual(chat.participants.count(), 2)
