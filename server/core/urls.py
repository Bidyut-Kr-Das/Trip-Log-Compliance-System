from django.urls import path

from core.views import GeoapifyAutocompleteView, GeoapifyTripRoutingView


urlpatterns = [
    path('autocomplete/address/', GeoapifyAutocompleteView.as_view(), name='geoapify-autocomplete'),
    path('routing/trip/', GeoapifyTripRoutingView.as_view(), name='geoapify-trip-routing'),
]
