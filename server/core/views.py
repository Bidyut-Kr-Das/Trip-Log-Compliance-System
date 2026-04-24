from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.serializers import (
    AddressAutocompleteRequestSerializer,
    AddressAutocompleteResponseSerializer,
    TripRoutingRequestSerializer,
    TripRoutingResponseSerializer,
    TripTimelineRequestSerializer,
    TripTimelineResponseSerializer,
)
from core.services.geoapify import (
    GeoapifyConfigurationError,
    GeoapifyUpstreamError,
    autocomplete_address,
    route_trip,
)
from core.services.eld_timeline import TimelineGenerator


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


class GeoapifyTripTimelineView(APIView):
    def post(self, request, format=None):
        serializer = TripTimelineRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # First, get the route from Geoapify
            route_result = route_trip(serializer.validated_data)
        except GeoapifyConfigurationError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except GeoapifyUpstreamError as exc:
            return Response({'detail': str(exc)}, status=exc.status_code)

        # Then, generate timeline from route
        try:
            timezone = serializer.validated_data.get('timezone', 'UTC')
            generator = TimelineGenerator(timezone=timezone)
            timeline_days = generator.generate_timeline(route_result)
            response_data = {'timeline_days': timeline_days}
        except Exception as exc:
            return Response(
                {'detail': f'Timeline generation failed: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        response = TripTimelineResponseSerializer(response_data)
        return Response(response.data, status=status.HTTP_200_OK)
