/**
 * Test Script: Automatic Production Order Creation from Sale
 * 
 * This script tests the automatic production order creation
 * when a sale is created with products that have requires_production = true
 */

import { createSale } from './src/services/salesService.js';
import { supabase } from './src/config/supabase.js';

// Test configuration
const TEST_CONFIG = {
  businessId: 1, // Studio Rently POS
  locationId: 9, // test location
  userId: '10cb8bd6-887c-4fb4-9eeb-6a8f829fce26', // User ID from user_profiles
  variationId: 138, // T-Shirt Cotton Premium (product_id: 169, requires_production: true)
  unitId: 24, // Piece
  quantity: 2
};

async function testProductionOrderCreation() {
  console.log('🧪 Testing Automatic Production Order Creation from Sale\n');
  console.log('Test Configuration:');
  console.log(`  Business ID: ${TEST_CONFIG.businessId}`);
  console.log(`  Location ID: ${TEST_CONFIG.locationId}`);
  console.log(`  Variation ID: ${TEST_CONFIG.variationId} (T-Shirt Cotton Premium)`);
  console.log(`  Quantity: ${TEST_CONFIG.quantity}\n`);

  try {
    // Step 1: Create a test sale with status = 'final'
    console.log('📝 Step 1: Creating test sale...');
    
    const saleData = {
      locationId: TEST_CONFIG.locationId,
      customerType: 'retail',
      items: [
        {
          variationId: TEST_CONFIG.variationId,
          unitId: TEST_CONFIG.unitId,
          quantity: TEST_CONFIG.quantity
        }
      ],
      paymentMethod: 'cash',
      status: 'final' // CRITICAL: Must be 'final' to trigger production order
    };

    const result = await createSale(
      saleData,
      TEST_CONFIG.businessId,
      TEST_CONFIG.userId
    );

    const saleId = result.transaction.id;
    const invoiceNo = result.transaction.invoice_no;

    console.log('✅ Sale created successfully!');
    console.log(`   Sale ID: ${saleId}`);
    console.log(`   Invoice No: ${invoiceNo}\n`);

    // Step 2: Wait a moment for async operations
    console.log('⏳ Waiting for production order creation...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Verify production order was created
    console.log('🔍 Step 2: Verifying production order creation...');
    
    const { data: productionOrder, error: poError } = await supabase
      .from('production_orders')
      .select('*')
      .eq('transaction_id', saleId)
      .eq('business_id', TEST_CONFIG.businessId)
      .single();

    if (poError) {
      if (poError.code === 'PGRST116') {
        console.log('❌ Production order NOT created!');
        console.log('   Error: No production order found for this sale');
        console.log('   This may indicate:');
        console.log('   - Product does not have requires_production = true');
        console.log('   - Backend integration not working');
        console.log('   - Error occurred during production order creation');
        return;
      } else {
        throw poError;
      }
    }

    console.log('✅ Production order created successfully!');
    console.log(`   Production Order ID: ${productionOrder.id}`);
    console.log(`   Order No: ${productionOrder.order_no}`);
    console.log(`   Transaction ID: ${productionOrder.transaction_id}`);
    console.log(`   Business ID: ${productionOrder.business_id}`);
    console.log(`   Location ID: ${productionOrder.location_id}`);
    console.log(`   Status: ${productionOrder.status}\n`);

    // Step 4: Verify production order fields
    console.log('🔍 Step 3: Verifying production order fields...');
    
    const expectedOrderNo = `PO-${invoiceNo}`;
    const fieldChecks = [
      {
        field: 'transaction_id',
        expected: saleId,
        actual: productionOrder.transaction_id,
        pass: productionOrder.transaction_id === saleId
      },
      {
        field: 'order_no',
        expected: expectedOrderNo,
        actual: productionOrder.order_no,
        pass: productionOrder.order_no === expectedOrderNo
      },
      {
        field: 'business_id',
        expected: TEST_CONFIG.businessId,
        actual: productionOrder.business_id,
        pass: productionOrder.business_id === TEST_CONFIG.businessId
      },
      {
        field: 'location_id',
        expected: TEST_CONFIG.locationId,
        actual: productionOrder.location_id,
        pass: productionOrder.location_id === TEST_CONFIG.locationId
      }
    ];

    let allPassed = true;
    fieldChecks.forEach(check => {
      const status = check.pass ? '✅' : '❌';
      console.log(`   ${status} ${check.field}: ${check.actual} (expected: ${check.expected})`);
      if (!check.pass) allPassed = false;
    });

    if (!allPassed) {
      console.log('\n❌ Some field verifications failed!');
      return;
    }

    console.log('\n✅ All field verifications passed!\n');

    // Step 5: Verify production steps were created
    console.log('🔍 Step 4: Verifying production steps...');
    
    const { data: steps, error: stepsError } = await supabase
      .from('production_steps')
      .select('*')
      .eq('production_order_id', productionOrder.id)
      .order('id');

    if (stepsError) {
      console.log(`❌ Error fetching production steps: ${stepsError.message}`);
      return;
    }

    console.log(`✅ Production steps created: ${steps.length}`);
    steps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.step_name} (Status: ${step.status})`);
    });

    // Step 6: Verify production materials (optional)
    console.log('\n🔍 Step 5: Verifying production materials...');
    
    const { data: materials, error: materialsError } = await supabase
      .from('production_materials')
      .select('*')
      .eq('production_order_id', productionOrder.id);

    if (materialsError) {
      console.log(`⚠️  Error fetching production materials: ${materialsError.message}`);
    } else {
      console.log(`✅ Production materials created: ${materials.length}`);
      materials.forEach((material, index) => {
        console.log(`   ${index + 1}. Product ID: ${material.product_id}, Quantity: ${material.quantity_used}`);
      });
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Sale ID: ${saleId}`);
    console.log(`✅ Invoice No: ${invoiceNo}`);
    console.log(`✅ Production Order ID: ${productionOrder.id}`);
    console.log(`✅ Order No: ${productionOrder.order_no}`);
    console.log(`✅ Production Steps: ${steps.length}`);
    console.log(`✅ Production Materials: ${materials?.length || 0}`);
    console.log('='.repeat(60));
    console.log('\n✅ TEST PASSED: Automatic production order creation is working!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testProductionOrderCreation()
  .then(() => {
    console.log('Test completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
