import { apiClient } from './api-client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  User,
  PlayerProfile,
  Team,
  TeamMembership,
  Championship,
  Enrollment,
  TeamInvitation,
  TeamLeaveRequest,
  InvitePlayerRequest,
  PlayerSearchResult,
  Match,
  PlayerStatistics,
  TeamStatistics,
  PaginatedResponse,
  EAClubSearchResult,
  Contestation,
  MatchReport,
  Group,
  Bracket,
  MatchLineup,
  SubmitLineupRequest,
  Payment,
  EnrollmentCheckoutResponse,
  EAReportPreview,
  EAReportContestRequest,
} from '@/types';

// Auth API
export const authAPI = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/v1/users/login/', data),
  
  register: (data: RegisterRequest) =>
    apiClient.post<RegisterResponse>('/api/v1/users/', data),
  
  logout: () =>
    apiClient.post('/api/v1/users/logout/'),
  
  getCurrentUser: () =>
    apiClient.get<User>('/api/v1/users/me/'),

  verifyEmail: (data: VerifyEmailRequest) =>
    apiClient.post<VerifyEmailResponse>('/api/v1/auth/verify-email/', data),

  resendVerification: (data: ResendVerificationRequest) =>
    apiClient.post<ResendVerificationResponse>('/api/v1/auth/resend-verification/', data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<ForgotPasswordResponse>('/api/v1/auth/forgot-password/', data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<ResetPasswordResponse>('/api/v1/auth/reset-password/', data),
};

// Users API
export const usersAPI = {
  getAll: (params?: any) =>
    apiClient.get<PaginatedResponse<User>>('/api/v1/users/', params),

  getMe: () =>
    apiClient.get<User>('/api/v1/users/me/'),

  updateMe: (data: Partial<User>) =>
    apiClient.patch<User>('/api/v1/users/me/', data),

  getById: (id: number) =>
    apiClient.get<User>(`/api/v1/users/${id}/`),

  updateProfile: (id: number, data: Partial<User>) =>
    apiClient.patch<User>(`/api/v1/users/${id}/`, data),

  deleteAccount: (id: number) =>
    apiClient.delete<{ message: string }>(`/api/v1/users/${id}/`),
};

// Player Profiles API
export const playerProfilesAPI = {
  getAll: (params?: any) =>
    apiClient.get<PaginatedResponse<PlayerProfile>>('/api/v1/player-profiles/', params),

  getById: (id: number) =>
    apiClient.get<PlayerProfile>(`/api/v1/player-profiles/${id}/`),
  
  update: (id: number, data: Partial<PlayerProfile>) =>
    apiClient.patch<PlayerProfile>(`/api/v1/player-profiles/${id}/`, data),
  
  updateWithFile: (id: number, formData: FormData) =>
    apiClient.upload<PlayerProfile>(`/api/v1/player-profiles/${id}/`, formData, 'patch'),
};

// Teams API
export const teamsAPI = {
  getAll: (params?: any) =>
    apiClient.get<PaginatedResponse<Team>>('/api/v1/teams/', params),
  
  getById: (id: number) =>
    apiClient.get<Team>(`/api/v1/teams/${id}/`),
  
  create: (data: Partial<Team>) =>
    apiClient.post<Team>('/api/v1/teams/', data),

  createWithFile: (formData: FormData) =>
    apiClient.upload<Team>('/api/v1/teams/', formData, 'post'),
  
  update: (id: number, data: Partial<Team>) =>
    apiClient.put<Team>(`/api/v1/teams/${id}/`, data),
  
  updateWithFile: (id: number, formData: FormData) =>
    apiClient.upload<Team>(`/api/v1/teams/${id}/`, formData, 'put'),
  
  delete: (id: number) =>
    apiClient.delete(`/api/v1/teams/${id}/`),
  
  getMembers: (id: number) =>
    apiClient.get<TeamMembership[]>(`/api/v1/teams/${id}/members/`),
  
  invitePlayer: (teamId: number, data: InvitePlayerRequest) =>
    apiClient.post(`/api/v1/teams/${teamId}/invite_player/`, data),
  
  searchPlayers: (query: string) =>
    apiClient.get<PaginatedResponse<PlayerSearchResult>>('/api/v1/player-profiles/', { search: query }),
  
  getMyTeam: () =>
    apiClient.get<Team>('/api/v1/teams/my-team/'),
};

export const eaAPI = {
  searchClubs: (data: { club_name: string; platform: 'common-gen5' | 'common-gen4' | 'pc' }) =>
    apiClient.post<{ count: number; results: EAClubSearchResult[] }>('/api/v1/ea/clubs/search/', data),
};

// Championships API
export const championshipsAPI = {
  getAll: (params?: any) =>
    apiClient.get<PaginatedResponse<Championship>>('/api/v1/championships/', params),
  
  getById: (id: number) =>
    apiClient.get<Championship>(`/api/v1/championships/${id}/`),
  
  create: (data: Partial<Championship>) =>
    apiClient.post<Championship>('/api/v1/championships/', data),
  
  createWithFile: (formData: FormData) =>
    apiClient.upload<Championship>('/api/v1/championships/', formData, 'post'),
  
  update: (id: number, data: Partial<Championship>) =>
    apiClient.put<Championship>(`/api/v1/championships/${id}/`, data),
  
  updateWithFile: (id: number, formData: FormData) =>
    apiClient.upload<Championship>(`/api/v1/championships/${id}/`, formData, 'put'),
  
  start: (id: number) =>
    apiClient.post(`/api/v1/championships/${id}/start/`),
  
  finish: (id: number) =>
    apiClient.post(`/api/v1/championships/${id}/finish/`),
  
  enroll: (championshipId: number, data: { team_id: number }) =>
    apiClient.post<EnrollmentCheckoutResponse>('/api/v1/enrollments/', { championship_id: championshipId, team_id: data.team_id }),
  
  getEnrollments: (championshipId: number) =>
    apiClient.get<PaginatedResponse<Enrollment>>(`/api/v1/enrollments/?championship=${championshipId}`),
  
  // Novos endpoints para Groups + Knockout
  generateBracket: (championshipId: number) =>
    apiClient.post<any>(`/api/v1/championships/${championshipId}/generate_bracket/`, {}),
  
  getGroups: (championshipId: number) =>
    apiClient.get<Group[]>(`/api/v1/championships/${championshipId}/groups/`),
};

export const paymentsAPI = {
  getById: (id: number) =>
    apiClient.get<Payment>(`/api/v1/payments/${id}/`),

  getStatus: (id: number) =>
    apiClient.get<Pick<Payment, 'id' | 'status' | 'expires_at' | 'paid_at' | 'updated_at'>>(`/api/v1/payments/${id}/status/`),

  refresh: (id: number) =>
    apiClient.post<Payment>(`/api/v1/payments/${id}/refresh/`, {}),
};

// Matches API
export const matchesAPI = {
  getAll: (params?: any) =>
    apiClient.get<PaginatedResponse<Match>>('/api/v1/matches/', params),
  
  getById: (id: number) =>
    apiClient.get<Match>(`/api/v1/matches/${id}/`),
  
  create: (data: Partial<Match>) =>
    apiClient.post<Match>('/api/v1/matches/', data),
  
  start: (id: number) =>
    apiClient.post(`/api/v1/matches/${id}/start/`),
  
  finish: (id: number) =>
    apiClient.post(`/api/v1/matches/${id}/finish/`),
  
  submitReport: (id: number, formData: FormData) =>
    apiClient.upload<MatchReport>(`/api/v1/matches/${id}/submit_report/`, formData, 'post'),

  // EA Report (Reportar Partida via EA API)
  reportEA: (id: number) =>
    apiClient.post<EAReportPreview>(`/api/v1/matches/${id}/report-ea/`),
  
  confirmReport: (id: number, data: { ea_match_id: number }) =>
    apiClient.post(`/api/v1/matches/${id}/confirm-report/`, data),
  
  contestReport: (id: number, data: EAReportContestRequest) =>
    apiClient.post(`/api/v1/matches/${id}/contest-report/`, data),
};

// Contestations API
export const contestationsAPI = {
  getAll: (params?: any) =>
    apiClient.get<PaginatedResponse<Contestation>>('/api/v1/contestations/', params),
  
  getById: (id: number) =>
    apiClient.get<Contestation>(`/api/v1/contestations/${id}/`),
  
  create: (formData: FormData) =>
    apiClient.upload<Contestation>('/api/v1/contestations/', formData, 'post'),
  
  review: (id: number, data: { status: string; response: string }) =>
    apiClient.post(`/api/v1/contestations/${id}/review/`, data),
};

// Statistics API
export const statisticsAPI = {
  // Estatísticas antigas (legacy)
  getPlayerStats: (params?: any) =>
    apiClient.get<PaginatedResponse<PlayerStatistics>>('/api/v1/player-statistics/', params),
  
  getTeamStats: (params?: any) =>
    apiClient.get<PaginatedResponse<TeamStatistics>>('/api/v1/team-statistics/', params),
  
  getTopScorers: (params?: any) =>
    apiClient.get('/api/v1/top-scorers/', params),
  
  getLeaderboard: () =>
    apiClient.get('/api/v1/leaderboard/'),

  // Novas estatísticas avançadas
  getPlayerOverallStats: (playerId: number, championshipId?: number) =>
    apiClient.get('/api/v1/statistics/player_stats/', { 
      player_id: playerId, 
      championship_id: championshipId 
    }),
  
  getTopScorersAdvanced: (championshipId?: number, limit: number = 10) =>
    apiClient.get('/api/v1/statistics/top_scorers/', { 
      championship_id: championshipId, 
      limit 
    }),
  
  getTopAssisters: (championshipId?: number, limit: number = 10) =>
    apiClient.get('/api/v1/statistics/top_assisters/', { 
      championship_id: championshipId, 
      limit 
    }),
  
  getMostDisciplined: (championshipId?: number, limit: number = 10) =>
    apiClient.get('/api/v1/statistics/most_disciplined/', { 
      championship_id: championshipId, 
      limit 
    }),
  
  getTeamOverallStats: (teamId: number, championshipId?: number) =>
    apiClient.get('/api/v1/statistics/team_stats/', { 
      team_id: teamId, 
      championship_id: championshipId 
    }),
  
  getRankings: (championshipId: number) =>
    apiClient.get('/api/v1/statistics/rankings/', { 
      championship_id: championshipId 
    }),
  
  getMatchDetails: (matchId: number) =>
    apiClient.get('/api/v1/statistics/match_details/', { 
      match_id: matchId 
    }),
  
  getChampionshipOverview: (championshipId: number) =>
    apiClient.get('/api/v1/statistics/championship_overview/', { 
      championship_id: championshipId 
    }),
};

// Invitations API
export const invitationsAPI = {
  getAll: (params?: any) =>
    apiClient.get<PaginatedResponse<TeamInvitation>>('/api/v1/invitations/', params),
  
  getMyInvitations: () =>
    apiClient.get<PaginatedResponse<TeamInvitation>>('/api/v1/invitations/?my_invitations=true'),
  
  accept: (id: number) =>
    apiClient.post(`/api/v1/invitations/${id}/accept/`, {}),
  
  decline: (id: number) =>
    apiClient.post(`/api/v1/invitations/${id}/decline/`, {}),
  
  cancel: (id: number) =>
    apiClient.delete(`/api/v1/invitations/${id}/`),
};

// Memberships API
export const membershipsAPI = {
  removeMember: (id: number) =>
    apiClient.delete(`/api/v1/memberships/${id}/`),
};

// Leave Requests API
export const leaveRequestsAPI = {
  /** Lista solicitações: dono vê as do time, jogador vê as próprias */
  getAll: (params?: { team?: number; status?: string }) =>
    apiClient.get<TeamLeaveRequest[]>('/api/v1/leave-requests/', params),

  /** Jogador cria uma solicitação de saída */
  create: (data: { reason?: string }) =>
    apiClient.post<TeamLeaveRequest>('/api/v1/leave-requests/', data),

  /** Jogador cancela sua solicitação pendente */
  cancel: (id: number) =>
    apiClient.delete(`/api/v1/leave-requests/${id}/`),

  /** Dono aprova a saída */
  approve: (id: number) =>
    apiClient.post<{ message: string; leave_request: TeamLeaveRequest }>(
      `/api/v1/leave-requests/${id}/approve/`,
      {}
    ),

  /** Dono recusa a saída */
  reject: (id: number) =>
    apiClient.post<{ message: string; leave_request: TeamLeaveRequest }>(
      `/api/v1/leave-requests/${id}/reject/`,
      {}
    ),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params?: any) =>
    apiClient.get('/api/v1/notifications/', params),
  
  getUnreadCount: () =>
    apiClient.get<{ unread_count: number }>('/api/v1/notifications/unread_count/'),
  
  markAsRead: (id: number) =>
    apiClient.post(`/api/v1/notifications/${id}/mark_read/`, {}),
  
  markAllAsRead: () =>
    apiClient.post('/api/v1/notifications/mark_all_read/', {}),
  
  delete: (id: number) =>
    apiClient.delete(`/api/v1/notifications/${id}/`),
};

// Search API
export const searchAPI = {
  global: (query: string, limit?: number) =>
    apiClient.get('/api/v1/search/', { q: query, limit }),
};

// Admin API
export const adminAPI = {
  getStats: () =>
    apiClient.get('/api/v1/admin/stats/'),

  getEnrollments: (params?: any) =>
    apiClient.get<PaginatedResponse<any>>('/api/v1/enrollments/', params),

  approveEnrollment: (id: number) =>
    apiClient.post(`/api/v1/enrollments/${id}/approve/`),

  rejectEnrollment: (id: number) =>
    apiClient.post(`/api/v1/enrollments/${id}/reject/`),

  getMatches: (params?: any) =>
    apiClient.get<PaginatedResponse<any>>('/api/v1/matches/', params),

  getContestations: (params?: any) =>
    apiClient.get<PaginatedResponse<any>>('/api/v1/contestations/', params),
};

// Match Lineups API — Escalação tática por partida
export const matchLineupsAPI = {
  /**
   * Submete (cria ou sobrescreve) a escalação do time do usuário
   * para uma partida específica.
   * POST /api/v1/matches/<match_id>/lineup/
   */
  submit: (matchId: number, data: SubmitLineupRequest) =>
    apiClient.post<MatchLineup>(`/api/v1/matches/${matchId}/lineup/`, data),

  /**
   * Busca a escalação existente do time do usuário para uma partida.
   * GET /api/v1/matches/<match_id>/lineup/
   */
  get: (matchId: number) =>
    apiClient.get<MatchLineup>(`/api/v1/matches/${matchId}/lineup/`),

  /**
   * Busca a escalação do time adversário para uma partida.
   * GET /api/v1/matches/<match_id>/lineup/?team=opponent
   */
  getOpponent: (matchId: number) =>
    apiClient.get<MatchLineup>(`/api/v1/matches/${matchId}/lineup/`, { team: 'opponent' }),
};

// Platform Stats API (público — landing page)
export interface PlatformStats {
  players: number;
  teams: number;
  championships: number;
  matches: number;
}

export const platformStatsAPI = {
  get: () => apiClient.get<PlatformStats>('/api/v1/stats/platform/'),
};
