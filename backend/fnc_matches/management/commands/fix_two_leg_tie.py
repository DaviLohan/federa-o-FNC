"""Corrige o placar de um confronto de mata-mata ida e volta e re-propaga o bracket.

Caso de uso: um confronto ida/volta (PLAYOFF) teve o placar gravado de forma
incorreta (inclusive via report EA), o que levou o time errado a avançar de fase.
Este command ajusta os placares das duas pernas a partir de valores informados por
time, recalcula os dados derivados e o agregado, e — crucialmente — corrige a
partida da fase seguinte, contornando a limitação de
``_advance_winner_to_next_round`` (fnc_championships/services/__init__.py:664-665),
que NÃO atualiza o ``Match`` real da próxima fase quando ele já existe.

Seguro por padrão:
  - DRY-RUN é o modo padrão; só com ``--apply`` algo é gravado.
  - Tudo dentro de ``transaction.atomic()``.
  - Aborta se a partida da fase seguinte já tiver sido jogada (escala para humano).
  - Idempotente: re-rodar converge ao mesmo estado.

NÃO usar contra produção pelo agente. Validar em DEV; o usuário aplica em produção
após backup. Ver docs/SECURITY_AND_PRODUCTION_RULES.md e CLAUDE.md.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from ea_integration.models import EAMatch
from fnc_championships.models import Bracket, Championship
from fnc_championships.services import update_bracket_after_match
from fnc_matches.models import Card, Goal, Match
from fnc_matches.services import recompute_match_derived_data_for_championship

KNOCKOUT_TYPES = {Championship.Type.KNOCKOUT, Championship.Type.GROUPS_KNOCKOUT}
NOT_PLAYED_STATUSES = {Match.Status.SCHEDULED, Match.Status.IN_PROGRESS}


class Command(BaseCommand):
    help = (
        'Corrige o placar de um confronto ida/volta (PLAYOFF) e re-propaga o '
        'bracket. DRY-RUN por padrão; use --apply para gravar.'
    )

    def add_arguments(self, parser):
        parser.add_argument('championship_id', type=int)
        parser.add_argument('--team-a', required=True, help='Substring do nome do time A (icontains).')
        parser.add_argument('--team-b', required=True, help='Substring do nome do time B (icontains).')
        parser.add_argument('--ida-a-score', type=int, required=True, help='Gols do time A no jogo de IDA.')
        parser.add_argument('--ida-b-score', type=int, required=True, help='Gols do time B no jogo de IDA.')
        parser.add_argument('--volta-a-score', type=int, required=True, help='Gols do time A no jogo de VOLTA.')
        parser.add_argument('--volta-b-score', type=int, required=True, help='Gols do time B no jogo de VOLTA.')
        parser.add_argument(
            '--ida-match-id', type=int, default=None,
            help='Opcional: força qual Match é a IDA (senão usa o de menor scheduled_date/id).',
        )
        parser.add_argument(
            '--decision-reason', default='Correção administrativa de placar de confronto ida/volta.',
            help='Justificativa gravada em decision_reason / admin_override.',
        )
        parser.add_argument('--apply', action='store_true', help='Grava as mudanças (senão é DRY-RUN).')

    # ------------------------------------------------------------------ helpers

    def _out(self, msg=''):
        self.stdout.write(msg)

    def _warn(self, msg):
        self.stdout.write(self.style.WARNING(msg))

    @staticmethod
    def _aggregate(legs, team_a_id, team_b_id):
        agg_a = agg_b = 0
        for leg in legs:
            if leg.home_team_id == team_a_id:
                agg_a += leg.home_score
                agg_b += leg.away_score
            else:
                agg_a += leg.away_score
                agg_b += leg.home_score
        return agg_a, agg_b

    @staticmethod
    def _leg_home_away(leg, team_a_id, a_score, b_score):
        """Mapeia placares por-time para (home_score, away_score) conforme o mando real."""
        if leg.home_team_id == team_a_id:
            return a_score, b_score
        return b_score, a_score

    @staticmethod
    def _find_tie_node(structure, tie_round_number, tie_team_ids):
        """Retorna (match_number, node) do confronto no Bracket.structure, ou (None, None)."""
        for rd in structure.get('rounds', []):
            if rd.get('round_number') != tie_round_number:
                continue
            for idx, md in enumerate(rd.get('matches', []), start=1):
                t1 = (md.get('team1') or {}).get('id')
                t2 = (md.get('team2') or {}).get('id')
                if t1 and t2 and {t1, t2} == tie_team_ids:
                    return (md.get('match_number') or idx), md
        return None, None

    @classmethod
    def _find_next_node(cls, structure, tie_round_number, tie_team_ids):
        """Retorna o node da fase seguinte que recebe o vencedor deste confronto."""
        match_number, _ = cls._find_tie_node(structure, tie_round_number, tie_team_ids)
        if not match_number:
            return None
        next_round_num = tie_round_number + 1
        rounds = structure.get('rounds', [])
        if next_round_num > len(rounds):
            return None  # era a final / última fase
        next_matches = rounds[next_round_num - 1].get('matches', [])
        next_match_number = (match_number + 1) // 2
        if len(next_matches) < next_match_number:
            return None
        return next_matches[next_match_number - 1]

    @staticmethod
    def _node_team_ids(node):
        home = node.get('home_team_id') or (node.get('team1') or {}).get('id')
        away = node.get('away_team_id') or (node.get('team2') or {}).get('id')
        return home, away

    # -------------------------------------------------------------------- handle

    def handle(self, *args, **options):
        champ_id = options['championship_id']
        name_a = options['team_a']
        name_b = options['team_b']
        for key in ('ida_a_score', 'ida_b_score', 'volta_a_score', 'volta_b_score'):
            if options[key] < 0:
                raise CommandError(f'{key} não pode ser negativo.')
        apply_changes = bool(options['apply'])
        reason = options['decision_reason']

        try:
            champ = Championship.objects.get(id=champ_id)
        except Championship.DoesNotExist:
            raise CommandError(f'Campeonato {champ_id} não encontrado.')
        if champ.championship_type not in KNOCKOUT_TYPES:
            raise CommandError(
                f'Campeonato {champ_id} é {champ.championship_type}; este command só atua em mata-mata.'
            )

        # Localiza as duas pernas (um lado contém name_a e o outro name_b).
        legs = list(
            Match.objects.filter(championship=champ)
            .filter(
                (Q(home_team__name__icontains=name_a) & Q(away_team__name__icontains=name_b))
                | (Q(home_team__name__icontains=name_b) & Q(away_team__name__icontains=name_a))
            )
            .select_related('home_team', 'away_team')
            .order_by('scheduled_date', 'id')
        )

        if len(legs) != 2:
            raise CommandError(
                f'Esperava exatamente 2 partidas entre "{name_a}" e "{name_b}" no campeonato '
                f'{champ_id}, encontrei {len(legs)}. Refine os nomes ou confira os dados.'
            )

        # Invariantes de ida/volta.
        if legs[0].round_number != legs[1].round_number:
            raise CommandError('As duas partidas têm round_number diferentes — não são o mesmo confronto.')
        if legs[0].match_type != legs[1].match_type:
            raise CommandError('As duas partidas têm match_type diferentes.')
        if legs[0].match_type != Match.MatchType.PLAYOFF:
            raise CommandError(
                f'match_type={legs[0].match_type}. Ida/volta exige PLAYOFF. '
                'FINAL é jogo único e não deve ser tratado aqui (regra de ouro).'
            )
        pair0 = {legs[0].home_team_id, legs[0].away_team_id}
        pair1 = {legs[1].home_team_id, legs[1].away_team_id}
        if pair0 != pair1:
            raise CommandError('As duas partidas não envolvem exatamente os mesmos dois times.')

        # Resolve os objetos Team A e B a partir dos times presentes.
        teams = {legs[0].home_team_id: legs[0].home_team, legs[0].away_team_id: legs[0].away_team}
        a_candidates = [t for t in teams.values() if name_a.lower() in t.name.lower()]
        b_candidates = [t for t in teams.values() if name_b.lower() in t.name.lower()]
        if len(a_candidates) != 1 or len(b_candidates) != 1 or a_candidates[0].id == b_candidates[0].id:
            raise CommandError(
                f'Não consegui mapear de forma única os times A/B. '
                f'A->{[t.name for t in a_candidates]} B->{[t.name for t in b_candidates]}'
            )
        team_a, team_b = a_candidates[0], b_candidates[0]
        tie_team_ids = {team_a.id, team_b.id}

        # Define IDA e VOLTA.
        if options['ida_match_id'] is not None:
            ida = next((m for m in legs if m.id == options['ida_match_id']), None)
            if ida is None:
                raise CommandError(f'--ida-match-id={options["ida_match_id"]} não é uma das pernas encontradas.')
            volta = next(m for m in legs if m.id != ida.id)
        else:
            ida, volta = legs[0], legs[1]

        # ----------------------------------------------------------- relatório
        self._out('=' * 72)
        self._out(f'Campeonato #{champ.id} — {champ} [{champ.championship_type}]')
        self._out(f'Time A = "{team_a.name}" (id={team_a.id}) | Time B = "{team_b.name}" (id={team_b.id})')
        self._out(f'Fase (round_number) = {ida.round_number} | match_type = {ida.match_type}')
        self._out(f'Modo = {"APPLY" if apply_changes else "DRY-RUN"}')
        self._out('-' * 72)

        for label, leg in (('IDA  ', ida), ('VOLTA', volta)):
            ea = EAMatch.objects.filter(linked_match=leg).order_by('-played_at').first()
            ea_desc = (
                f'EAMatch#{ea.id} status={ea.validation_status} {ea.home_score}x{ea.away_score}'
                if ea else 'sem EAMatch vinculado'
            )
            goals = Goal.objects.filter(match=leg).count()
            cards = Card.objects.filter(match=leg).count()
            self._out(
                f'[{label}] Match#{leg.id}: {leg.home_team.name} {leg.home_score} x '
                f'{leg.away_score} {leg.away_team.name} | status={leg.status} '
                f'finished_at={leg.finished_at}'
            )
            self._out(f'         {ea_desc} | Goals={goals} Cards={cards}')

        # Estado atual do agregado e do bracket.
        cur_agg_a, cur_agg_b = self._aggregate([ida, volta], team_a.id, team_b.id)
        self._out('-' * 72)
        self._out(f'Agregado ATUAL: {team_a.name} {cur_agg_a} x {cur_agg_b} {team_b.name}')

        try:
            bracket = Bracket.objects.get(championship=champ)
        except Bracket.DoesNotExist:
            raise CommandError('Campeonato não possui Bracket — nada para re-propagar.')

        _, tie_node = self._find_tie_node(bracket.structure, ida.round_number, tie_team_ids)
        if tie_node is None:
            self._warn('Confronto não localizado no Bracket.structure (verifique manualmente).')
        else:
            self._out(f'Bracket node winner ATUAL: {tie_node.get("winner") or tie_node.get("winner_name")}')

        next_node = self._find_next_node(bracket.structure, ida.round_number, tie_team_ids)
        next_match = None
        if next_node is None:
            self._out('Próxima fase: nenhuma (este confronto é a última fase) ou node não encontrado.')
        else:
            next_mid = next_node.get('match_id')
            nh, na = self._node_team_ids(next_node)
            self._out(
                f'Próxima fase (node): match_id={next_mid} '
                f'home_id={nh} away_id={na}'
            )
            if next_mid:
                next_match = Match.objects.select_related('home_team', 'away_team').filter(id=next_mid).first()
                if next_match:
                    played = (
                        next_match.status not in NOT_PLAYED_STATUSES
                        or next_match.home_score or next_match.away_score
                        or EAMatch.objects.filter(linked_match=next_match).exists()
                    )
                    self._out(
                        f'Próxima fase (Match real #{next_match.id}): '
                        f'{next_match.home_team.name} x {next_match.away_team.name} '
                        f'status={next_match.status} jogada={bool(played)}'
                    )
                    if played:
                        raise CommandError(
                            f'A partida da próxima fase (Match#{next_match.id}) já foi jogada/iniciada. '
                            'Corrigir uma fase já jogada é uma cascata fora do escopo deste command — '
                            'escale para revisão manual.'
                        )

        # Placar PROPOSTO.
        ida_h, ida_a_ = self._leg_home_away(ida, team_a.id, options['ida_a_score'], options['ida_b_score'])
        volta_h, volta_a_ = self._leg_home_away(volta, team_a.id, options['volta_a_score'], options['volta_b_score'])
        new_agg_a = options['ida_a_score'] + options['volta_a_score']
        new_agg_b = options['ida_b_score'] + options['volta_b_score']
        if new_agg_a == new_agg_b:
            raise CommandError(
                f'O placar informado gera EMPATE no agregado ({new_agg_a}x{new_agg_b}). '
                'Confrontos empatados exigem decisão manual de pênaltis (resolve_aggregate_tie) — '
                'não é o caso esperado aqui.'
            )
        new_winner = team_a if new_agg_a > new_agg_b else team_b

        self._out('-' * 72)
        self._out('PLACAR PROPOSTO:')
        self._out(f'  IDA   Match#{ida.id}: {ida.home_team.name} {ida_h} x {ida_a_} {ida.away_team.name}')
        self._out(f'  VOLTA Match#{volta.id}: {volta.home_team.name} {volta_h} x {volta_a_} {volta.away_team.name}')
        self._out(f'  Agregado: {team_a.name} {new_agg_a} x {new_agg_b} {team_b.name} -> avança: {new_winner.name}')
        self._out('=' * 72)

        if not apply_changes:
            self._out('DRY-RUN: nada foi gravado. Revise acima e rode novamente com --apply.')
            return

        # --------------------------------------------------------------- APPLY
        with transaction.atomic():
            for leg, hs, as_ in ((ida, ida_h, ida_a_), (volta, volta_h, volta_a_)):
                leg.home_score = hs
                leg.away_score = as_
                leg.status = Match.Status.FINISHED
                if leg.finished_at is None:
                    leg.finished_at = timezone.now()
                leg.admin_override = True
                leg.decision_reason = reason
                leg.save(update_fields=[
                    'home_score', 'away_score', 'status', 'finished_at',
                    'admin_override', 'decision_reason', 'updated_at',
                ])

            # Recalcula dados derivados (stats/top scorers) e re-propaga o agregado/bracket.
            recompute_match_derived_data_for_championship(champ)
            update_bracket_after_match(ida)

            # Corrige a Match da próxima fase para refletir o JSON (contorna o :664-665).
            self._sync_next_round_match(champ, ida.round_number, tie_team_ids, new_winner)

        # ---------------------------------------------------------- verificação
        self._verify(champ, ida.id, volta.id, team_a, team_b, new_agg_a, new_agg_b, new_winner, tie_team_ids)
        self._out(self.style.SUCCESS('Correção aplicada com sucesso.'))

    # ------------------------------------------------------------ apply helpers

    def _sync_next_round_match(self, champ, tie_round_number, tie_team_ids, new_winner):
        bracket = Bracket.objects.get(championship=champ)
        next_node = self._find_next_node(bracket.structure, tie_round_number, tie_team_ids)
        if not next_node:
            self._out('Sync próxima fase: sem próxima fase a ajustar.')
            return
        mid = next_node.get('match_id')
        if not mid:
            self._out('Sync próxima fase: node sem match_id (partida ainda não criada) — nada a fazer.')
            return
        next_match = Match.objects.select_related('home_team', 'away_team').filter(id=mid).first()
        if not next_match:
            self._warn(f'Sync próxima fase: match_id={mid} no JSON não existe no banco.')
            return

        desired_home, desired_away = self._node_team_ids(next_node)
        changed = []
        if desired_home and next_match.home_team_id != desired_home:
            next_match.home_team_id = desired_home
            changed.append('home_team')
        if desired_away and next_match.away_team_id != desired_away:
            next_match.away_team_id = desired_away
            changed.append('away_team')
        if changed:
            next_match.save(update_fields=changed + ['updated_at'])
            self._out(
                f'Sync próxima fase: Match#{next_match.id} atualizado ({", ".join(changed)}) '
                f'-> {next_match.home_team.name} x {next_match.away_team.name}'
            )
        else:
            self._out(f'Sync próxima fase: Match#{next_match.id} já consistente — nada a fazer (idempotente).')

    def _verify(self, champ, ida_id, volta_id, team_a, team_b, exp_agg_a, exp_agg_b, expected_winner, tie_team_ids):
        ida = Match.objects.get(id=ida_id)
        volta = Match.objects.get(id=volta_id)
        agg_a, agg_b = self._aggregate([ida, volta], team_a.id, team_b.id)
        assert (agg_a, agg_b) == (exp_agg_a, exp_agg_b), (
            f'Agregado pós-aplicação {agg_a}x{agg_b} != esperado {exp_agg_a}x{exp_agg_b}'
        )

        bracket = Bracket.objects.get(championship=champ)
        _, tie_node = self._find_tie_node(bracket.structure, ida.round_number, tie_team_ids)
        if tie_node is not None:
            winner_obj = tie_node.get('winner') or {}
            winner_id = winner_obj.get('id') if isinstance(winner_obj, dict) else tie_node.get('winner_id')
            assert winner_id == expected_winner.id, (
                f'Bracket winner id={winner_id} != esperado {expected_winner.id} ({expected_winner.name})'
            )

        next_node = self._find_next_node(bracket.structure, ida.round_number, tie_team_ids)
        if next_node and next_node.get('match_id'):
            nm = Match.objects.get(id=next_node['match_id'])
            assert expected_winner.id in (nm.home_team_id, nm.away_team_id), (
                f'Vencedor {expected_winner.name} não está na Match da próxima fase #{nm.id}'
            )
            self._out(
                f'Verificação: próxima fase Match#{nm.id} = {nm.home_team.name} x {nm.away_team.name} OK'
            )
        self._out(
            f'Verificação: agregado {team_a.name} {agg_a} x {agg_b} {team_b.name} | '
            f'vencedor {expected_winner.name} OK'
        )
