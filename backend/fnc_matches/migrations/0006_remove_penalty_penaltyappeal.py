from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('fnc_matches', '0005_matchlineup_matchlineupplayer'),
    ]

    operations = [
        migrations.DeleteModel(
            name='PenaltyAppeal',
        ),
        migrations.DeleteModel(
            name='Penalty',
        ),
    ]
