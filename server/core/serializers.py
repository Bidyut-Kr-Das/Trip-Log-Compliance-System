from rest_framework import serializers


class AddressAutocompleteRequestSerializer(serializers.Serializer):
    text = serializers.CharField(min_length=2, max_length=200)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=10)
    type = serializers.ChoiceField(
        required=False,
        choices=(
            'country',
            'state',
            'postcode',
            'city',
            'street',
            'amenity',
        ),
    )
    filter = serializers.CharField(required=False, max_length=200)
    bias = serializers.CharField(required=False, max_length=200)
    lang = serializers.CharField(required=False, max_length=10)


class AddressSuggestionSerializer(serializers.Serializer):
    place_id = serializers.CharField(allow_blank=True, required=False)
    formatted = serializers.CharField(allow_blank=True, required=False)
    lat = serializers.FloatField(required=False, allow_null=True)
    lon = serializers.FloatField(required=False, allow_null=True)
    city = serializers.CharField(allow_blank=True, required=False)
    state = serializers.CharField(allow_blank=True, required=False)
    country = serializers.CharField(allow_blank=True, required=False)
    postcode = serializers.CharField(allow_blank=True, required=False)


class AddressAutocompleteResponseSerializer(serializers.Serializer):
    results = AddressSuggestionSerializer(many=True)


class RoutePointSerializer(serializers.Serializer):
    label = serializers.CharField(required=False, allow_blank=True, max_length=200)
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lon = serializers.FloatField(min_value=-180, max_value=180)


class TripRoutingRequestSerializer(serializers.Serializer):
    current_location = RoutePointSerializer()
    pickup_location = RoutePointSerializer()
    dropoff_location = RoutePointSerializer()
    mode = serializers.ChoiceField(required=False, choices=('drive',), default='drive')
    details = serializers.CharField(required=False, allow_blank=True, max_length=50)


class RouteLegStepSerializer(serializers.Serializer):
    instruction = serializers.JSONField(required=False)
    distance = serializers.FloatField(required=False)
    duration = serializers.FloatField(required=False)
    time = serializers.FloatField(required=False)
    name = serializers.CharField(required=False, allow_blank=True)
    road_class = serializers.CharField(required=False, allow_blank=True)
    surface = serializers.CharField(required=False, allow_blank=True)


class RouteLegSerializer(serializers.Serializer):
    distance = serializers.FloatField(required=False)
    duration = serializers.FloatField(required=False)
    time = serializers.FloatField(required=False)
    steps = RouteLegStepSerializer(many=True, required=False)


class RouteGeometrySerializer(serializers.Serializer):
    type = serializers.CharField()
    coordinates = serializers.JSONField()


class TripRoutingResponseSerializer(serializers.Serializer):
    mode = serializers.CharField()
    distance_meters = serializers.FloatField()
    duration_seconds = serializers.FloatField()
    waypoints = RoutePointSerializer(many=True)
    legs = RouteLegSerializer(many=True)
    geometry = RouteGeometrySerializer()


class TripTimelineRequestSerializer(serializers.Serializer):
    current_location = RoutePointSerializer()
    pickup_location = RoutePointSerializer()
    dropoff_location = RoutePointSerializer()
    mode = serializers.ChoiceField(required=False, choices=('drive',), default='drive')
    timezone = serializers.CharField(required=False, default='UTC', max_length=50)


class TimelineEventSerializer(serializers.Serializer):
    time = serializers.CharField()
    status = serializers.ChoiceField(choices=('off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving'))
    city = serializers.CharField(allow_blank=True, required=False)
    remark = serializers.CharField(allow_blank=True, required=False)


class TimelineDaySerializer(serializers.Serializer):
    date = serializers.CharField()
    timezone = serializers.CharField()
    source = serializers.ChoiceField(choices=('manual', 'eld', 'imported'))
    events = TimelineEventSerializer(many=True)


class TripTimelineResponseSerializer(serializers.Serializer):
    timeline_days = TimelineDaySerializer(many=True)
