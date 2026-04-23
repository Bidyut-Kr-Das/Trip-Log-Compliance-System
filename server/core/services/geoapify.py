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


def route_trip(params):
    api_key = getattr(settings, 'GEOAPIFY_API_KEY', '')
    if not api_key:
        raise GeoapifyConfigurationError('Geoapify API key is not configured.')

    waypoints = [
        params['current_location'],
        params['pickup_location'],
        params['dropoff_location'],
    ]
    waypoint_query = '|'.join(f"{point['lat']},{point['lon']}" for point in waypoints)

    query_params = {
        'waypoints': waypoint_query,
        'mode': params.get('mode', 'drive'),
        'apiKey': api_key,
        'format': 'geojson',
    }

    details = params.get('details')
    if details:
        query_params['details'] = details

    timeout = getattr(settings, 'GEOAPIFY_TIMEOUT', 5)
    url = f"https://api.geoapify.com/v1/routing?{urlencode(query_params)}"
    request = Request(url, headers={'Accept': 'application/json'})

    try:
        with urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        raise GeoapifyUpstreamError('Geoapify routing request failed.', status_code=502) from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise GeoapifyUpstreamError('Geoapify routing request could not be completed.', status_code=504) from exc

    # print(f"Geoapify routing payload: {payload}"    )

    features = payload.get('features', []) if isinstance(payload, dict) else []
    if not features:
        message = payload.get('message', 'Geoapify did not return any routing results.') if isinstance(payload, dict) else 'Geoapify did not return any routing results.'
        raise GeoapifyUpstreamError(message, status_code=502)

    feature = features[0] if isinstance(features[0], dict) else {}
    properties = feature.get('properties', {}) if isinstance(feature, dict) else {}
    geometry = feature.get('geometry', {}) if isinstance(feature, dict) else {}

    legs = properties.get('legs', []) if isinstance(properties, dict) else []

    normalized_waypoints = []
    for point in waypoints:
        normalized_waypoints.append(
            {
                'label': point.get('label', ''),
                'lat': point['lat'],
                'lon': point['lon'],
            }
        )

    normalized_legs = []
    for leg in legs:
        if not isinstance(leg, dict):
            continue
        normalized_legs.append(
            {
                'distance': leg.get('distance', 0),
                'duration': leg.get('duration', leg.get('time', 0)),
                'time': leg.get('time', leg.get('duration', 0)),
                'steps': leg.get('steps', []),
            }
        )

    return {
        'mode': properties.get('mode', params.get('mode', 'drive')),
        'distance_meters': properties.get('distance', 0),
        'duration_seconds': properties.get('time', properties.get('duration', 0)),
        'waypoints': normalized_waypoints,
        'legs': normalized_legs,
        'geometry': geometry,
    }
