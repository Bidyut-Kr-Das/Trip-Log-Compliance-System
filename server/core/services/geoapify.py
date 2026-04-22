import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings


class GeoapifyServiceError(Exception):
    pass


class GeoapifyConfigurationError(GeoapifyServiceError):
    pass


class GeoapifyUpstreamError(GeoapifyServiceError):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code


def autocomplete_address(params):
    api_key = getattr(settings, 'GEOAPIFY_API_KEY', '')
    if not api_key:
        raise GeoapifyConfigurationError('Geoapify API key is not configured.')

    query_params = {
        'text': params['text'],
        'apiKey': api_key,
        'format': 'json',
        'limit': params.get('limit', getattr(settings, 'GEOAPIFY_AUTOCOMPLETE_LIMIT', 5)),
    }
    for key in ('type', 'filter', 'bias', 'lang'):
        value = params.get(key)
        if value:
            query_params[key] = value

    timeout = getattr(settings, 'GEOAPIFY_TIMEOUT', 5)
    url = f"https://api.geoapify.com/v1/geocode/autocomplete?{urlencode(query_params)}"
    request = Request(url, headers={'Accept': 'application/json'})

    try:
        with urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        raise GeoapifyUpstreamError('Geoapify autocomplete request failed.', status_code=502) from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise GeoapifyUpstreamError('Geoapify autocomplete request could not be completed.', status_code=504) from exc
    # print(f"Geoapify autocomplete payload: {payload}")
    items = payload.get('results', []) if isinstance(payload, dict) else []
    if not items and isinstance(payload, dict):
        items = payload.get('features', [])

    results = []
    for item in items:
        if not isinstance(item, dict):
            continue

        properties = item.get('properties', item)
        geometry = item.get('geometry', {})
        coordinates = geometry.get('coordinates', []) if isinstance(geometry, dict) else []
        lon = item.get('lon', coordinates[0] if len(coordinates) > 0 else None)
        lat = item.get('lat', coordinates[1] if len(coordinates) > 1 else None)
        results.append(
            {
                'place_id': item.get('place_id') or properties.get('place_id', ''),
                'formatted': item.get('formatted') or properties.get('formatted', ''),
                'lat': lat,
                'lon': lon,
                'city': item.get('city') or properties.get('city', ''),
                'state': item.get('state') or properties.get('state', ''),
                'country': item.get('country') or properties.get('country', ''),
                'postcode': item.get('postcode') or properties.get('postcode', ''),
            }
        )

    return results
