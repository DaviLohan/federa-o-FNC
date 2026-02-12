import { apiClient } from './api-client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
  PlayerProfile,
  Team,
  Championship,
  Enrollment,
  TeamInvitation,
  InvitePlayerRequest,
  PlayerSearchResult,
  Match,
  PlayerStatistics,
  TeamStatistics,
  PaginatedResponse,
  Contestation,
  MatchReport,
  Group,
  Bracket,
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
};

// Users API
export const usersAPI = {
  getMe: () =>
    apiClient.get<User>('/api/v1/users/me/'),
  
  updateProfile: (id: number, data: Partial<User>) =>
    apiClient.patch<User>(`/api/v1/users/${id}/`, data),
};

// Player Profiles API
export const playerProfilesAPI = {
  getById: (id: number) =>
    apiClient.get<PlayerProfile>(`/api/v1/player-profiles/${id}/`),
  
  update: (id: number, data: Partial<PlayerProfile>) =>
    apiClient.patch<PlayerProfile>(`/api/v1/player-profiles/${id}/`, data),
  
  updateWithToken: (id: number, data: Partial<PlayerProfile>, token: string) =>
    apiClient.patchWithToken<PlayerProfile>(`/api/v1/player-profiles/${id}/`, data, token),
  
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
  
  update: (id: number, data: Partial<Team>) =>
    apiClient.put<Team>(`/api/v1/teams/${id}/`, data),
  
  updateWithFile: (id: number, formData: FormData) =>
    apiClient.upload<Team>(`/api/v1/teams/${id}/`, formData, 'put'),
  
  delete: (id: number) =>
    apiClient.delete(`/api/v1/teams/${id}/`),
  
  getMembers: (id: number) =>
    apiClient.get(`/api/v1/teams/${id}/members/`),
  
  invitePlayer: (teamId: number, data: InvitePlayerRequest) =>
    apiClient.post(`/api/v1/teams/${teamId}/invite_player/`, data),
  
  searchPlayers: (query: string) =>
    apiClient.get<PaginatedResponse<PlayerSearchResult>>('/api/v1/player-profiles/', { search: query }),
  
  getMyTeam: () =>
    apiClient.get<Team>('/api/v1/teams/my-team/'),
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
    apiClient.post('/api/v1/enrollments/', { championship_id: championshipId, team_id: data.team_id }),
  
  getEnrollments: (championshipId: number) =>
    apiClient.get<PaginatedResponse<Enrollment>>(`/api/v1/enrollments/?championship=${championshipId}`),
  
  // Novos endpoints para Groups + Knockout
  generateBracket: (championshipId: number) =>
    apiClient.post<any>(`/api/v1/championships/${championshipId}/generate_bracket/`, {}),
  
  getGroups: (championshipId: number) =>
    apiClient.get<Group[]>(`/api/v1/championships/${championshipId}/groups/`),
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
};

// Match Proposals API
export const matchProposalsAPI = {
  getAll: (params?: any) =>
    apiClient.get('/api/v1/proposals/', params),
  
  getById: (id: number) =>
    apiClient.get(`/api/v1/proposals/${id}/`),
  
  create: (data: { match_id: number; proposed_date: string }) =>
    apiClient.post('/api/v1/proposals/', data),
  
  respond: (id: number, data: { action: 'accept' | 'reject'; rejection_reason?: string }) =>
    apiClient.post(`/api/v1/proposals/${id}/respond/`, data),
};

// Match Confirmations API
export const matchConfirmationsAPI = {
  getAll: (params?: any) =>
    apiClient.get('/api/v1/confirmations/', params),
  
  getById: (id: number) =>
    apiClient.get(`/api/v1/confirmations/${id}/`),
  
  create: (data: { match_id: number; team_id: number }) =>
    apiClient.post('/api/v1/confirmations/', data),
  
  confirm: (id: number) =>
    apiClient.post(`/api/v1/confirmations/${id}/confirm/`, {}),
  
  decline: (id: number, data: { reason: string }) =>
    apiClient.post(`/api/v1/confirmations/${id}/decline/`, data),
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
};
