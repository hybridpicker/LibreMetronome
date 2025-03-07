# Generated by Django 4.2.18 on 2025-01-25 04:48

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='MetronomeSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tempo', models.IntegerField(default=120)),
                ('volume', models.FloatField(default=1.0)),
                ('swing', models.FloatField(default=0.0)),
                ('subdivisions', models.IntegerField(default=4)),
            ],
        ),
    ]
