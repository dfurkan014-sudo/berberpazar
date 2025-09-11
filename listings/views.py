from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import ListingForm
from .models import Listing


def listing_list(request):
    listings = Listing.objects.all().order_by("-created_at")
    return render(request, "listings/list.html", {"listings": listings})


@login_required
def listing_create(request):
    if request.method == "POST":
        form = ListingForm(request.POST)
        if form.is_valid():
            listing = form.save(commit=False)
            listing.owner = request.user
            listing.save()
            return redirect("listing_list")
    else:
        form = ListingForm()
    return render(request, "listings/form.html", {"form": form})

