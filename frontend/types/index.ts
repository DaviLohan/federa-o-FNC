// User Types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_type: 'PLAYER' | 'TEAM_OWNER' | 'SUPERVISOR' | 'ADMIN';
  user_type_display: string;
  platform: 'PS' | 'XBOX' | 'PC';
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  player_profile: PlayerProfile | null;
  team_owner_profile: TeamOwnerProfile | null;
}

export interface PlayerProfile {
  id: number;
  player_name: string;
  gamer_tag: string;
  shirt_number: number;
  primary_position: string;
  secondary_position?: string;
  birth_date: string;
  whatsapp: string;
  country: string;
  language: string;
  avatar?: string;
  is_active: boolean;
  total_games: number;
  total_goals: number;
  total_assists: number;
  win_rate: number;
}

export interface TeamOwnerProfile {
  id: number;
  bio: string;
  avatar?: string;
  is_active: boolean;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  user_type: 'PLAYER';
  platform: 'PS' | 'XBOX' | 'PC';
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: User;
}

// Team Types
export interface Team {
  id: number;
  name: string;
  abbreviation: string;
  logo?: string;
  description: string;
  foundation_date: string;
  owner: User;
  player_count: number;
  has_active_championship: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  id: number;
  team: Team;
  player: PlayerProfile;
  role: 'OWNER' | 'CAPTAIN' | 'PLAYER';
  role_display: string;
  is_active: boolean;
  joined_at: string;
  left_at?: string;
}

// Championship Types
export interface Enrollment {
  id: number;
  championship: Championship;
  team: Team;
  enrolled_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  payment_status: 'PENDING' | 'PAID' | 'REFUNDED';
}

// Invitation Types
export interface TeamInvitation {
  id: number;
  team: Team;
  team_id: number;
  player: PlayerProfile;
  player_id: number;
  invited_by: User;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  status_display: string;
  created_at: string;
  responded_at: string | null;
}

export interface InvitePlayerRequest {
  player_id: number;
  message?: string;
}

export interface PlayerSearchResult {
  id: number;
  player_name: string;
  gamer_tag: string;
  user_email: string;
  avatar?: string | null;
  primary_position: string;
  primary_position_display: string;
  country: string;
  is_active: boolean;
}

export interface Championship {
  id: number;
  name: string;
  description: string;
  rules: string;
  championship_type: 'KNOCKOUT' | 'LEAGUE' | 'GROUPS_KNOCKOUT';
  banner?: string;
  logo?: string;
  enrollment_start: string;
  enrollment_end: string;
  start_date: string;
  end_date?: string;
  enrollment_fee: string;
  prize_pool: string;
  max_teams?: number;
  min_teams: number;
  number_of_winners: number;
  num_groups?: number;
  teams_per_group?: number;
  qualified_per_group?: number;
  has_third_place_match?: boolean;
  tiebreak_criteria?: string[];
  current_phase?: 'GROUPS' | 'KNOCKOUT' | 'FINISHED';
  status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  is_enrollment_open: boolean;
  enrolled_teams_count: number;
  created_at: string;
  updated_at: string;
}

// Match Types
export interface Match {
  id: number;
  home_team: Team;
  away_team: Team;
  championship?: Championship;
  match_type: 'FRIENDLY' | 'CHAMPIONSHIP' | 'PLAYOFF' | 'FINAL';
  round_number?: number;
  scheduled_date: string;
  started_at?: string;
  finished_at?: string;
  home_score: number;
  away_score: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | 'CONTESTED';
  winner?: Team;
  is_draw: boolean;
  duration_minutes: number;
}

export interface MatchReport {
  id: number;
  match: Match;
  reported_by: User;
  screenshot: string;
  notes: string;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  approved_by?: User;
  approved_at?: string;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: number;
  match: number;
  scorer: PlayerProfile;
  team: Team;
  minute: number;
  goal_type: 'REGULAR' | 'PENALTY' | 'FREE_KICK' | 'HEADER' | 'VOLLEY' | 'OWN_GOAL';
  created_at: string;
}

export interface Card {
  id: number;
  match: number;
  player: PlayerProfile;
  team: Team;
  card_type: 'YELLOW' | 'RED';
  minute: number;
  reason: string;
  created_at: string;
}

// Group Types
export interface Group {
  id: number;
  championship: number;
  name: string;
  order: number;
  standings?: GroupStandings[];
  created_at?: string;
}

export interface GroupStandings {
  id: number;
  group: number;
  team: Team;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  position: number | null;
  qualified: boolean;
  updated_at: string;
}

export interface Contestation {
  id: number;
  match: Match;
  contested_by: User;
  team: Team;
  reason: 'WRONG_SCORE' | 'MISSING_PLAYER' | 'FAKE_SCREENSHOT' | 'OPPONENT_QUIT' | 'CONNECTION_ISSUE' | 'OTHER';
  reason_display?: string;
  description: string;
  evidence?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
  status_display?: string;
  response: string;
  reviewed_by?: User;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// Championship-related Types
export interface Standings {
  id: number;
  championship: Championship;
  team: Team;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  updated_at: string;
}

export interface Bracket {
  id: number;
  championship: Championship;
  structure: BracketStructure;
  created_at: string;
  updated_at: string;
}

export interface BracketStructure {
  rounds: BracketRound[];
}

export interface BracketRound {
  round_number: number;
  round_name: string;
  matches: BracketMatch[];
}

export interface BracketMatch {
  match_id?: number;
  team1?: Team;
  team2?: Team;
  winner?: Team;
  score?: string;
}

// Statistics Types
export interface PlayerStatistics {
  id: number;
  player: PlayerProfile;
  championship: Championship;
  team: Team;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played: number;
  clean_sheets: number;
  average_rating: string;
  goals_per_match: number;
  assists_per_match: number;
  goal_contributions: number;
  win_rate: number;
}

export interface TeamStatistics {
  id: number;
  team: Team;
  championship: Championship;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  goals_scored: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  clean_sheets: number;
  biggest_win_margin: number;
  biggest_loss_margin: number;
  current_win_streak: number;
  longest_win_streak: number;
  current_unbeaten_streak: number;
  longest_unbeaten_streak: number;
  goal_difference: number;
  points: number;
  win_rate: number;
  goals_per_match: number;
  goals_conceded_per_match: number;
  clean_sheet_rate: number;
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface APIError {
  error?: string;
  detail?: string;
  [key: string]: any;
}
