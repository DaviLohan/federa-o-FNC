from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fnc_teams', '0004_team_lineup_visual_preferences'),
    ]

    operations = [
        migrations.AlterField(
            model_name='teammembership',
            name='role',
            field=models.CharField(
                choices=[
                    ('OWNER', 'Dono'),
                    ('CAPTAIN', 'Capitão'),
                    ('COMMISSION', 'Comissão Técnica'),
                    ('PLAYER', 'Jogador'),
                ],
                default='PLAYER',
                max_length=10,
                verbose_name='função',
            ),
        ),
    ]
