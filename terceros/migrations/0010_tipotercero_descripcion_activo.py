from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('terceros', '0009_descargadocumentostercero'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipotercero',
            name='descripcion',
            field=models.CharField(blank=True, default='', max_length=300),
        ),
        migrations.AddField(
            model_name='tipotercero',
            name='activo',
            field=models.BooleanField(default=True),
        ),
    ]
