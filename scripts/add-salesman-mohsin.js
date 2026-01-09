/**
 * Add Salesman: Mohsin
 * Email: mhm313@yahoo.com
 * Password: 123456
 * Salary: 40000
 * Commission: 1%
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addSalesmanMohsin() {
  try {
    console.log('🚀 Starting salesman creation for Mohsin...\n');

    // Step 1: Get current admin's business_id
    const { data: { users } } = await supabase.auth.admin.listUsers();
    
    if (!users || users.length === 0) {
      throw new Error('No users found. Please ensure at least one admin user exists.');
    }

    // Get first admin user's business_id
    const adminUser = users[0];
    console.log(`📋 Using admin user: ${adminUser.email} (ID: ${adminUser.id})`);

    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('business_id')
      .eq('user_id', adminUser.id)
      .single();

    if (!adminProfile?.business_id) {
      throw new Error('Admin user does not have a business_id. Please set up business first.');
    }

    const businessId = adminProfile.business_id;
    console.log(`✅ Found business_id: ${businessId}\n`);

    // Step 2: Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail('mhm313@yahoo.com');
    
    if (existingUser?.user) {
      console.log('⚠️  User already exists with email: mhm313@yahoo.com');
      console.log(`   User ID: ${existingUser.user.id}`);
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', existingUser.user.id)
        .single();

      if (existingProfile) {
        console.log('✅ User profile already exists. Updating salesman fields...');
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            role: 'salesman',
            base_salary: 40000,
            commission_percentage: 1.0,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', existingUser.user.id);

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        console.log('✅ Salesman profile updated successfully!');
        console.log('\n📊 Final Details:');
        console.log(`   Name: Mohsin`);
        console.log(`   Email: mhm313@yahoo.com`);
        console.log(`   Role: salesman`);
        console.log(`   Salary: Rs. 40,000`);
        console.log(`   Commission: 1%`);
        console.log(`   User ID: ${existingUser.user.id}`);
        return;
      } else {
        // User exists but no profile - create profile
        console.log('📝 Creating user profile...');
        
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: existingUser.user.id,
            business_id: businessId,
            role: 'salesman',
            base_salary: 40000,
            commission_percentage: 1.0,
          });

        if (profileError) {
          throw new Error(`Failed to create profile: ${profileError.message}`);
        }

        console.log('✅ User profile created successfully!');
        console.log('\n📊 Final Details:');
        console.log(`   Name: Mohsin`);
        console.log(`   Email: mhm313@yahoo.com`);
        console.log(`   Role: salesman`);
        console.log(`   Salary: Rs. 40,000`);
        console.log(`   Commission: 1%`);
        console.log(`   User ID: ${existingUser.user.id}`);
        return;
      }
    }

    // Step 3: Create new user
    console.log('📝 Creating new user...');
    
    const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
      email: 'mhm313@yahoo.com',
      password: '123456',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: 'Mohsin',
      },
    });

    if (signUpError) {
      throw new Error(`Failed to create user: ${signUpError.message}`);
    }

    if (!newUser?.user) {
      throw new Error('User creation failed - no user returned');
    }

    console.log(`✅ User created: ${newUser.user.email} (ID: ${newUser.user.id})`);

    // Step 4: Create user profile with salesman fields
    console.log('📝 Creating user profile with salesman details...');
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: newUser.user.id,
        business_id: businessId,
        role: 'salesman',
        base_salary: 40000,
        commission_percentage: 1.0,
      })
      .select()
      .single();

    if (profileError) {
      // If salesman columns don't exist, try without them
      if (profileError.message.includes('column') || profileError.code === '42703') {
        console.log('⚠️  Salesman columns not found, creating profile without them...');
        
        const { error: retryError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: newUser.user.id,
            business_id: businessId,
            role: 'salesman',
          });

        if (retryError) {
          throw new Error(`Failed to create profile: ${retryError.message}`);
        }

        console.log('✅ User profile created (without salary/commission fields)');
        console.log('⚠️  Note: Please run migration to add base_salary and commission_percentage columns');
      } else {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
    } else {
      console.log('✅ User profile created with salesman fields!');
    }

    console.log('\n🎉 SUCCESS! Salesman added successfully!\n');
    console.log('📊 Final Details:');
    console.log(`   Name: Mohsin`);
    console.log(`   Email: mhm313@yahoo.com`);
    console.log(`   Password: 123456`);
    console.log(`   Role: salesman`);
    console.log(`   Salary: Rs. 40,000`);
    console.log(`   Commission: 1%`);
    console.log(`   User ID: ${newUser.user.id}`);
    console.log(`   Business ID: ${businessId}`);
    console.log('\n✅ User can now login with: mhm313@yahoo.com / 123456');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
addSalesmanMohsin();
