"""
Comando de gestion para normalizar el campo `periodo` de CuentaCobro.

Los registros creados antes del cambio de formulario usaban texto libre
(ej: "ENERO-2026") en lugar del formato YYYY-MM que exige el nuevo selector
de mes (ej: "2026-01"). Este comando convierte los valores existentes al
nuevo formato estandar.

Uso:
    py manage.py normalizar_periodos [--dry-run]
"""

import re
from django.core.management.base import BaseCommand
from proveedores.models import CuentaCobro

# Mapa de nombres de mes en espanol -> numero de mes (2 digitos)
MESES_ES = {
    'enero': '01', 'febrero': '02', 'marzo': '03',
    'abril': '04', 'mayo': '05', 'junio': '06',
    'julio': '07', 'agosto': '08', 'septiembre': '09',
    'octubre': '10', 'noviembre': '11', 'diciembre': '12',
}


def normalizar_periodo(valor: str) -> str | None:
    """
    Intenta convertir un periodo en texto libre al formato YYYY-MM.

    Ejemplos de entrada soportados:
    - "ENERO-2026" -> "2026-01"
    - "Enero 2026" -> "2026-01"
    - "enero-2026" -> "2026-01"
    - "2026-01"   -> "2026-01" (ya normalizado, no cambia)

    Retorna None si no puede interpretar el valor.
    """
    if not valor:
        return None

    valor_norm = valor.strip().lower()

    # Ya esta en formato YYYY-MM, no requiere conversion
    if re.match(r'^\d{4}-\d{2}$', valor_norm):
        return valor_norm

    # Intentar patron: NOMBRE_MES[-/\s]YYYY  o  YYYY[-/\s]NOMBRE_MES
    patron = r'([a-z]+)[\s\-_/](\d{4})'
    match = re.match(patron, valor_norm)
    if not match:
        # Intentar patron invertido: YYYY[-/\s]NOMBRE_MES
        patron_inv = r'(\d{4})[\s\-_/]([a-z]+)'
        match_inv = re.match(patron_inv, valor_norm)
        if match_inv:
            anio = match_inv.group(1)
            mes_nombre = match_inv.group(2)
        else:
            return None
    else:
        mes_nombre = match.group(1)
        anio = match.group(2)

    mes_numero = MESES_ES.get(mes_nombre)
    if not mes_numero:
        return None

    return f"{anio}-{mes_numero}"


class Command(BaseCommand):
    help = "Normaliza el campo `periodo` de CuentaCobro al formato YYYY-MM."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra los cambios que se harian sin aplicarlos.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("Modo DRY-RUN: no se guardaran cambios."))

        cuentas = CuentaCobro.objects.all()
        actualizadas = 0
        omitidas = 0
        errores = 0

        for cuenta in cuentas:
            periodo_orig = cuenta.periodo or ''

            # Si ya tiene formato correcto, omitir
            if re.match(r'^\d{4}-\d{2}$', periodo_orig):
                omitidas += 1
                continue

            periodo_nuevo = normalizar_periodo(periodo_orig)

            if periodo_nuevo is None:
                self.stdout.write(
                    self.style.ERROR(
                        f"  [ID={cuenta.id}] No se pudo interpretar periodo='{periodo_orig}'"
                    )
                )
                errores += 1
                continue

            self.stdout.write(
                f"  [ID={cuenta.id}] '{periodo_orig}' -> '{periodo_nuevo}'"
            )

            if not dry_run:
                cuenta.periodo = periodo_nuevo
                cuenta.save(update_fields=['periodo'])

            actualizadas += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Resultado: {actualizadas} actualizadas, {omitidas} omitidas (ya normalizadas), {errores} errores."
        ))
        if dry_run:
            self.stdout.write(self.style.WARNING("Ejecuta sin --dry-run para aplicar los cambios."))
