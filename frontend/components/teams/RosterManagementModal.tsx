'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { teamsAPI } from '@/lib/api';
import { Card, Button } from '@/components/shared/ui';
import { MembersTab } from './MembersTab';
import { InvitePlayerTab } from './InvitePlayerTab';
import type { Team } from '@/types';

interface RosterManagementModalProps {
  team: Team;
  onClose: () => void;
  readOnly?: boolean;
}

export function RosterManagementModal({ team, onClose, readOnly = false }: RosterManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'invite'>('members');
  const queryClient = useQueryClient();

  // Fetch team members
  const { data: members, isLoading } = useQuery({
    queryKey: ['team-members', team.id],
    queryFn: () => teamsAPI.getMembers(team.id),
  });

  const membersList = Array.isArray(members) ? members : [];
  const isAtLimit = membersList.length >= 15;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <Card className="max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text">
              {readOnly ? 'Visualizar' : 'Gerenciar'} Elenco
            </h2>
            <p className="text-muted mt-1">{team.name}</p>
            <p className="text-sm text-muted2 mt-2">
              {membersList.length}/15 jogadores
              {isAtLimit && <span className="text-warning ml-2">• Limite atingido</span>}
            </p>
            {readOnly && (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                Somente Visualização
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'members'
                ? 'text-brand'
                : 'text-muted hover:text-text'
            }`}
          >
            Membros Atuais
            {activeTab === 'members' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
          </button>
          {!readOnly && (
            <button
              onClick={() => setActiveTab('invite')}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === 'invite'
                  ? 'text-brand'
                  : 'text-muted hover:text-text'
              }`}
            >
              Convidar Jogador
              {activeTab === 'invite' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
              )}
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'members' && (
            <MembersTab
              teamId={team.id}
              members={membersList}
              isLoading={isLoading}
              readOnly={readOnly}
              onMemberRemoved={() => {
                // Invalidate queries to refresh data
              }}
            />
          )}
          {activeTab === 'invite' && !readOnly && (
            <InvitePlayerTab
              teamId={team.id}
              isAtLimit={isAtLimit}
              onInviteSent={() => {
                setActiveTab('members');
                queryClient.invalidateQueries({ queryKey: ['team-members', team.id] });
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-6 border-t border-border mt-6">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </Card>
    </div>
  );
}
