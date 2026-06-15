from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fnc_championships', '0008_alter_championship_start_date_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='championship',
            name='group_stage_format',
            field=models.CharField(
                choices=[('SINGLE_ROUND', 'Fase de grupos'), ('ROUND_TRIP', 'Fase de grupos ida e volta')],
                default='SINGLE_ROUND',
                help_text='Define se a fase de grupos terá um ou dois jogos por confronto.',
                max_length=20,
                verbose_name='formato da fase de grupos',
            ),
        ),
    ]
