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
  cpf: string | null;
  is_active: boolean;
  is_email_verified: boolean;
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
  // Campos expostos pelo PlayerProfileListSerializer (contexto de membership/listagem)
  user_id?: number;
  user_email?: string;
  primary_position_display?: string;
}

export interface TeamOwnerProfile {
  id: number;
  bio: string;
  avatar?: string;
  is_active: boolean;
}

export interface TeamPerformanceSummary {
  team_id: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
  goal_difference: number;
  win_rate: number;
  clean_sheets: number;
  advanced_matches: number;
  basic_matches: number;
  avg_team_rating: number | null;
  passes_made: number;
  pass_attempts: number;
  pass_accuracy: number | null;
  tackles_made: number;
  tackle_attempts: number;
  tackle_accuracy: number | null;
  saves: number;
}

export interface TeamPerformancePlayer {
  player_id: number | null;
  player_name: string;
  position: string;
  matches_played: number;
  advanced_matches: number;
  basic_matches: number;
  average_rating: number | null;
  goals: number;
  assists: number;
  goal_contributions: number;
  passes_made: number;
  passes_missed: number;
  pass_accuracy: number | null;
  tackles_made: number;
  tackles_missed: number;
  tackle_accuracy: number | null;
  saves: number;
  cards: number;
  has_advanced_data: boolean;
}

export interface TeamPerformanceMatch {
  match_id: number;
  played_at: string;
  opponent: {
    id: number;
    name: string;
    abbreviation: string;
    logo?: string | null;
  };
  championship: { id: number; name: string } | null;
  context: 'championship' | 'friendly';
  result: 'W' | 'D' | 'L';
  goals_scored: number;
  goals_conceded: number;
  clean_sheet: boolean;
  has_advanced_data: boolean;
  advanced_players: number;
  lineup_players: number;
  average_rating: number | null;
  passes_made: number;
  pass_attempts: number;
  pass_accuracy: number | null;
  tackles_made: number;
  tackle_attempts: number;
  tackle_accuracy: number | null;
  saves: number;
}

export interface TeamPerformancePayload {
  summary: TeamPerformanceSummary;
  leaders: {
    best_rating?: TeamPerformancePlayer | null;
    top_scorer?: TeamPerformancePlayer | null;
    top_assister?: TeamPerformancePlayer | null;
    best_passer?: TeamPerformancePlayer | null;
    best_tackler?: TeamPerformancePlayer | null;
    most_matches?: TeamPerformancePlayer | null;
  };
  players: TeamPerformancePlayer[];
  matches: TeamPerformanceMatch[];
  filters: {
    championships: { id: number; name: string }[];
  };
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

// Login 403 — email não verificado
export interface LoginRequiresVerificationResponse {
  error: string;
  requires_verification: true;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  user_type: 'PLAYER';
  platform: 'PS' | 'XBOX' | 'PC';
  // Campos do perfil de jogador
  player_name?: string;
  gamer_tag?: string;
  shirt_number?: number;
  primary_position?: string;
  secondary_position?: string;
  birth_date?: string;
  whatsapp?: string;
  country?: string;
  language?: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

// Verificação de email
export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  message: string;
  token: string;
  user: User;
}

// Reenvio de código de verificação
export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

// Esqueci minha senha
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

// Redefinição de senha
export interface ResetPasswordRequest {
  email: string;
  code: string;
  new_password: string;
  new_password_confirm: string;
}

export interface ResetPasswordResponse {
  message: string;
}

// Team Types
export interface TeamEAClub {
  ea_club_id: string;
  platform: 'common-gen5' | 'common-gen4' | 'pc';
  platform_display?: string;
  name: string;
}

export interface TeamLineupStyle {
  outfield_primary: string;
  outfield_secondary: string;
  goalkeeper_primary: string;
  text_color: string;
  accent_color: string;
  title: string;
  subtitle: string;
}

export interface EAClubSearchResult {
  ea_club_id: string;
  name: string;
  clubId?: string | number;
  clubName?: string;
  members?: number | string;
  wins?: number | string;
  losses?: number | string;
  ties?: number | string;
  overallRank?: number | string;
  skillRating?: number | string;
  already_linked?: boolean;
  existing_team?: {
    id: number;
    name: string;
  } | null;
}

export interface Team {
  id: number;
  name: string;
  abbreviation: string;
  logo?: string;
  description: string;
  foundation_date: string;
  owner: User;
  ea_club?: TeamEAClub | null;
  lineup_visual_preferences?: TeamLineupStyle;
  player_count: number;
  has_active_championship: boolean;
  members?: TeamMembership[];
  formations?: Formation[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormationPosition {
  id: number;
  player?: PlayerProfile;
  position: string;
  x_position: number;
  y_position: number;
}

export interface Formation {
  id: number;
  name: string;
  schema: string;
  schema_display?: string;
  is_default: boolean;
  positions?: FormationPosition[];
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
  status: 'PENDING_PAYMENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  payment?: Payment | null;
}

export interface Payment {
  id: number;
  team: number;
  team_name: string;
  championship: number;
  championship_name: string;
  amount: string;
  provider: 'MERCADO_PAGO';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  gateway_payment_id?: string | null;
  gateway_external_reference?: string | null;
  pix_qr_code_text: string;
  pix_qr_code_base64: string;
  ticket_url?: string;
  expires_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrollmentCheckoutResponse {
  message: string;
  requires_payment: boolean;
  enrollment: Enrollment;
  payment: Payment | null;
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

// Leave Request Types
export interface TeamLeaveRequest {
  id: number;
  team: Team;
  player: PlayerProfile;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  status_display: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: User | null;
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
  game_days?: string[];
  game_start_time?: string;
  game_end_time?: string;
  status: 'SCHEDULED' | 'OPEN' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  is_enrollment_open: boolean;
  enrolled_teams_count: number;
  enrollments?: Enrollment[];
  standings?: Standings[] | null;
  bracket?: Bracket | null;
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
  status: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | 'CONTESTED';
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

// ---------------------------------------------------------------------------
// Match Lineup Types — Escalação tática por partida
// ---------------------------------------------------------------------------

/** Dados de um único jogador no payload de criação de escalação (input). */
export interface MatchLineupPlayerData {
  player_id: number;
  position: string;
  x_position: number;
  y_position: number;
}

/** Payload completo do POST /api/v1/matches/<match_id>/lineup/ */
export interface SubmitLineupRequest {
  formation: string;
  players: MatchLineupPlayerData[];
}

/** Jogador serializado na resposta da escalação (output). */
export interface MatchLineupPlayer {
  player: PlayerProfile;
  position: string;
  x_position: number;
  y_position: number;
}

/** Escalação completa retornada pelo backend (output). */
export interface MatchLineup {
  id: number;
  /** ID da partida (não o objeto expandido) */
  match: number;
  team: Team;
  formation: string;
  submitted_by: User;
  players: MatchLineupPlayer[];
  created_at: string;
  updated_at: string;
}

/** As 7 formações disponíveis no TacticalBoard — mantido em sync com o backend. */
export type TacticalFormation =
  | '4-3-3'
  | '4-2-3-1'
  | '4-4-2'
  | '5-3-2'
  | '3-5-2'
  | '4-3-2-1'
  | '4-1-2-1-2'
  | '4-3-3(4)';


// ─── EA Report (Reportar Partida via EA API) ──────────────────────────────────

/** Jogador interno vinculado a gamertag EA. */
export interface EAReportMatchedPlayer {
  id: number;
  player_name: string;
  gamer_tag: string | null;
}

/** Jogador na partida EA com stats e match com roster interno. */
export interface EAReportPlayer {
  gamertag: string;
  position: string;
  rating: string;
  goals: number;
  assists: number;
  red_cards: number;
  saves: number;
  passes_made: number;
  pass_attempts: number;
  shots: number;
  tackles_made: number;
  tackle_attempts: number;
  seconds_played: number;
  is_disconnected: boolean;
  matched_player: EAReportMatchedPlayer | null;
}

/** Time no preview do report EA. */
export interface EAReportTeam {
  team_id: number;
  team_name: string;
  ea_club_name: string;
  score: number;
  players: EAReportPlayer[];
}

/** Warning de validação no report EA. */
export interface EAReportWarning {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
}

/** Preview completo do report EA retornado pelo backend. */
export interface EAReportPreview {
  ea_match_id: number;
  ea_match_id_external: string;
  played_at: string;
  validation_status: string;
  home_team: EAReportTeam;
  away_team: EAReportTeam;
  warnings: EAReportWarning[];
  can_confirm: boolean;
}

/** Request para contestar um report EA. */
export interface EAReportContestRequest {
  ea_match_id: number;
  reason: string;
  description: string;
}
