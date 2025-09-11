from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db import models

UserModel = get_user_model()


class EmailOrPhoneBackend(ModelBackend):
    """Authenticate using either email or phone number."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        try:
            user = UserModel.objects.get(models.Q(email=username) | models.Q(phone=username))
        except UserModel.DoesNotExist:
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
