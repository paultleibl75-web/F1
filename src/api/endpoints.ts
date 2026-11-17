// ─── OpenF1 API Response Types ───────────────────────────────────────────────

export interface Session {
  session_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  country_code: string;
  country_name: string;
  location: string;
  gmt_offset: string;
  year: number;
  is_cancelled: boolean;
}

export interface Driver {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string | null;
  country_code: string;
}

export interface PositionEntry {
  date: string;
  meeting_key: number;
  session_key: number;
  driver_number: number;
  position: number;
}

export interface IntervalEntry {
  date: string;
  meeting_key: number;
  session_key: number;
  driver_number: number;
  gap_to_leader: string | null;   // "+1.234" or null for leader
  interval: string | null;         // gap to car ahead
}

export interface LocationEntry {
  date: string;
  meeting_key: number;
  session_key: number;
  driver_number: number;
  x: number;
  y: number;
  z: number;
}

export interface CarDataEntry {
  date: string;
  meeting_key: number;
  session_key: number;
  driver_number: number;
  speed: number;        // km/h
  throttle: number;     // 0-100
  brake: number;        // 0 or 1 (boolean from API)
  drs: number;          // 0=off, 8=on, 10=on+speed, 12=on+speed, 14=on
  n_gear: number;       // current gear
  rpm: number;
}

export interface WeatherEntry {
  date: string;
  session_key: number;
  meeting_key: number;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  rainfall: number;
}

export type FlagType =
  | 'GREEN'
  | 'YELLOW'
  | 'DOUBLE YELLOW'
  | 'RED'
  | 'BLUE'
  | 'BLACK AND WHITE'
  | 'CHEQUERED'
  | 'CLEAR'
  | 'SAFETY CAR'
  | 'VIRTUAL SAFETY CAR'
  | 'MEDICAL CAR';

export interface RaceControlEntry {
  date: string;
  meeting_key: number;
  session_key: number;
  driver_number: number | null;
  lap_number: number | null;
  category: string;    // "Flag", "SafetyCar", "DRS", "Other"
  flag: FlagType | string | null;
  scope: string | null;
  sector: number | null;
  message: string;
}

export interface PitEntry {
  date: string;
  meeting_key: number;
  session_key: number;
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;   // seconds
}

export interface StintEntry {
  meeting_key: number;
  session_key: number;
  stint_number: number;
  driver_number: number;
  lap_start: number;
  lap_end: number | null;
  compound: 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET' | 'UNKNOWN';
  tyre_age_at_start: number;
}

export interface TeamRadioEntry {
  date: string;
  meeting_key: number;
  session_key: number;
  driver_number: number;
  recording_url: string;
}

export interface LapsEntry {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
}

// ─── Derived / UI Types ───────────────────────────────────────────────────────

export interface LeaderboardEntry {
  position: number;
  driver: Driver;
  gap_to_leader: string | number | null;
  interval: string | number | null;
  current_stint: StintEntry | null;
  laps_on_tyre: number;
  current_lap: number;
}

export type FlagStatus = 'GREEN' | 'YELLOW' | 'RED' | 'SC' | 'VSC' | 'CLEAR';

export interface NormalisedPosition {
  x: number;  // 0-1
  y: number;  // 0-1
}
