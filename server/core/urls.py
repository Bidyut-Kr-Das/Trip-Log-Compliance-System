from django.urls import path

from core.views import GeoapifyAutocompleteView


urlpatterns = [
    path('autocomplete/address/', GeoapifyAutocompleteView.as_view(), name='geoapify-autocomplete'),
]
