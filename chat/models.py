from django.conf import settings
from django.db import models


class Chat(models.Model):
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL)

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"Chat {self.pk}"


class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.sender}: {self.content[:20]}"
