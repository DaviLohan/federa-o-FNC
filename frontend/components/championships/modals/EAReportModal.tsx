'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Badge, Select, useToast } from '@/components/shared/ui';
import { matchesAPI } from '@/lib/api';
import type { Match, EAReportPreview, EAReportPlayer, EAReportWarning } from '@/types';
import { formatDateTime } from '@/lib/utils/date';
import {
  Gamepad2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Info,
  WifiOff,
  Shield,
  Star,
  Target,
  Loader2,
  Send,
  UserCheck,
  UserX,
  Trophy,
  Search,
  ArrowLeft,
} from 'lucide-react';

// ─── Types & Constants ────────────────────────────────────────────────────────

interface EAReportModalProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'loading' | 'preview' | 'contest' | 'irregularConfirm' | 'error';

const contestationReasons = [
  { value: '', label: 'Selecione um motivo...' },
  { value: 'WRONG_SCORE', label: 'Placar Incorreto' },
  { value: 'MISSING_PLAYER', label: 'Jogador Ausente na Sumula' },
  { value: 'FAKE_SCREENSHOT', label: 'Screenshot Falso' },
  { value: 'OPPONENT_QUIT', label: 'Adversario Saiu da Partida' },
  { value: 'CONNECTION_ISSUE', label: 'Problema de Conexao' },
  { value: 'OTHER', label: 'Outro Motivo' },
];

/** Timeline step delays in ms */
const TIMELINE_DELAYS = [0, 800, 1600, 2400];
/** Minimum time (ms) loading screen stays visible */
const MIN_LOADING_MS = 3200;

// ─── Component ────────────────────────────────────────────────────────────────

export function EAReportModal({ match, isOpen, onClose }: EAReportModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [step, setStep] = useState<ModalStep>('loading');
  const [preview, setPreview] = useState<EAReportPreview | null>(null);
  const [error, setError] = useState<string>('');
  const [contestForm, setContestForm] = useState({ reason: '', description: '' });
  const [contestErrors, setContestErrors] = useState<Record<string, string>>({});
  const [irregularReason, setIrregularReason] = useState('');
  const [irregularError, setIrregularError] = useState('');

  const loadingStartRef = useRef<number>(0);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up transition timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  // ── Fetch EA Report ──────────────────────────────────────────────────

  const fetchMutation = useMutation({
    mutationFn: () => matchesAPI.reportEA(match.id),
    onSuccess: (data: any) => {
      setPreview(data);
      // Delay transition so timeline animation completes
      const elapsed = Date.now() - loadingStartRef.current;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
      transitionTimerRef.current = setTimeout(() => setStep('preview'), remaining);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Erro ao buscar dados da EA API.';
      setError(msg);
      setStep('error');
    },
  });

  // ── Confirm Report ───────────────────────────────────────────────────

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('Preview nao disponivel');
      return matchesAPI.confirmReport(match.id, { ea_match_id: preview.ea_match_id });
    },
    onSuccess: () => {
      showToast('Resultado confirmado com sucesso!', 'success');
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['championship'] });
      queryClient.invalidateQueries({ queryKey: ['match', match.id] });
      queryClient.invalidateQueries({ queryKey: ['team-performance'] });
      handleClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Erro ao confirmar resultado.';
      showToast(msg, 'error');
    },
  });

  // ── Contest Report ───────────────────────────────────────────────────

  const contestMutation = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('Preview nao disponivel');
      return matchesAPI.contestReport(match.id, {
        ea_match_id: preview.ea_match_id,
        reason: contestForm.reason,
        description: contestForm.description,
      });
    },
    onSuccess: () => {
      showToast('Contestacao enviada com sucesso!', 'success');
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['championship'] });
      queryClient.invalidateQueries({ queryKey: ['contestations'] });
      handleClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Erro ao enviar contestacao.';
      showToast(msg, 'error');
    },
  });

  const confirmIrregularMutation = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('Preview nao disponivel');
      return matchesAPI.confirmIrregularResult(match.id, {
        ea_match_id: preview.ea_match_id,
        reason: irregularReason,
      });
    },
    onSuccess: () => {
      showToast('Resultado mantido com irregularidade registrada.', 'success');
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['championship'] });
      queryClient.invalidateQueries({ queryKey: ['match', match.id] });
      queryClient.invalidateQueries({ queryKey: ['contestations'] });
      handleClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Erro ao confirmar resultado com irregularidade.';
      showToast(msg, 'error');
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleOpen = () => {
    setStep('loading');
    setError('');
    setPreview(null);
    setContestForm({ reason: '', description: '' });
    setContestErrors({});
    setIrregularReason('');
    setIrregularError('');
    loadingStartRef.current = Date.now();
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    fetchMutation.mutate();
  };

  const handleClose = () => {
    if (confirmMutation.isPending || contestMutation.isPending || confirmIrregularMutation.isPending) return;
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setStep('loading');
    setPreview(null);
    setError('');
    setContestForm({ reason: '', description: '' });
    setContestErrors({});
    setIrregularReason('');
    setIrregularError('');
    onClose();
  };

  const handleContestSubmit = () => {
    const errors: Record<string, string> = {};
    if (!contestForm.reason) errors.reason = 'Selecione um motivo';
    if (!contestForm.description.trim()) {
      errors.description = 'Descreva o motivo da contestacao';
    } else if (contestForm.description.trim().length < 20) {
      errors.description = 'A descricao deve ter pelo menos 20 caracteres';
    }
    setContestErrors(errors);
    if (Object.keys(errors).length > 0) return;
    contestMutation.mutate();
  };

  const handleIrregularConfirmSubmit = () => {
    if (!irregularReason.trim()) {
      setIrregularError('Informe a justificativa para manter o resultado com irregularidade');
      return;
    }
    setIrregularError('');
    confirmIrregularMutation.mutate();
  };

  // Auto-fetch when modal opens (via useEffect to avoid setState during render)
  useEffect(() => {
    if (isOpen && step === 'loading' && !fetchMutation.isPending && !preview && !error) {
      handleOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Dynamic modal config per step ───────────────────────────────────

  const modalConfig = {
    loading: {
      title: 'Reportar Partida via EA',
      description: 'Importando dados da EA Sports...',
    },
    error: {
      title: 'Erro no Relatorio',
      description: 'Nao foi possivel obter os dados da partida',
    },
    preview: {
      title: 'Relatorio da Partida',
      description: 'Dados importados automaticamente da EA Sports',
    },
    contest: {
      title: 'Contestar Resultado',
      description: 'Informe o motivo da contestacao',
    },
    irregularConfirm: {
      title: 'Manter Resultado com Irregularidade',
      description: 'Registre a justificativa para manter o resultado mesmo com irregularidade detectada',
    },
  };

  // ── Sticky Footer (preview + contest only) ─────────────────────────

  let stickyFooter: React.ReactNode | undefined;

  if (step === 'preview' && preview) {
    stickyFooter = (
      <div className="space-y-2">
        {!preview.can_confirm && (
          <p className="text-xs text-error text-center flex items-center justify-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Confirmacao bloqueada — verifique os avisos acima
          </p>
        )}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setStep('contest')}
            className="flex-1 border-warning/30 text-warning hover:bg-warning/10"
            disabled={confirmMutation.isPending}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Contestar
          </Button>
          <Button
            variant="primary"
            onClick={() => confirmMutation.mutate()}
            className="flex-1"
            loading={confirmMutation.isPending}
            disabled={!preview.can_confirm || confirmMutation.isPending}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Confirmar Resultado
          </Button>
        </div>
        {!preview.can_confirm && preview.can_confirm_with_irregularity && (
          <Button
            variant="primary"
            onClick={() => setStep('irregularConfirm')}
            className="w-full bg-warning hover:bg-warning/90"
            disabled={confirmMutation.isPending}
          >
            <Shield className="w-4 h-4 mr-2" />
            Confirmar resultado mesmo com irregularidade
          </Button>
        )}
      </div>
    );
  } else if (step === 'contest') {
    stickyFooter = (
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep('preview')}
          className="flex-1"
          disabled={contestMutation.isPending}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          variant="primary"
          onClick={handleContestSubmit}
          className="flex-1 bg-warning hover:bg-warning/90"
          loading={contestMutation.isPending}
        >
          <Send className="w-4 h-4 mr-2" />
          Enviar Contestacao
        </Button>
      </div>
    );
  } else if (step === 'irregularConfirm') {
    stickyFooter = (
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep('preview')}
          className="flex-1"
          disabled={confirmIrregularMutation.isPending}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          variant="primary"
          onClick={handleIrregularConfirmSubmit}
          className="flex-1 bg-warning hover:bg-warning/90"
          loading={confirmIrregularMutation.isPending}
        >
          <UserCheck className="w-4 h-4 mr-2" />
          Confirmar com Irregularidade
        </Button>
      </div>
    );
  }

  // ── Dynamic modal size per step ──────────────────────────────────
  const isExpandedStep = step === 'preview' || step === 'contest' || step === 'irregularConfirm';
  const modalSize = isExpandedStep ? '2xl' : 'xl';

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalConfig[step].title}
      description={modalConfig[step].description}
      size={modalSize}
      stickyFooter={stickyFooter}
      fullHeight={isExpandedStep}
    >
      {step === 'loading' && <LoadingTimeline match={match} />}
      {step === 'error' && (
        <ErrorState error={error} onRetry={handleOpen} onClose={handleClose} />
      )}
      {step === 'preview' && preview && (
        <PreviewContent preview={preview} match={match} />
      )}
      {step === 'contest' && preview && (
        <ContestContent
          preview={preview}
          match={match}
          form={contestForm}
          errors={contestErrors}
          onChange={(field, value) => {
            setContestForm((prev) => ({ ...prev, [field]: value }));
            if (contestErrors[field]) {
              setContestErrors((prev) => {
                const n = { ...prev };
                delete n[field];
                return n;
              });
            }
          }}
        />
      )}
      {step === 'irregularConfirm' && preview && (
        <IrregularConfirmContent
          reason={irregularReason}
          error={irregularError}
          onChange={(value) => {
            setIrregularReason(value);
            if (irregularError) setIrregularError('');
          }}
        />
      )}
    </Modal>
  );
}

// ─── Loading Timeline (Phase D) ──────────────────────────────────────────────

function LoadingTimeline({ match }: { match: Match }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    TIMELINE_DELAYS.forEach((delay, idx) => {
      if (idx === 0) return;
      timers.push(setTimeout(() => setActiveStep(idx), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    { label: 'Conectando com EA Sports...', icon: Gamepad2 },
    {
      label: `Localizando partida entre ${match.home_team.name} e ${match.away_team.name}...`,
      icon: Search,
    },
    { label: 'Validando escalacoes e estatisticas...', icon: Shield },
    { label: 'Preparando relatorio...', icon: CheckCircle2 },
  ];

  return (
    <div className="py-4 sm:py-8">
      <div className="max-w-md mx-auto">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isComplete = idx < activeStep;
          const isActive = idx === activeStep;

          return (
            <div key={idx} className="flex gap-4">
              {/* Timeline column */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                    isComplete
                      ? 'bg-brand/20 border-2 border-brand'
                      : isActive
                      ? 'bg-brand/10 border-2 border-brand animate-pulseGold'
                      : 'bg-panel2 border-2 border-stroke'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-brand" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-brand animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted2" />
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 min-h-[20px] transition-colors duration-500 ${
                      isComplete ? 'bg-brand/30' : 'bg-stroke/50'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div className={`pt-2 ${idx < steps.length - 1 ? 'pb-6' : ''}`}>
                <p
                  className={`text-sm transition-colors duration-300 ${
                    isComplete
                      ? 'text-brand font-medium'
                      : isActive
                      ? 'text-text font-medium'
                      : 'text-muted2'
                  }`}
                >
                  {s.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

function ErrorState({
  error,
  onRetry,
  onClose,
}: {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-error" />
        </div>
        <h3 className="text-lg font-semibold text-text mb-2">Partida nao encontrada</h3>
        <p className="text-sm text-muted text-center max-w-md">{error}</p>
      </div>

      <div className="bg-panel2 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-info" />
          Possiveis causas
        </h4>
        <ul className="text-sm text-muted space-y-2">
          <li className="flex gap-2 items-start">
            <span className="w-1 h-1 rounded-full bg-muted2 mt-2 shrink-0" />
            <span>
              A partida pode aparecer na EA como{' '}
              <strong className="text-text">League Match</strong> ou{' '}
              <strong className="text-text">Friendly Match</strong>
            </span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="w-1 h-1 rounded-full bg-muted2 mt-2 shrink-0" />
            <span>
              O sistema procura partidas da EA em uma{' '}
              <strong className="text-text">janela de ate 48 horas</strong> em relacao ao horario agendado
            </span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="w-1 h-1 rounded-full bg-muted2 mt-2 shrink-0" />
            <span>Ambos os times devem usar os clubes EA vinculados na plataforma</span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="w-1 h-1 rounded-full bg-muted2 mt-2 shrink-0" />
            <span>Aguarde alguns minutos apos o fim da partida para a EA disponibilizar o historico</span>
          </li>
          <li className="flex gap-2 items-start">
            <span className="w-1 h-1 rounded-full bg-muted2 mt-2 shrink-0" />
            <span>Partidas contestadas tambem podem ser reprocessadas pelo botao Reportar EA</span>
          </li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          Fechar
        </Button>
        <Button variant="primary" onClick={onRetry} className="flex-1">
          <Gamepad2 className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    </div>
  );
}

// ─── Preview Content (Phase E) ───────────────────────────────────────────────

function PreviewContent({
  preview,
  match,
}: {
  preview: EAReportPreview;
  match: Match;
}) {
  const playedAt = new Date(preview.played_at);

  return (
    <div className="space-y-5">
      {/* Score Header */}
      <div className="bg-panel2 rounded-xl p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-3">
          {/* Home Team */}
          <div className="flex items-center justify-end gap-3">
            <div className="text-right min-w-0">
              <h3 className="font-bold text-text text-sm sm:text-base truncate">
                {match.home_team.name}
              </h3>
              <p className="text-xs text-muted2 truncate">
                {preview.home_team.ea_club_name}
              </p>
            </div>
            {match.home_team.logo && (
              <img
                src={match.home_team.logo}
                alt={match.home_team.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
              />
            )}
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-3xl sm:text-4xl font-bold text-text font-heading">
              {preview.home_team.score}
            </span>
            <span className="text-lg font-bold text-muted2">x</span>
            <span className="text-3xl sm:text-4xl font-bold text-text font-heading">
              {preview.away_team.score}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-start gap-3">
            {match.away_team.logo && (
              <img
                src={match.away_team.logo}
                alt={match.away_team.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="text-left min-w-0">
              <h3 className="font-bold text-text text-sm sm:text-base truncate">
                {match.away_team.name}
              </h3>
              <p className="text-xs text-muted2 truncate">
                {preview.away_team.ea_club_name}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-stroke/50 flex items-center justify-center gap-3 flex-wrap">
          <p className="text-xs text-muted2">
            {formatDateTime(preview.played_at)}
          </p>
          <Badge variant="info">{preview.ea_match_id_external}</Badge>
        </div>
      </div>

      {/* Highlights */}
      <HighlightsSection preview={preview} />

      {/* Players Canvas */}
      <TeamsCanvas preview={preview} match={match} />

      {/* Warnings */}
      {preview.warnings.length > 0 && <WarningsList warnings={preview.warnings} />}
    </div>
  );
}

// ─── Highlights Section ──────────────────────────────────────────────────────

function HighlightsSection({ preview }: { preview: EAReportPreview }) {
  const allPlayers = [
    ...preview.home_team.players.map((p) => ({
      ...p,
      _team: preview.home_team.team_name,
    })),
    ...preview.away_team.players.map((p) => ({
      ...p,
      _team: preview.away_team.team_name,
    })),
  ];

  const activePlayers = allPlayers.filter((p) => !p.is_disconnected);
  if (activePlayers.length === 0) return null;

  // MVP — highest rating
  const mvp = activePlayers.reduce((best, p) =>
    parseFloat(p.rating) > parseFloat(best.rating) ? p : best
  );

  // Top scorer — most goals
  const topScorer = activePlayers.reduce((best, p) =>
    p.goals > best.goals ? p : best
  );

  // Totals
  const totalRedCards = allPlayers.reduce((sum, p) => sum + p.red_cards, 0);
  const totalDisconnected = allPlayers.filter((p) => p.is_disconnected).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* MVP */}
      <div className="bg-panel2 rounded-xl p-3 border border-brand/20">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Trophy className="w-3.5 h-3.5 text-brand" />
          <span className="text-[11px] text-muted2 font-medium uppercase tracking-wide">
            MVP
          </span>
        </div>
        <p className="text-sm font-bold text-text truncate">{mvp.gamertag}</p>
        <p className="text-xs text-brand font-mono font-bold">
          {parseFloat(mvp.rating).toFixed(1)}
        </p>
      </div>

      {/* Top Scorer */}
      <div className="bg-panel2 rounded-xl p-3 border border-stroke">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Target className="w-3.5 h-3.5 text-brand" />
          <span className="text-[11px] text-muted2 font-medium uppercase tracking-wide">
            Artilheiro
          </span>
        </div>
        {topScorer.goals > 0 ? (
          <>
            <p className="text-sm font-bold text-text truncate">{topScorer.gamertag}</p>
            <p className="text-xs text-muted font-mono">
              {topScorer.goals} gol{topScorer.goals > 1 ? 's' : ''}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-muted2">&mdash;</p>
            <p className="text-xs text-muted2">0 gols</p>
          </>
        )}
      </div>

      {/* Red Cards */}
      <div
        className={`bg-panel2 rounded-xl p-3 border ${
          totalRedCards > 0 ? 'border-error/20' : 'border-stroke'
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-3 h-3.5 bg-error rounded-[2px]" />
          <span className="text-[11px] text-muted2 font-medium uppercase tracking-wide">
            Vermelhos
          </span>
        </div>
        <p
          className={`text-lg font-bold font-mono ${
            totalRedCards > 0 ? 'text-error' : 'text-muted2'
          }`}
        >
          {totalRedCards}
        </p>
      </div>

      {/* Disconnected */}
      <div
        className={`bg-panel2 rounded-xl p-3 border ${
          totalDisconnected > 0 ? 'border-warning/20' : 'border-stroke'
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <WifiOff className="w-3.5 h-3.5 text-warning" />
          <span className="text-[11px] text-muted2 font-medium uppercase tracking-wide">
            Desconex.
          </span>
        </div>
        <p
          className={`text-lg font-bold font-mono ${
            totalDisconnected > 0 ? 'text-warning' : 'text-muted2'
          }`}
        >
          {totalDisconnected}
        </p>
      </div>
    </div>
  );
}

// ─── Teams Canvas ────────────────────────────────────────────────────────────

function TeamsCanvas({
  preview,
  match,
}: {
  preview: EAReportPreview;
  match: Match;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <TeamCanvasPanel
        teamLabel="Mandante"
        teamName={match.home_team.name}
        teamLogo={match.home_team.logo}
        eaClubName={preview.home_team.ea_club_name}
        score={preview.home_team.score}
        players={preview.home_team.players}
      />
      <TeamCanvasPanel
        teamLabel="Visitante"
        teamName={match.away_team.name}
        teamLogo={match.away_team.logo}
        eaClubName={preview.away_team.ea_club_name}
        score={preview.away_team.score}
        players={preview.away_team.players}
      />
    </div>
  );
}

function TeamCanvasPanel({
  teamLabel,
  teamName,
  teamLogo,
  eaClubName,
  score,
  players,
}: {
  teamLabel: string;
  teamName: string;
  teamLogo?: string;
  eaClubName: string;
  score: number;
  players: EAReportPlayer[];
}) {
  const activePlayers = players.filter((player) => !player.is_disconnected);
  const disconnectedPlayers = players.filter((player) => player.is_disconnected);
  const totalGoals = activePlayers.reduce((sum, player) => sum + player.goals, 0);
  const averageRating =
    activePlayers.length > 0
      ? activePlayers.reduce((sum, player) => sum + parseFloat(player.rating), 0) /
        activePlayers.length
      : 0;

  return (
    <div className="bg-panel2 rounded-xl border border-stroke overflow-hidden min-h-0">
      <div className="px-4 py-4 border-b border-stroke/50 bg-white/[0.02]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {teamLogo ? (
              <img
                src={teamLogo}
                alt={teamName}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-panel flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-muted2" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted2">{teamLabel}</p>
              <h4 className="text-base font-bold text-text truncate">{teamName}</h4>
              <p className="text-xs text-muted2 truncate">{eaClubName}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted2 mb-1">Placar</p>
            <p className="text-3xl font-heading font-bold text-text">{score}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-lg bg-panel px-3 py-2 border border-stroke/60">
            <p className="text-[10px] uppercase tracking-wide text-muted2">Jogadores</p>
            <p className="text-sm font-bold text-text">{activePlayers.length}</p>
          </div>
          <div className="rounded-lg bg-panel px-3 py-2 border border-stroke/60">
            <p className="text-[10px] uppercase tracking-wide text-muted2">Gols</p>
            <p className="text-sm font-bold text-text">{totalGoals}</p>
          </div>
          <div className="rounded-lg bg-panel px-3 py-2 border border-stroke/60">
            <p className="text-[10px] uppercase tracking-wide text-muted2">Nota Media</p>
            <p className="text-sm font-bold text-brand">{averageRating.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-stroke/50 grid grid-cols-[minmax(0,1fr)_52px_56px_36px_36px] gap-2 text-[11px] font-medium uppercase tracking-wide text-muted2">
        <span>Jogador</span>
        <span className="text-center">Pos</span>
        <span className="text-center">Nota</span>
        <span className="text-center">G</span>
        <span className="text-center">A</span>
      </div>

      <div className="divide-y divide-stroke/30">
        {activePlayers.map((player, idx) => (
          <PlayerCanvasRow key={idx} player={player} />
        ))}
      </div>

      {disconnectedPlayers.length > 0 && (
        <div className="px-4 py-3 border-t border-stroke/50 bg-warning/5 flex items-center gap-2 text-warning">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs">
            {disconnectedPlayers.length} jogador
            {disconnectedPlayers.length > 1 ? 'es' : ''} desconectado
            {disconnectedPlayers.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Player Canvas Row ───────────────────────────────────────────────────────

function PlayerCanvasRow({ player }: { player: EAReportPlayer }) {
  const rating = parseFloat(player.rating);
  const ratingColor =
    rating >= 8
      ? 'text-success'
      : rating >= 7
      ? 'text-brand'
      : rating >= 6
      ? 'text-text'
      : 'text-error';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_52px_56px_36px_36px] gap-2 px-3 py-2.5 hover:bg-white/[0.02] transition-colors items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {player.matched_player ? (
            <UserCheck className="w-3.5 h-3.5 text-success shrink-0" />
          ) : (
            <UserX className="w-3.5 h-3.5 text-warning shrink-0" />
          )}
          <span className="text-sm text-text font-medium truncate">{player.gamertag}</span>
          {player.red_cards > 0 && (
            <span
              className="w-2.5 h-3.5 bg-error rounded-[2px] shrink-0"
              title="Cartao vermelho"
            />
          )}
        </div>
        <p className="text-[11px] text-muted2 ml-[22px] truncate">
          {player.matched_player?.player_name || 'Nao vinculado na plataforma'}
        </p>
      </div>

      <div className="text-center">
        <span className="text-[11px] text-muted2 font-mono">{player.position}</span>
      </div>

      <div className="text-center">
        <span className={`text-sm font-bold font-mono ${ratingColor}`}>
          {rating.toFixed(1)}
        </span>
      </div>

      <div className="text-center">
        <span className={player.goals > 0 ? 'text-sm font-bold text-text' : 'text-sm text-muted2'}>
          {player.goals > 0 ? player.goals : '-'}
        </span>
      </div>

      <div className="text-center">
        <span className={player.assists > 0 ? 'text-sm font-bold text-text' : 'text-sm text-muted2'}>
          {player.assists > 0 ? player.assists : '-'}
        </span>
      </div>
    </div>
  );
}

// ─── Warnings List ───────────────────────────────────────────────────────────

function WarningsList({ warnings }: { warnings: EAReportWarning[] }) {
  const severityConfig = {
    info: {
      icon: Info,
      bg: 'bg-info/10',
      border: 'border-info/20',
      text: 'text-info',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-warning/10',
      border: 'border-warning/20',
      text: 'text-warning',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-error/10',
      border: 'border-error/20',
      text: 'text-error',
    },
    critical: {
      icon: XCircle,
      bg: 'bg-error/10',
      border: 'border-error/20',
      text: 'text-error',
    },
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-text flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        Avisos de Validacao ({warnings.length})
      </h4>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        {warnings.map((w, idx) => {
        const config = severityConfig[w.severity] || severityConfig.info;
        const Icon = config.icon;
        return (
          <div
            key={idx}
            className={`${config.bg} border ${config.border} rounded-lg p-3 flex gap-2 items-start`}
          >
            <Icon className={`w-4 h-4 ${config.text} shrink-0 mt-0.5`} />
            <p className="text-xs text-muted">{w.message}</p>
          </div>
        );
        })}
      </div>
    </div>
  );
}

// ─── Contest Content (Phase F) ───────────────────────────────────────────────

function ContestContent({
  preview,
  match,
  form,
  errors,
  onChange,
}: {
  preview: EAReportPreview;
  match: Match;
  form: { reason: string; description: string };
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Compact Score */}
      <div className="bg-panel2 rounded-xl p-3">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm font-semibold text-text truncate">
            {match.home_team.name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-text font-heading">
              {preview.home_team.score}
            </span>
            <span className="text-muted2">x</span>
            <span className="text-xl font-bold text-text font-heading">
              {preview.away_team.score}
            </span>
          </div>
          <span className="text-sm font-semibold text-text truncate">
            {match.away_team.name}
          </span>
        </div>
      </div>

      {/* Reason */}
      <div>
        <Select
          label="Motivo da Contestacao *"
          name="reason"
          value={form.reason}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            onChange('reason', e.target.value)
          }
          options={contestationReasons}
          required
          error={errors.reason}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Descricao Detalhada <span className="text-error">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={4}
          className={`w-full px-4 py-3 bg-panel2 border ${
            errors.description ? 'border-error' : 'border-stroke'
          } rounded-xl text-text text-sm placeholder-muted2 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all resize-none`}
          placeholder="Descreva em detalhes o motivo da contestacao..."
        />
        {errors.description && (
          <p className="text-sm text-error mt-1.5">{errors.description}</p>
        )}
        <p className="text-xs text-muted2 mt-1.5">
          Minimo de 20 caracteres. Seja claro e objetivo.
        </p>
      </div>

      {/* Warning */}
      <div className="bg-error/10 border border-error/20 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-text mb-1">Importante</h4>
            <ul className="text-xs text-muted space-y-1 list-disc list-inside">
              <li>Contestacoes falsas podem resultar em penalidades</li>
              <li>A analise sera feita por um administrador em ate 48h</li>
              <li>Voce sera notificado quando houver uma decisao</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function IrregularConfirmContent({
  reason,
  error,
  onChange,
}: {
  reason: string;
  error: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-muted">
            <p className="font-semibold text-text">Resultado com irregularidade detectada</p>
            <p>
              Use esta opção apenas quando o time potencialmente prejudicado concorda em manter o resultado
              mesmo com a irregularidade identificada.
            </p>
            <p>
              O sistema vai preservar estatísticas, saldo de gols e registrar a decisão para auditoria.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Justificativa da confirmação <span className="text-error">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className={`w-full px-4 py-3 bg-panel2 border ${
            error ? 'border-error' : 'border-stroke'
          } rounded-xl text-text text-sm placeholder-muted2 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all resize-none`}
          placeholder="Explique por que o resultado deve ser mantido apesar da irregularidade detectada..."
        />
        {error && <p className="text-sm text-error mt-1.5">{error}</p>}
      </div>
    </div>
  );
}
