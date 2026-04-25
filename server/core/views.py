import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import BaseThrottle

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

logger = logging.getLogger(__name__)


class NoThrottle(BaseThrottle):
    """Disable throttling for health check."""
    def allow_request(self, request, view):
        return True


class HealthCheckView(APIView):
    """Health check endpoint for uptime monitoring."""
    throttle_classes = [NoThrottle]

    def get(self, request, format=None):
        logger.info('Health check requested')
        return Response(
            {
                'status': 'healthy',
                'service': 'trip-log-compliance-server',
            },
            status=status.HTTP_200_OK
        )


class GeoapifyAutocompleteView(APIView):
    def post(self, request, format=None):
        serializer = AddressAutocompleteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            results = autocomplete_address(serializer.validated_data)
        except GeoapifyConfigurationError as exc:
            logger.error(f"Geoapify configuration error: {exc}")
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except GeoapifyUpstreamError as exc:
            logger.error(f"Geoapify upstream error: {exc}")
            return Response({'detail': str(exc)}, status=exc.status_code)

        response = AddressAutocompleteResponseSerializer({'results': results})
        logger.debug(f"Geoapify autocomplete results: {response.data}")
        return Response(response.data, status=status.HTTP_200_OK)


class GeoapifyTripRoutingView(APIView):
    def post(self, request, format=None):
        serializer = TripRoutingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = route_trip(serializer.validated_data)
        except GeoapifyConfigurationError as exc:
            logger.error(f"Geoapify configuration error: {exc}")
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except GeoapifyUpstreamError as exc:
            logger.error(f"Geoapify upstream error: {exc}")
            return Response({'detail': str(exc)}, status=exc.status_code)

        response = TripRoutingResponseSerializer(result)
        logger.debug(f"Trip routing completed: {result.get('distance_meters')}m, {result.get('duration_seconds')}s")
        return Response(response.data, status=status.HTTP_200_OK)


class GeoapifyTripTimelineView(APIView):
    def post(self, request, format=None):
        serializer = TripTimelineRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # First, get the route from Geoapify
            route_result = route_trip(serializer.validated_data)
        except GeoapifyConfigurationError as exc:
            logger.error(f"Geoapify configuration error: {exc}")
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except GeoapifyUpstreamError as exc:
            logger.error(f"Geoapify upstream error: {exc}")
            return Response({'detail': str(exc)}, status=exc.status_code)

        # Then, generate timeline from route
        try:
            timezone = serializer.validated_data.get('timezone', 'UTC')
            generator = TimelineGenerator(timezone=timezone)
            timeline_days = generator.generate_timeline(route_result)
            response_data = {'timeline_days': timeline_days}
            logger.info(f"Timeline generated for {len(timeline_days)} day(s), timezone: {timezone}")
        except Exception as exc:
            logger.exception(f"Timeline generation failed: {exc}")
            return Response(
                {'detail': f'Timeline generation failed: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        response = TripTimelineResponseSerializer(response_data)
        return Response(response.data, status=status.HTTP_200_OK)
