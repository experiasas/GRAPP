from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('terceros', '0007_tercero_usuario_tokenactivaciontercero'),
    ]

    operations = [
        migrations.AddField(
            model_name='tercero',
            name='responsable_iva',
            field=models.BooleanField(
                blank=True, null=True,
                verbose_name='Responsable de IVA',
                help_text='¿El tercero es responsable de IVA ante la DIAN?'
            ),
        ),
        migrations.AddField(
            model_name='tercero',
            name='agente_retenedor',
            field=models.BooleanField(
                blank=True, null=True,
                verbose_name='Agente Retenedor',
                help_text='¿El tercero actúa como agente retenedor?'
            ),
        ),
        migrations.AddField(
            model_name='tercero',
            name='regimen_tributario',
            field=models.CharField(
                blank=True, null=True,
                max_length=20,
                verbose_name='Régimen Tributario',
                choices=[('ORDINARIO', 'Régimen Ordinario'), ('SIMPLE', 'Régimen Simple de Tributación')],
                help_text='Régimen tributario del tercero'
            ),
        ),
    ]
