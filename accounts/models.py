from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """User model with unique email and phone number."""

    email = models.EmailField("email address", unique=True)
    phone = models.CharField(max_length=20, unique=True)

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.username

