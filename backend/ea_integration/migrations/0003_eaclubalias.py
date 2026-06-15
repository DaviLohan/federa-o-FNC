from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fnc_teams', '0004_team_lineup_visual_preferences'),
        ('ea_integration', '0002_add_validation_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='EAClubAlias',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ea_club_id', models.CharField(max_length=50, verbose_name='ID alternativo do clube na EA')),
                ('platform', models.CharField(choices=[('common-gen5', 'PS5 / Xbox Series / Cross-play'), ('common-gen4', 'PS4 / Xbox One'), ('pc', 'PC')], default='common-gen5', max_length=20, verbose_name='plataforma')),
                ('label', models.CharField(blank=True, default='', help_text='Nome opcional para identificar este alias (ex.: nome antigo do clube).', max_length=200, verbose_name='rótulo')),
                ('is_active', models.BooleanField(default=True, help_text='Se desativado, o alias não é usado no matching de report.', verbose_name='ativo')),
                ('first_seen_at', models.DateTimeField(blank=True, null=True, verbose_name='primeira vez visto')),
                ('last_seen_at', models.DateTimeField(blank=True, null=True, verbose_name='última vez visto')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='atualizado em')),
                ('team', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ea_club_aliases', to='fnc_teams.team', verbose_name='time interno')),
            ],
            options={
                'verbose_name': 'alias de clube EA',
                'verbose_name_plural': 'aliases de clubes EA',
                'ordering': ['team_id', 'platform', 'ea_club_id'],
                'constraints': [models.UniqueConstraint(fields=('team', 'platform', 'ea_club_id'), name='unique_ea_alias_per_team_platform')],
            },
        ),
    ]
