from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404, redirect, render

from .models import Chat, Message


User = get_user_model()


@login_required
def chat_list(request):
    chats = Chat.objects.filter(participants=request.user)
    return render(request, "chat/list.html", {"chats": chats})


@login_required
def chat_with_user(request, user_id):
    other = get_object_or_404(User, id=user_id)
    chat = Chat.objects.filter(participants=request.user).filter(participants=other).first()
    if chat is None:
        chat = Chat.objects.create()
        chat.participants.add(request.user, other)

    if request.method == "POST":
        content = request.POST.get("content", "").strip()
        if content:
            Message.objects.create(chat=chat, sender=request.user, content=content)
        return redirect("chat_with_user", user_id=other.id)

    messages = Message.objects.filter(chat=chat)
    return render(
        request,
        "chat/detail.html",
        {"chat": chat, "messages": messages, "other": other},
    )

