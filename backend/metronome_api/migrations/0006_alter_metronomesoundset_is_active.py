# Generated by Django 4.2.16 on 2025-03-24 05:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('metronome_api', '0005_alter_metronomesoundset_options_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='metronomesoundset',
            name='is_active',
            field=models.BooleanField(blank=True, default=False, help_text='This field is kept for backwards compatibility but is not used anymore. Sound set preference is stored in cookies.', null=True),
        ),
    ]
