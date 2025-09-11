from django.urls import path

from . import views

urlpatterns = [
    path("", views.chat_list, name="chat_list"),
    path("<int:user_id>/", views.chat_with_user, name="chat_with_user"),
]
