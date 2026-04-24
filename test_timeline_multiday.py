#!/usr/bin/env python
"""Test multi-day timeline generation."""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, 'server')
django.setup()

from core.services.eld_timeline import generate_eld_timeline
from core.models import Route

# Create test route: ~1000 miles (should generate 2+ days)
route = Route(
    start_lat=40.7128,  # NYC
    start_lon=-74.0060,
    end_lat=40.4406,    # Pittsburgh
    end_lon=-79.9959,
    distance_miles=1000.0,  # 1000 miles
    duration_seconds=int(1000 / 60 * 3600)  # ~16.7 hours at 60mph
)

# Generate timeline with random start time
current_cycle_hours = 4.5
timeline_response = generate_eld_timeline(
    route=route,
    current_cycle_hours_used=current_cycle_hours,
    start_time=None  # Random
)

print(f"✓ Generated timeline for 1000-mile trip")
print(f"  Number of days: {len(timeline_response['timeline_days'])}")
print(f"  Total hours: {route.duration_seconds / 3600:.1f}")
print()

for i, day in enumerate(timeline_response['timeline_days'], 1):
    print(f"Day {i}: {day['date']}")
    print(f"  Events: {len(day['events'])}")
    for event in day['events'][:3]:  # Show first 3 events
        print(f"    {event['start_time']} - {event['end_time']}: {event['status']}")
    if len(day['events']) > 3:
        print(f"    ... and {len(day['events']) - 3} more events")
    print()

# Verify all times are quarter-hours
all_times_valid = True
for day in timeline_response['timeline_days']:
    for event in day['events']:
        for time_str in [event['start_time'], event['end_time']]:
            hour, minute = map(int, time_str.split(':'))
            if minute not in (0, 15, 30, 45):
                print(f"✗ INVALID TIME: {time_str} (minute={minute})")
                all_times_valid = False

if all_times_valid:
    print("✓ All times are valid quarter-hours!")
else:
    print("✗ Some times are NOT valid quarter-hours")
