"""
Management command to verify token-to-draft isolation fix.

Usage: python manage.py test_token_isolation
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from proveedores.models import InvitacionRadicacion, CuentaCobro
from proveedores.wizard_serializers import WizardCreateSerializer
from tenancy.models import Empresa
from terceros.models import Tercero


class Command(BaseCommand):
    help = 'Test token-to-draft isolation to verify the bug fix'

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("TESTING TOKEN-TO-DRAFT ISOLATION"))
        self.stdout.write("="*60 + "\n")
        
        # Setup: Get or create test data
        empresa = Empresa.objects.first()
        if not empresa:
            self.stdout.write(self.style.ERROR("❌ No empresa found. Please create one first."))
            return
        
        # Find an approved proveedor
        proveedor = Tercero.objects.filter(
            estado='APROBADO',
            tipos__code__in=['PROVEEDOR', 'CONTRATISTA']
        ).first()
        
        if not proveedor:
            self.stdout.write(self.style.ERROR("❌ No approved proveedor found. Please create one first."))
            return
        
        self.stdout.write(f"📋 Using empresa: {empresa.nombre}")
        nombre_proveedor = proveedor.razon_social if hasattr(proveedor, 'razon_social') and proveedor.razon_social else str(proveedor)
        self.stdout.write(f"📋 Using proveedor: {nombre_proveedor}\n")
        
        # Clean up any existing test invitations and their drafts
        self.stdout.write("Cleaning up existing test data...")
        test_invitations = InvitacionRadicacion.objects.filter(email__startswith='test_token_')
        for inv in test_invitations:
            if inv.cuenta_cobro:
                inv.cuenta_cobro.delete()
        test_invitations.delete()
        
        # Also clean up any orphaned BORRADOR drafts for this proveedor
        CuentaCobro.objects.filter(
            empresa=empresa,
            proveedor=proveedor,
            estado=CuentaCobro.Estado.BORRADOR,
            numero=''
        ).delete()
        self.stdout.write(self.style.SUCCESS("✅ Cleanup complete\n"))
        
        try:
            # TEST 1: Create two different invitations for the same proveedor
            self.stdout.write("TEST 1: Creating two invitations for same proveedor...")
            inv1 = InvitacionRadicacion.objects.create(
                empresa=empresa,
                proveedor=proveedor,
                email='test_token_user1@example.com'
            )
            inv2 = InvitacionRadicacion.objects.create(
                empresa=empresa,
                proveedor=proveedor,
                email='test_token_user2@example.com'
            )
            self.stdout.write(self.style.SUCCESS(f"✅ Created invitation 1: token={inv1.token[:8]}..."))
            self.stdout.write(self.style.SUCCESS(f"✅ Created invitation 2: token={inv2.token[:8]}...\n"))
            
            # TEST 2: Create draft from first token
            self.stdout.write("TEST 2: Creating draft from invitation 1...")
            serializer1 = WizardCreateSerializer(
                data={'token': inv1.token},
                context={'empresa': empresa}
            )
            serializer1.is_valid(raise_exception=True)
            draft1 = serializer1.save()
            self.stdout.write(self.style.SUCCESS(f"✅ Created draft 1: ID={draft1.id}"))
            
            # Verify FK relationship
            inv1.refresh_from_db()
            if inv1.cuenta_cobro_id == draft1.id:
                self.stdout.write(self.style.SUCCESS(f"✅ FK relationship correct: inv1.cuenta_cobro_id={inv1.cuenta_cobro_id}\n"))
            else:
                self.stdout.write(self.style.ERROR(f"❌ FK relationship ERROR: inv1.cuenta_cobro_id={inv1.cuenta_cobro_id} != draft1.id={draft1.id}\n"))
                return
            
            # TEST 3: Idempotent - same token should return same draft
            self.stdout.write("TEST 3: Testing idempotent behavior (same token)...")
            serializer1_again = WizardCreateSerializer(
                data={'token': inv1.token},
                context={'empresa': empresa}
            )
            serializer1_again.is_valid(raise_exception=True)
            draft1_again = serializer1_again.save()
            
            if draft1.id == draft1_again.id:
                self.stdout.write(self.style.SUCCESS(f"✅ IDEMPOTENT: Same token returned same draft (ID={draft1.id})\n"))
            else:
                self.stdout.write(self.style.ERROR(f"❌ IDEMPOTENT FAILED: Got different draft (ID={draft1_again.id} vs {draft1.id})\n"))
                return
            
            # TEST 4: Create draft from second token (should be different)
            self.stdout.write("TEST 4: Creating draft from invitation 2 (should be isolated)...")
            serializer2 = WizardCreateSerializer(
                data={'token': inv2.token},
                context={'empresa': empresa}
            )
            serializer2.is_valid(raise_exception=True)
            draft2 = serializer2.save()
            self.stdout.write(self.style.SUCCESS(f"✅ Created draft 2: ID={draft2.id}"))
            
            # Verify FK relationship
            inv2.refresh_from_db()
            if inv2.cuenta_cobro_id == draft2.id:
                self.stdout.write(self.style.SUCCESS(f"✅ FK relationship correct: inv2.cuenta_cobro_id={inv2.cuenta_cobro_id}\n"))
            else:
                self.stdout.write(self.style.ERROR(f"❌ FK relationship ERROR: inv2.cuenta_cobro_id={inv2.cuenta_cobro_id} != draft2.id={draft2.id}\n"))
                return
            
            # TEST 5: Verify isolation - drafts should be different
            self.stdout.write("TEST 5: Verifying draft isolation...")
            if draft1.id != draft2.id:
                self.stdout.write(self.style.SUCCESS(f"✅ ISOLATION VERIFIED: Different tokens created different drafts"))
                self.stdout.write(f"   Draft 1 ID: {draft1.id}")
                self.stdout.write(f"   Draft 2 ID: {draft2.id}\n")
            else:
                self.stdout.write(self.style.ERROR(f"❌ ISOLATION FAILED: Both tokens returned same draft (ID={draft1.id})\n"))
                return
            
            # TEST 6: Simulate data modification to verify no cross-contamination
            self.stdout.write("TEST 6: Testing data isolation (no cross-contamination)...")
            original_draft2_numero = draft2.numero  # Save original placeholder
            draft1.numero = "FACTURA-001"
            draft1.periodo = "ENERO-2026"
            draft1.save()
            
            draft2.refresh_from_db()
            if draft2.numero == original_draft2_numero and draft2.numero != "FACTURA-001" and draft2.periodo == "":
                self.stdout.write(self.style.SUCCESS(f"✅ DATA ISOLATION: Draft 2 unchanged"))
                self.stdout.write(f"   Draft 1: numero={draft1.numero}, periodo={draft1.periodo}")
                self.stdout.write(f"   Draft 2: numero={draft2.numero or '(empty)'}, periodo={draft2.periodo or '(empty)'}\n")
            else:
                self.stdout.write(self.style.ERROR(f"❌ DATA CONTAMINATION: Draft 2 has data from Draft 1"))
                self.stdout.write(f"   Draft 2: numero={draft2.numero}, periodo={draft2.periodo}\n")
                return
            
            # Summary
            self.stdout.write("="*60)
            self.stdout.write(self.style.SUCCESS("🎉 ALL TESTS PASSED!"))
            self.stdout.write("="*60)
            self.stdout.write(self.style.SUCCESS("✅ Token-to-draft isolation is working correctly"))
            self.stdout.write(self.style.SUCCESS("✅ Idempotent behavior is working correctly"))
            self.stdout.write(self.style.SUCCESS("✅ No cross-contamination between invitations"))
            self.stdout.write(f"\nTest invitations created:")
            self.stdout.write(f"  - Invitation 1: {inv1.email} (token: {inv1.token[:12]}...)")
            self.stdout.write(f"  - Invitation 2: {inv2.email} (token: {inv2.token[:12]}...)")
            self.stdout.write("="*60 + "\n")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n❌ Test failed with exception: {str(e)}"))
            import traceback
            traceback.print_exc()
