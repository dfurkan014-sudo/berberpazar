from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import CustomUserCreationForm, LoginForm


def signup(request):
    if request.method == "POST":
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("listing_list")
    else:
        form = CustomUserCreationForm()
    return render(request, "accounts/signup.html", {"form": form})


def login_view(request):
    form = LoginForm(request.POST or None)
    message = ""
    if request.method == "POST" and form.is_valid():
        identifier = form.cleaned_data["identifier"]
        password = form.cleaned_data["password"]
        user = authenticate(request, username=identifier, password=password)
        if user is not None:
            login(request, user)
            return redirect("listing_list")
        message = "Invalid credentials"
    return render(request, "accounts/login.html", {"form": form, "message": message})

