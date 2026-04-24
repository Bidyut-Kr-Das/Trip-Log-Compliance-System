"""
ELD Timeline Generation Service

Generates compliant ELD daily log timelines from trip routing data.
Enforces FMCSA Hours of Service regulations:
- 11-hour driving cap after qualifying rest
- 14-hour duty window cap
- 30-minute break after 8 cumulative driving hours
- 70-hour / 8-day cycle cap
- 10 consecutive hours off/sleeper to reset duty window
- Fuel stop at least once per 1000 miles
"""

from datetime import datetime, timedelta
from typing import TypedDict, Literal
import random
import math


ELDDutyStatus = Literal['off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving']


class TimelineEvent(TypedDict, total=False):
    """Event in a duty timeline."""
    time: str  # "HH:MM" format
    status: ELDDutyStatus
    city: str
    remark: str


class TimelineDay(TypedDict, total=False):
    """Single day of timeline data for a 24-hour log sheet."""
    date: str  # "YYYY-MM-DD"
    timezone: str
    source: Literal['manual', 'eld', 'imported']
    events: list[TimelineEvent]


class RouteData(TypedDict, total=False):
    """Route data from Geoapify trip routing."""
    mode: str
    distance_meters: float
    duration_seconds: float
    waypoints: list[dict]  # current, pickup, dropoff
    legs: list[dict]  # [current->pickup, pickup->dropoff, dropoff->...]


class TimelineGenerator:
    """Core timeline generation engine with ELD compliance logic."""

    # Constants (in minutes for internal calculations)
    DRIVING_CAP_MINUTES = 11 * 60  # 11 hours
    DUTY_WINDOW_MINUTES = 14 * 60  # 14 hours
    CUMULATIVE_DRIVE_THRESHOLD_MINUTES = 8 * 60  # 8 hours before break required
    BREAK_DURATION_MINUTES = 30
    QUALIFYING_REST_MINUTES = 10 * 60  # 10 consecutive hours
    CYCLE_LIMIT_MINUTES = 70 * 60  # 70 hours
    CYCLE_WINDOW_DAYS = 8
    FUEL_INTERVAL_MILES = 1000

    # Operation durations
    PICKUP_DURATION_MINUTES = 60
    DROPOFF_DURATION_MINUTES = 60

    def __init__(self, timezone: str = 'UTC'):
        self.timezone = timezone

    def generate_timeline(
        self,
        route_data: RouteData,
        start_datetime_override: datetime | None = None,
    ) -> list[TimelineDay]:
        """
        Generate timeline events from trip routing data.

        Args:
            route_data: Route information including legs and waypoints from Geoapify
            start_datetime_override: Optional override for start time; if None, random time chosen

        Returns:
            List of timeline days, each with events split at midnight boundaries
        """
        # Determine start time
        if start_datetime_override:
            start_dt = start_datetime_override
        else:
            start_dt = self._generate_random_start_time()

        # Extract trip segments
        legs = route_data.get('legs', [])
        waypoints = route_data.get('waypoints', [])
        total_distance_miles = route_data.get('distance_meters', 0) * 0.000621371

        # Build event list with ELD compliance
        events_absolute = self._build_compliant_timeline(
            start_dt=start_dt,
            legs=legs,
            waypoints=waypoints,
            total_distance_miles=total_distance_miles,
        )

        # Split events by calendar day (00:00 to 24:00)
        timeline_days = self._split_events_by_day(events_absolute)
        print(timeline_days)

        return timeline_days

    def _generate_random_start_time(self) -> datetime:
        """Generate random start time at 15-minute increments."""
        quarters = [0, 15, 30, 45]
        hour = random.randint(0, 23)
        minute = random.choice(quarters)
        now = datetime.now()
        return now.replace(hour=hour, minute=minute, second=0, microsecond=0)

    def _build_compliant_timeline(
        self,
        start_dt: datetime,
        legs: list[dict],
        waypoints: list[dict],
        total_distance_miles: float,
    ) -> list[tuple[datetime, ELDDutyStatus, str | None, str | None]]:
        """
        Build timeline events enforcing ELD compliance rules.
        
        Waypoints: [current_location, pickup_location, dropoff_location]
        Legs: [current->pickup leg, pickup->dropoff leg]

        Returns:
            List of (datetime, status, city, remark) tuples in chronological order
        """
        events = []
        current_dt = start_dt

        # Cumulative counters within current duty period
        driving_minutes_since_rest = 0
        duty_minutes_since_start = 0
        cumulative_driving_since_break = 0
        distance_since_fuel = 0

        # === Segment 1: Pre-trip inspection at current location ===
        current_city = waypoints[0].get('label', '') if waypoints else ''
        events.append((current_dt, 'on_duty_not_driving', current_city, 'Pre-trip inspection'))
        current_dt += timedelta(minutes=self.PICKUP_DURATION_MINUTES)
        duty_minutes_since_start += self.PICKUP_DURATION_MINUTES

        # === Segment 2: Drive from current to pickup location ===
        if legs and len(legs) > 0:
            leg_1 = legs[0]
            leg_1_distance_miles = leg_1.get('distance', 0) * 0.000621371
            leg_1_duration_minutes = leg_1.get('duration', leg_1.get('time', 0)) / 60

            current_dt, driving_minutes_since_rest, duty_minutes_since_start, cumulative_driving_since_break, distance_since_fuel = self._process_driving_leg(
                events=events,
                current_dt=current_dt,
                leg_distance_miles=leg_1_distance_miles,
                leg_duration_minutes=leg_1_duration_minutes,
                driving_minutes_since_rest=driving_minutes_since_rest,
                duty_minutes_since_start=duty_minutes_since_start,
                cumulative_driving_since_break=cumulative_driving_since_break,
                distance_since_fuel=distance_since_fuel,
            )

        # === Segment 3: Pickup operations ===
        pickup_city = waypoints[1].get('label', '') if waypoints and len(waypoints) > 1 else ''
        events.append((current_dt, 'on_duty_not_driving', pickup_city, 'Pickup'))
        current_dt += timedelta(minutes=self.PICKUP_DURATION_MINUTES)
        duty_minutes_since_start += self.PICKUP_DURATION_MINUTES

        # === Segment 4: Drive from pickup to dropoff location ===
        if legs and len(legs) > 1:
            leg_2 = legs[1]
            leg_2_distance_miles = leg_2.get('distance', 0) * 0.000621371
            leg_2_duration_minutes = leg_2.get('duration', leg_2.get('time', 0)) / 60

            current_dt, driving_minutes_since_rest, duty_minutes_since_start, cumulative_driving_since_break, distance_since_fuel = self._process_driving_leg(
                events=events,
                current_dt=current_dt,
                leg_distance_miles=leg_2_distance_miles,
                leg_duration_minutes=leg_2_duration_minutes,
                driving_minutes_since_rest=driving_minutes_since_rest,
                duty_minutes_since_start=duty_minutes_since_start,
                cumulative_driving_since_break=cumulative_driving_since_break,
                distance_since_fuel=distance_since_fuel,
            )

        # === Segment 5: Dropoff operations ===
        dropoff_city = waypoints[2].get('label', '') if waypoints and len(waypoints) > 2 else ''
        events.append((current_dt, 'on_duty_not_driving', dropoff_city, 'Dropoff'))
        current_dt += timedelta(minutes=self.DROPOFF_DURATION_MINUTES)

        # === End of shift: transition to off-duty ===
        events.append((current_dt, 'off_duty', None, 'End of shift'))

        return events

    def _process_driving_leg(
        self,
        events: list,
        current_dt: datetime,
        leg_distance_miles: float,
        leg_duration_minutes: float,
        driving_minutes_since_rest: int,
        duty_minutes_since_start: int,
        cumulative_driving_since_break: int,
        distance_since_fuel: float,
    ) -> tuple[datetime, int, int, int, float]:
        """
        Process a single driving leg with compliance checks.
        All durations are quantized to 15-minute increments for timeline alignment.
        
        Returns:
            (updated_dt, updated_driving_since_rest, updated_duty_start, 
             updated_cumulative_break, updated_distance_since_fuel)
        """
        # Quantize total leg duration to 15-minute boundaries
        remaining_duration_quarters = int(leg_duration_minutes / 15)
        miles_per_quarter = leg_distance_miles / remaining_duration_quarters if remaining_duration_quarters > 0 else 0

        while remaining_duration_quarters > 0:
            # Check if we need mandatory break (8-hour cumulative driving threshold)
            if cumulative_driving_since_break >= self.CUMULATIVE_DRIVE_THRESHOLD_MINUTES:
                events.append((current_dt, 'off_duty', None, '30-minute mandatory break'))
                current_dt += timedelta(minutes=self.BREAK_DURATION_MINUTES)
                cumulative_driving_since_break = 0
                # Break counts toward duty window but not driving cap
                duty_minutes_since_start += self.BREAK_DURATION_MINUTES

            # Check if we need qualifying rest (11-hour driving or 14-hour window)
            if (driving_minutes_since_rest >= self.DRIVING_CAP_MINUTES or
                duty_minutes_since_start >= self.DUTY_WINDOW_MINUTES):
                events.append((current_dt, 'off_duty', None, 'Qualifying rest (10 hours)'))
                current_dt += timedelta(minutes=self.QUALIFYING_REST_MINUTES)
                driving_minutes_since_rest = 0
                duty_minutes_since_start = 0
                cumulative_driving_since_break = 0
                distance_since_fuel = 0  # Reset fuel counter on rest

            # Check if fuel stop needed
            if distance_since_fuel >= self.FUEL_INTERVAL_MILES:
                events.append((current_dt, 'on_duty_not_driving', None, 'Fuel stop'))
                current_dt += timedelta(minutes=30)
                duty_minutes_since_start += 30
                distance_since_fuel = 0

            # Calculate how many 15-minute quarters we can drive before hitting constraints
            # Convert all minute limits to quarter units
            quarters_until_driving_cap = (self.DRIVING_CAP_MINUTES - driving_minutes_since_rest) // 15
            quarters_until_duty_window = (self.DUTY_WINDOW_MINUTES - duty_minutes_since_start) // 15
            quarters_until_break_required = (self.CUMULATIVE_DRIVE_THRESHOLD_MINUTES - cumulative_driving_since_break) // 15

            can_drive_quarters = min(
                remaining_duration_quarters,
                max(1, quarters_until_driving_cap),
                max(1, quarters_until_duty_window),
                max(1, quarters_until_break_required),
            )

            # Ensure at least 1 quarter (15 minutes)
            can_drive_quarters = max(1, can_drive_quarters)

            # Add driving segment
            events.append((current_dt, 'driving', None, 'En route'))
            current_dt += timedelta(minutes=can_drive_quarters * 15)

            # Update counters
            can_drive_minutes = can_drive_quarters * 15
            segment_distance = miles_per_quarter * can_drive_quarters
            driving_minutes_since_rest += can_drive_minutes
            duty_minutes_since_start += can_drive_minutes
            cumulative_driving_since_break += can_drive_minutes
            distance_since_fuel += segment_distance
            remaining_duration_quarters -= can_drive_quarters

        return current_dt, driving_minutes_since_rest, duty_minutes_since_start, cumulative_driving_since_break, distance_since_fuel

    def _split_events_by_day(
        self,
        events_absolute: list[tuple[datetime, ELDDutyStatus, str | None, str | None]],
    ) -> list[TimelineDay]:
        """
        Split absolute-time events into daily log sheets.
        Each sheet covers a calendar day from 00:00 to 24:00.
        """
        if not events_absolute:
            return []

        # Group events by calendar day
        day_groups: dict[str, list[tuple[datetime, ELDDutyStatus, str | None, str | None]]] = {}

        for event_dt, status, city, remark in events_absolute:
            date_key = event_dt.strftime('%Y-%m-%d')
            if date_key not in day_groups:
                day_groups[date_key] = []
            day_groups[date_key].append((event_dt, status, city, remark))

        # Convert each day group to TimelineDay
        timeline_days = []
        for date_key in sorted(day_groups.keys()):
            day_events = day_groups[date_key]
            timeline_day = self._convert_day_events_to_timeline(date_key, day_events)
            timeline_days.append(timeline_day)

        return timeline_days

    def _convert_day_events_to_timeline(
        self,
        date_key: str,
        day_events: list[tuple[datetime, ELDDutyStatus, str | None, str | None]],
    ) -> TimelineDay:
        """
        Convert a day's absolute-time events to TimelineDay with local HH:MM times.
        Normalizes all times to 15-minute boundaries for frontend compatibility.
        """
        events_list: list[TimelineEvent] = []

        for event_dt, status, city, remark in day_events:
            # Normalize to nearest quarter-hour (floor to guarantee it's valid for parseTimeToQuarter)
            minute = event_dt.minute
            normalized_minute = (minute // 15) * 15
            normalized_dt = event_dt.replace(minute=normalized_minute)
            time_str = normalized_dt.strftime('%H:%M')

            event: TimelineEvent = {
                'time': time_str,
                'status': status,
            }
            if city:
                event['city'] = city
            if remark:
                event['remark'] = remark

            events_list.append(event)

        timeline_day: TimelineDay = {
            'date': date_key,
            'timezone': self.timezone,
            'source': 'eld',
            'events': events_list,
        }

        return timeline_day
