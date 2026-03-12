"""
Test script to verify the token-to-draft isolation fix.

Run this script in Django shell to verify that:
1. Each invitation token creates its own isolated draft
2. Same token returns same draft (idempotent)
3. Different tokens for same proveedor get different drafts
"""

from proveedores.models import InvitacionRadicacion, CuentaCobro
from proveedores.wizard_serializers import WizardCreateSerializer
from tenancy.models import Empresa
from terceros.models import Tercero
from contratos.models import Contrato

def test_token_isolation():
    print("\n" + "="*60)
    print("TESTING TOKEN-TO-DRAFT ISOLATION")
    print("="*60 + "\n")
    
    # Setup: Get or create test data
    empresa = Empresa.objects.first()
    if not empresa:
        print("❌ No empresa found. Please create one first.")
        return
    
    # Find an approved proveedor
    proveedor = Tercero.objects.filter(
        estado='APROBADO',
        tipos__code__in=['PROVEEDOR', 'CONTRATISTA']
    ).first()
    
    if not proveedor:
        print("❌ No approved proveedor found. Please create one first.")
        return
    
    print(f"📋 Using empresa: {empresa.nombre}")
    print(f"📋 Using proveedor: {proveedor.razon_social or proveedor.nombre_completo}\n")
    
    # Clean up any existing test invitations
    InvitacionRadicacion.objects.filter(email__startswith='test_').delete()
    
    # TEST 1: Create two different invitations for the same proveedor
    print("TEST 1: Creating two invitations for same proveedor...")
    inv1 = InvitacionRadicacion.objects.create(
        empresa=empresa,
        proveedor=proveedor,
        email='test_user1@example.com'
    )
    inv2 = InvitacionRadicacion.objects.create(
        empresa=empresa,
        proveedor=proveedor,
        email='test_user2@example.com'
    )
    print(f"✅ Created invitation 1: token={inv1.token[:8]}...")
    print(f"✅ Created invitation 2: token={inv2.token[:8]}...\n")
    
    # TEST 2: Create draft from first token
    print("TEST 2: Creating draft from invitation 1...")
    serializer1 = WizardCreateSerializer(
        data={'token': inv1.token},
        context={'empresa': empresa}
    )
    serializer1.is_valid(raise_exception=True)
    draft1 = serializer1.save()
    print(f"✅ Created draft 1: ID={draft1.id}")
    
    # Verify FK relationship
    inv1.refresh_from_db()
    if inv1.cuenta_cobro_id == draft1.id:
        print(f"✅ FK relationship correct: inv1.cuenta_cobro_id={inv1.cuenta_cobro_id}\n")
    else:
        print(f"❌ FK relationship ERROR: inv1.cuenta_cobro_id={inv1.cuenta_cobro_id} != draft1.id={draft1.id}\n")
        return
    
    # TEST 3: Idempotent - same token should return same draft
    print("TEST 3: Testing idempotent behavior (same token)...")
    serializer1_again = WizardCreateSerializer(
        data={'token': inv1.token},
        context={'empresa': empresa}
    )
    serializer1_again.is_valid(raise_exception=True)
    draft1_again = serializer1_again.save()
    
    if draft1.id == draft1_again.id:
        print(f"✅ IDEMPOTENT: Same token returned same draft (ID={draft1.id})\n")
    else:
        print(f"❌ IDEMPOTENT FAILED: Got different draft (ID={draft1_again.id} vs {draft1.id})\n")
        return
    
    # TEST 4: Create draft from second token (should be different)
    print("TEST 4: Creating draft from invitation 2 (should be isolated)...")
    serializer2 = WizardCreateSerializer(
        data={'token': inv2.token},
        context={'empresa': empresa}
    )
    serializer2.is_valid(raise_exception=True)
    draft2 = serializer2.save()
    print(f"✅ Created draft 2: ID={draft2.id}")
    
    # Verify FK relationship
    inv2.refresh_from_db()
    if inv2.cuenta_cobro_id == draft2.id:
        print(f"✅ FK relationship correct: inv2.cuenta_cobro_id={inv2.cuenta_cobro_id}\n")
    else:
        print(f"❌ FK relationship ERROR: inv2.cuenta_cobro_id={inv2.cuenta_cobro_id} != draft2.id={draft2.id}\n")
        return
    
    # TEST 5: Verify isolation - drafts should be different
    print("TEST 5: Verifying draft isolation...")
    if draft1.id != draft2.id:
        print(f"✅ ISOLATION VERIFIED: Different tokens created different drafts")
        print(f"   Draft 1 ID: {draft1.id}")
        print(f"   Draft 2 ID: {draft2.id}\n")
    else:
        print(f"❌ ISOLATION FAILED: Both tokens returned same draft (ID={draft1.id})\n")
        return
    
    # TEST 6: Simulate data modification to verify no cross-contamination
    print("TEST 6: Testing data isolation (no cross-contamination)...")
    draft1.numero = "FACTURA-001"
    draft1.periodo = "ENERO-2026"
    draft1.save()
    
    draft2.refresh_from_db()
    if draft2.numero == "" and draft2.periodo == "":
        print(f"✅ DATA ISOLATION: Draft 2 remains empty")
        print(f"   Draft 1: numero={draft1.numero}, periodo={draft1.periodo}")
        print(f"   Draft 2: numero={draft2.numero or '(empty)'}, periodo={draft2.periodo or '(empty)'}\n")
    else:
        print(f"❌ DATA CONTAMINATION: Draft 2 has data from Draft 1")
        print(f"   Draft 2: numero={draft2.numero}, periodo={draft2.periodo}\n")
        return
    
    # Summary
    print("="*60)
    print("🎉 ALL TESTS PASSED!")
    print("="*60)
    print(f"✅ Token-to-draft isolation is working correctly")
    print(f"✅ Idempotent behavior is working correctly")
    print(f"✅ No cross-contamination between invitations")
    print(f"\nTest invitations created:")
    print(f"  - Invitation 1: {inv1.email} (token: {inv1.token[:12]}...)")
    print(f"  - Invitation 2: {inv2.email} (token: {inv2.token[:12]}...)")
    print(f"\nCleanup command (optional):")
    print(f"  InvitacionRadicacion.objects.filter(email__startswith='test_').delete()")
    print("="*60 + "\n")

# Run the test
if __name__ == '__main__':
    test_token_isolation()
