from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('fnc_matches', '0007_allow_null_minute_goal_card'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='match',
            options={
                'ordering': ['round_number', 'scheduled_date', 'id'],
                'verbose_name': 'partida',
                'verbose_name_plural': 'partidas',
            },
        ),
    ]
