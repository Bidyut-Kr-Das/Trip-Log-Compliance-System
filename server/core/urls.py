from django.urls import path

from core.views import (
    HealthCheckView,
    GeoapifyAutocompleteView,
    GeoapifyTripRoutingView,
    GeoapifyTripTimelineView,
)


urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('autocomplete/address/', GeoapifyAutocompleteView.as_view(), name='geoapify-autocomplete'),
    path('routing/trip/', GeoapifyTripRoutingView.as_view(), name='geoapify-trip-routing'),
    path('routing/timeline/', GeoapifyTripTimelineView.as_view(), name='geoapify-trip-timeline'),
]
