from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fnc_matches', '0009_contestation_decided_away_score_and_more'),
        ('fnc_teams', '0004_team_lineup_visual_preferences'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='admin_override',
            field=models.BooleanField(
                default=False,
                help_text='Indica que a administração manteve ou definiu o resultado apesar da irregularidade.',
                verbose_name='resultado mantido por override administrativo',
            ),
        ),
        migrations.AddField(
            model_name='match',
            name='confirmed_by_team',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='irregular_results_confirmed',
                to='fnc_teams.team',
                verbose_name='resultado confirmado por',
            ),
        ),
        migrations.AddField(
            model_name='match',
            name='decision_reason',
            field=models.TextField(
                blank=True,
                help_text='Justificativa para manter resultado, converter para W.O. ou outra decisão relacionada à irregularidade.',
                verbose_name='motivo da decisão sobre irregularidade',
            ),
        ),
        migrations.AddField(
            model_name='match',
            name='irregularity_flag',
            field=models.BooleanField(
                default=False,
                help_text='Indica que a partida teve irregularidade identificada, mas não necessariamente virou W.O.',
                verbose_name='houve irregularidade',
            ),
        ),
        migrations.AddField(
            model_name='match',
            name='match_result_confirmed',
            field=models.BooleanField(
                default=False,
                help_text='Indica que o time potencialmente prejudicado confirmou a manutenção do resultado apesar da irregularidade.',
                verbose_name='resultado confirmado com irregularidade',
            ),
        ),
        migrations.AlterField(
            model_name='contestation',
            name='decision_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('APPROVE_CURRENT_RESULT', 'Aprovar resultado atual'),
                    ('CHANGE_RESULT', 'Alterar resultado'),
                    ('CONVERT_TO_WALKOVER', 'Converter para W.O.'),
                ],
                max_length=40,
                verbose_name='tipo de decisão',
            ),
        ),
        migrations.AlterField(
            model_name='contestationauditlog',
            name='action',
            field=models.CharField(
                choices=[
                    ('SUBMITTED', 'Contestação criada'),
                    ('UNDER_REVIEW', 'Contestação em análise'),
                    ('APPROVE_CURRENT_RESULT', 'Resultado atual aprovado'),
                    ('CHANGE_RESULT', 'Resultado alterado'),
                    ('CONFIRM_IRREGULAR_RESULT', 'Resultado confirmado com irregularidade'),
                    ('CONVERT_TO_WALKOVER', 'Resultado convertido para W.O.'),
                ],
                max_length=40,
                verbose_name='ação',
            ),
        ),
    ]
