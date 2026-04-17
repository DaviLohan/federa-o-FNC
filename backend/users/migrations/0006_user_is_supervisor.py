from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_add_email_verification'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_supervisor',
            field=models.BooleanField(default=False, verbose_name='acesso de supervisor'),
        ),
    ]
