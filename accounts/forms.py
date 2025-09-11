from django import forms
from django.contrib.auth.forms import UserCreationForm

from .models import CustomUser


class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = CustomUser
        fields = ("username", "first_name", "last_name", "email", "phone")


class LoginForm(forms.Form):
    identifier = forms.CharField(label="Email or phone")
    password = forms.CharField(widget=forms.PasswordInput)
