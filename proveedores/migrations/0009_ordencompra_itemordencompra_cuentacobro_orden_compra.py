# Generated manually on 2026-03-26

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0006_contratoanexo_contratoflujo'),
        ('proveedores', '0008_comprobantepago'),
        ('tenancy', '0001_initial'),
        ('terceros', '0003_invitacionvinculacion_tipo_tercero'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='OrdenCompra',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero_oc', models.CharField(
                    blank=True, max_length=50, unique=True,
                    help_text='Ej: OC-2026-0001. Se auto-genera si se deja vacío.'
                )),
                ('tipo', models.CharField(
                    choices=[('COMPRA', 'Orden de Compra')],
                    default='COMPRA', max_length=10,
                )),
                ('objeto', models.TextField(help_text='Descripción de los bienes o servicios a adquirir')),
                ('valor_sin_iva', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('iva', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('valor_total', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('fecha_emision', models.DateField()),
                ('fecha_entrega', models.DateField(blank=True, null=True)),
                ('estado', models.CharField(
                    choices=[
                        ('BORRADOR', 'Borrador'),
                        ('EMITIDA', 'Emitida'),
                        ('APROBADA', 'Aprobada'),
                        ('EN_EJECUCION', 'En ejecución'),
                        ('CUMPLIDA', 'Cumplida'),
                        ('ANULADA', 'Anulada'),
                    ],
                    default='BORRADOR', max_length=15,
                )),
                ('observaciones', models.TextField(blank=True, default='')),
                ('archivo', models.FileField(
                    blank=True, null=True,
                    upload_to='ordenes_compra/%Y/%m/',
                    help_text='PDF de la orden de compra',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('contrato', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='ordenes_compra',
                    to='contratos.contrato',
                )),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='ordenes_compra_creadas',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('empresa', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='ordenes_compra',
                    to='tenancy.empresa',
                )),
                ('tercero', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='ordenes_compra',
                    to='terceros.tercero',
                )),
            ],
            options={
                'verbose_name': 'Orden de Compra',
                'verbose_name_plural': 'Órdenes de Compra',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ItemOrdenCompra',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('descripcion', models.CharField(max_length=500)),
                ('cantidad', models.DecimalField(decimal_places=2, default=1, max_digits=12)),
                ('valor_unitario', models.DecimalField(decimal_places=2, max_digits=18)),
                ('valor_total', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('orden_compra', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='items',
                    to='proveedores.ordencompra',
                )),
            ],
            options={
                'verbose_name': 'Ítem de Orden de Compra',
                'ordering': ['id'],
            },
        ),
        migrations.AddField(
            model_name='cuentacobro',
            name='orden_compra',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cuentas_cobro',
                to='proveedores.ordencompra',
                help_text='Orden de compra contra la que se radica',
            ),
        ),
    ]
