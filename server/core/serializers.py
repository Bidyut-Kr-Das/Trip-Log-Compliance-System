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
