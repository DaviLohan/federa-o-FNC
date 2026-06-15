from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fnc_teams', '0003_add_teamleaverequest'),
        ('player_stats', '0003_globalteamranking_globalteamrankingentry'),
        ('users', '0006_user_is_supervisor'),
    ]

    operations = [
        migrations.CreateModel(
            name='RankingCycle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.CharField(help_text='Formato YYYY-MM', max_length=7, unique=True, verbose_name='identificador do ciclo')),
                ('starts_at', models.DateTimeField(verbose_name='início do ciclo')),
                ('ends_at', models.DateTimeField(verbose_name='fim do ciclo')),
                ('status', models.CharField(choices=[('OPEN', 'Aberto'), ('CLOSED', 'Fechado')], default='OPEN', max_length=10, verbose_name='status')),
                ('processed_at', models.DateTimeField(blank=True, null=True, verbose_name='processado em')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='atualizado em')),
            ],
            options={
                'verbose_name': 'ciclo de ranking',
                'verbose_name_plural': 'ciclos de ranking',
                'ordering': ['-starts_at'],
            },
        ),
        migrations.CreateModel(
            name='PlayerTierState',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tier', models.CharField(choices=[('BRONZE', 'Bronze'), ('SILVER', 'Prata'), ('GOLD', 'Ouro'), ('PLATINUM', 'Platina')], default='BRONZE', max_length=10, verbose_name='rank')),
                ('score', models.DecimalField(decimal_places=2, default=0, max_digits=7, verbose_name='pontuação final')),
                ('average_rating', models.DecimalField(decimal_places=2, default=0, max_digits=5, verbose_name='nota média')),
                ('goals', models.PositiveIntegerField(default=0, verbose_name='gols')),
                ('assists', models.PositiveIntegerField(default=0, verbose_name='assistências')),
                ('matches_played', models.PositiveIntegerField(default=0, verbose_name='partidas jogadas')),
                ('tier_position', models.PositiveIntegerField(default=0, verbose_name='posição no rank')),
                ('general_position', models.PositiveIntegerField(default=0, verbose_name='posição geral')),
                ('is_promotion_zone', models.BooleanField(default=False, verbose_name='está na zona de promoção')),
                ('promotion_eligible', models.BooleanField(default=False, verbose_name='elegível para promoção')),
                ('promoted_to_tier', models.CharField(blank=True, choices=[('BRONZE', 'Bronze'), ('SILVER', 'Prata'), ('GOLD', 'Ouro'), ('PLATINUM', 'Platina')], max_length=10, verbose_name='promovido para rank')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='atualizado em')),
                ('cycle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='player_states', to='player_stats.rankingcycle', verbose_name='ciclo')),
                ('player', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tier_states', to='users.playerprofile', verbose_name='jogador')),
                ('team', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='player_tier_states', to='fnc_teams.team', verbose_name='time atual')),
            ],
            options={
                'verbose_name': 'estado de rank do jogador',
                'verbose_name_plural': 'estados de rank dos jogadores',
                'ordering': ['general_position', '-score'],
            },
        ),
        migrations.CreateModel(
            name='TierPromotionAudit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('from_tier', models.CharField(choices=[('BRONZE', 'Bronze'), ('SILVER', 'Prata'), ('GOLD', 'Ouro'), ('PLATINUM', 'Platina')], max_length=10, verbose_name='rank anterior')),
                ('to_tier', models.CharField(choices=[('BRONZE', 'Bronze'), ('SILVER', 'Prata'), ('GOLD', 'Ouro'), ('PLATINUM', 'Platina')], max_length=10, verbose_name='novo rank')),
                ('score_at_promotion', models.DecimalField(decimal_places=2, default=0, max_digits=7, verbose_name='pontuação na promoção')),
                ('tier_position', models.PositiveIntegerField(default=0, verbose_name='posição no rank')),
                ('promoted_at', models.DateTimeField(auto_now_add=True, verbose_name='promovido em')),
                ('cycle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='promotion_audits', to='player_stats.rankingcycle', verbose_name='ciclo')),
                ('player', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tier_promotion_audits', to='users.playerprofile', verbose_name='jogador')),
            ],
            options={
                'verbose_name': 'auditoria de promoção',
                'verbose_name_plural': 'auditorias de promoção',
                'ordering': ['-promoted_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='playertierstate',
            constraint=models.UniqueConstraint(fields=('cycle', 'player'), name='unique_player_tier_state_cycle_player'),
        ),
        migrations.AddConstraint(
            model_name='tierpromotionaudit',
            constraint=models.UniqueConstraint(fields=('cycle', 'player'), name='unique_tier_promotion_per_cycle_player'),
        ),
    ]
