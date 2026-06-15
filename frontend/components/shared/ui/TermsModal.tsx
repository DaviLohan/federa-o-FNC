'use client';

import { createPortal } from 'react-dom';
import { useReducedMotion, type Variants } from 'framer-motion';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Shield, ScrollText } from 'lucide-react';
import { Z_INDEX } from '@/lib/ui/z-index';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections = [
  {
    number: '01',
    title: 'Aceitação dos Termos',
    content: `Ao criar uma conta, registar uma equipa ou participar de qualquer campeonato organizado através da plataforma PRO ELEVEN, o utilizador declara ter lido, compreendido e aceite integralmente os presentes Termos e Condições de Uso. Caso não concorde com qualquer disposição aqui prevista, deverá cessar imediatamente o uso da plataforma.

Estes termos constituem um acordo legalmente vinculativo entre o utilizador e a PRO ELEVEN Platform. A plataforma reserva-se o direito de alterar estes termos a qualquer momento, mediante notificação prévia de 15 (quinze) dias, exceto em casos de urgência ou obrigação legal que exijam alteração imediata.`,
  },
  {
    number: '02',
    title: 'Cadastro e Gestão de Conta',
    content: `Para aceder às funcionalidades da plataforma, o utilizador deve criar uma conta fornecendo informações verdadeiras, precisas e atualizadas. O utilizador é o único responsável pela confidencialidade das suas credenciais de acesso.

É expressamente proibido: (a) criar contas falsas ou múltiplas contas para o mesmo utilizador; (b) partilhar credenciais de acesso com terceiros; (c) utilizar a conta de outra pessoa sem autorização expressa. A PRO ELEVEN reserva-se o direito de suspender ou eliminar contas que violem estas disposições, sem aviso prévio e sem direito a indemnização.

Cada jogador pode integrar apenas uma (1) equipa ativa em simultâneo. A saída de uma equipa está sujeita à aprovação do proprietário da equipa, conforme processo definido na plataforma.`,
  },
  {
    number: '03',
    title: 'Gestão de Equipas e Campeonatos',
    content: `O proprietário de uma equipa (dono) detém responsabilidade total pela gestão dos membros, incluindo convites, aprovação de saídas e definição de escalações. O dono representa a equipa em todos os assuntos administrativos perante a plataforma.

As equipas podem ser inscritas em campeonatos organizados pela PRO ELEVEN, sujeito à disponibilidade de vagas e ao cumprimento dos requisitos mínimos de cada competição. A inscrição em campeonatos implica a aceitação das regras específicas de cada competição, que complementam estes Termos e Condições.

A PRO ELEVEN reserva-se o direito de recusar a inscrição de equipas que tenham historial de violações graves das regras, comportamento antidesportivo comprovado ou pendências administrativas por resolver.`,
  },
  {
    number: '04',
    title: 'Resultados, Súmulas e Contestações',
    content: `O reporte de resultados é da exclusiva responsabilidade do dono da equipa mandante (home team), que deve submeter a súmula acompanhada de screenshot comprovativo do placar final. A submissão de informações falsas ou manipuladas constitui violação grave destes termos, podendo resultar na desqualificação da equipa e/ou suspensão da conta.

A equipa visitante dispõe de um prazo de 48 (quarenta e oito) horas após a submissão da súmula para contestar o resultado, caso considere que o mesmo não reflete a realidade. As contestações serão analisadas pela administração da PRO ELEVEN no prazo de 5 (cinco) dias úteis, tendo em conta as evidências fornecidas por ambas as partes.

Decisões da administração sobre resultados contestados são definitivas e inapelável no âmbito da plataforma.`,
  },
  {
    number: '05',
    title: 'Conduta, Fair Play e Penalidades',
    content: `A PRO ELEVEN valoriza o espírito desportivo e a conduta ética em todas as interações. É expressamente proibido: (a) utilizar linguagem ofensiva, discriminatória ou ameaçadora; (b) praticar ou incitar qualquer forma de assédio ou bullying; (c) recorrer a cheats, exploits ou qualquer forma de trapaça; (d) combinar resultados ou participar de qualquer forma de match-fixing; (e) fazer flood de reportes falsos com intuito de prejudicar outras equipas.

As penalidades por violação das regras de conduta incluem: advertência formal, suspensão temporária da conta (7 a 30 dias), suspensão definitiva da conta e/ou banimento permanente da plataforma. A gravidade da penalidade será proporcional à infração cometida e ao historial do utilizador.

Penalidades podem ser aplicadas a jogadores individuais, aos donos de equipas e às próprias equipas, conforme a natureza e responsabilidade na infração.`,
  },
  {
    number: '06',
    title: 'Privacidade, Dados e Propriedade Intelectual',
    content: `A PRO ELEVEN recolhe e trata dados pessoais dos utilizadores em conformidade com a legislação de proteção de dados aplicável (RGPD e legislação nacional). Os dados recolhidos destinam-se exclusivamente à prestação dos serviços da plataforma, gestão de campeonatos e comunicação com os utilizadores. Não são partilhados com terceiros para fins comerciais sem consentimento expresso.

O utilizador tem o direito de aceder, corrigir e solicitar a eliminação dos seus dados pessoais a qualquer momento, através dos canais de suporte da plataforma. A eliminação de conta implica a anonimização dos dados associados, mantendo-se o historial estatístico de forma agregada e não identificável.

Todo o conteúdo da plataforma PRO ELEVEN, incluindo o logo, design, nomenclatura, sistema de pontuação e algoritmos de classificação, é propriedade exclusiva da PRO ELEVEN e encontra-se protegido por direitos de propriedade intelectual. A reprodução, distribuição ou uso não autorizado de qualquer conteúdo da plataforma é expressamente proibida.

Para questões, reclamações ou pedidos relacionados com privacidade e dados, o utilizador pode contactar através dos canais oficiais disponíveis na plataforma.`,
  },
];

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  const prefersReduced = useReducedMotion();

  const overlayVariants: Variants = prefersReduced
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 }, exit: { opacity: 1 } }
    : { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };

  const panelVariants: Variants = prefersReduced
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        hidden:  { opacity: 0, scale: 0.96, y: 16 },
        visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.35 } },
        exit:    { opacity: 0, scale: 0.96, y: 16, transition: { duration: 0.2 } },
      };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="terms-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-8"
          style={{ zIndex: Z_INDEX.modal }}
          onClick={onClose}
        >
          <motion.div
            key="terms-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl overflow-hidden
                       border border-gold/20
                       bg-gradient-to-b from-surface1 to-[#070a10]
                       shadow-[0_0_60px_rgba(214,161,30,0.12),0_32px_80px_rgba(0,0,0,0.8)]"
          >
            {/* ── Linha decorativa topo ──────────────────────────────────── */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="relative flex items-start justify-between gap-4 px-4 sm:px-6 pt-5 sm:pt-7 pb-4 sm:pb-5 border-b border-border flex-shrink-0">
              {/* Glow decorativo no header */}
              <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />

              <div className="relative flex items-center gap-4">
                {/* Ícone */}
                <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(214,161,30,0.2)]">
                  <ScrollText className="w-6 h-6 text-gold" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Shield className="w-3.5 h-3.5 text-gold/60" />
                    <span className="text-xs font-mono font-bold text-gold/60 uppercase tracking-widest">
                      PRO ELEVEN Platform
                    </span>
                  </div>
                  <h2 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-gold via-gold2 to-gold leading-tight">
                    Termos e Condições
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Última atualização: Março de 2026 · Versão 1.0
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="relative flex-shrink-0 w-10 h-10 rounded-xl border border-border flex items-center justify-center
                           text-muted hover:text-text hover:border-gold/30 hover:bg-gold/5
                           transition-all duration-200 group"
                aria-label="Fechar termos"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Conteúdo (scrollável) ──────────────────────────────────── */}
            <div
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-8
                         scrollbar-thin
                         [&::-webkit-scrollbar]:w-1.5
                         [&::-webkit-scrollbar-track]:bg-surface2
                         [&::-webkit-scrollbar-thumb]:bg-gold/30
                         [&::-webkit-scrollbar-thumb]:rounded-full
                         [&::-webkit-scrollbar-thumb:hover]:bg-gold/50"
            >
              {/* Intro */}
              <p className="text-sm text-muted leading-relaxed">
                Estes Termos e Condições regem o uso da plataforma PRO ELEVEN. Leia atentamente
                antes de utilizar os nossos serviços. A utilização da plataforma implica a
                aceitação integral das disposições abaixo.
              </p>

              {/* Secções */}
              {sections.map((section, index) => (
                <div key={section.number} className="group">
                  {/* Cabeçalho da secção */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gold/10 border border-gold/20
                                    flex items-center justify-center
                                    group-hover:border-gold/40 group-hover:bg-gold/15
                                    transition-all duration-300">
                      <span className="font-mono text-xs font-black text-gold">{section.number}</span>
                    </div>
                    <h3 className="font-heading text-base font-bold text-text uppercase tracking-wide">
                      {section.title}
                    </h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                  </div>

                  {/* Conteúdo */}
                  <div className="pl-0 sm:pl-14 space-y-3">
                    {section.content.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx} className="text-sm text-muted leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {/* Separador (exceto último) */}
                  {index < sections.length - 1 && (
                    <div className="mt-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  )}
                </div>
              ))}

              {/* Nota final */}
              <div className="p-4 rounded-2xl border border-gold/15 bg-gold/5 flex gap-3">
                <Shield className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted leading-relaxed">
                  Ao utilizar a plataforma PRO ELEVEN, confirma que leu e compreendeu estes
                  Termos e Condições. Para esclarecimentos adicionais, entre em contacto com
                  a nossa equipa de suporte através dos canais oficiais.
                </p>
              </div>

              {/* Espaço extra no fundo para scroll confortável */}
              <div className="h-2" />
            </div>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <div className="relative flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-3 sm:py-4 border-t border-border flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              <p className="relative text-xs text-muted">
                © 2026 PRO ELEVEN. Todos os direitos reservados.
              </p>
              <button
                onClick={onClose}
                className="relative px-5 py-2.5 rounded-xl text-sm font-semibold
                           border border-gold/30 text-gold
                           hover:bg-gold/10 hover:border-gold/60
                           hover:shadow-[0_0_16px_rgba(214,161,30,0.2)]
                           transition-all duration-300"
              >
                Compreendi
              </button>
            </div>

            {/* ── Linha decorativa rodapé ────────────────────────────────── */}
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
