from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.serializers import (
    AddressAutocompleteRequestSerializer,
    AddressAutocompleteResponseSerializer,
    TripRoutingRequestSerializer,
    TripRoutingResponseSerializer,
)
from core.services.geoapify import (
    GeoapifyConfigurationError,
    GeoapifyUpstreamError,
    autocomplete_address,
    route_trip,
)


class GeoapifyAutocompleteView(APIView):
    def post(self, request, format=None):
        serializer = AddressAutocompleteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            results = autocomplete_address(serializer.validated_data)
        except GeoapifyConfigurationError as exc:
            # print(f"Geoapify configuration error: {exc}")
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except GeoapifyUpstreamError as exc:
            # print(f"Geoapify upstream error: {exc}")
            return Response({'detail': str(exc)}, status=exc.status_code)

        response = AddressAutocompleteResponseSerializer({'results': results})
        # print(f"Geoapify autocomplete results: {response.data}")
        return Response(response.data, status=status.HTTP_200_OK)


class GeoapifyTripRoutingView(APIView):
    def post(self, request, format=None):
        serializer = TripRoutingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = route_trip(serializer.validated_data)
        except GeoapifyConfigurationError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except GeoapifyUpstreamError as exc:
            return Response({'detail': str(exc)}, status=exc.status_code)

        response = TripRoutingResponseSerializer(result)
        return Response(response.data, status=status.HTTP_200_OK)
