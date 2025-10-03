// Test script to verify vehicle creation API is working
const fetch = require('node-fetch');

const API_URL = 'https://omsms-backend-610250363653.asia-south1.run.app/api';

// Test vehicle data
const testVehicle = {
  carNumber: 'TEST123',
  ownerName: 'Test Owner',
  ownerMobile: '+91-9999999999',
  ownerEmail: 'test@example.com',
  ownerAddress: 'Test Address',
  modelName: 'Test Model',
  brandName: 'Test Brand',
  vehicleType: 'Hatchback',
  inwardDate: new Date().toISOString().split('T')[0],
  expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
};

async function testVehicleCreation() {
  console.log('🧪 Testing vehicle creation API...');
  
  try {
    // Test creating a vehicle
    console.log('📤 Sending vehicle creation request...');
    const response = await fetch(`${API_URL}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'demo'
      },
      body: JSON.stringify(testVehicle)
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers));
    
    const responseData = await response.text();
    console.log('📥 Response body:', responseData);
    
    if (response.ok) {
      console.log('✅ Vehicle creation successful!');
      
      // Parse the response
      const result = JSON.parse(responseData);
      if (result.data && result.data.vehicleId) {
        console.log('🆔 Created vehicle ID:', result.data.vehicleId);
        
        // Test getting vehicles to verify persistence
        console.log('\n📋 Testing vehicle retrieval...');
        const getResponse = await fetch(`${API_URL}/vehicles`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': 'demo'
          }
        });
        
        const getResponseData = await getResponse.text();
        console.log('📥 Get vehicles response:', getResponseData);
        
        if (getResponse.ok) {
          const vehicles = JSON.parse(getResponseData);
          console.log('📊 Total vehicles found:', vehicles.data ? vehicles.data.length : 0);
        }
      }
    } else {
      console.log('❌ Vehicle creation failed');
      if (response.status === 401) {
        console.log('🔐 Authentication required - this is expected');
      } else if (response.status === 404) {
        console.log('🔍 Endpoint not found - check if vehicles route is configured');
      } else if (response.status === 500) {
        console.log('💥 Server error - check backend logs');
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testVehicleCreation().catch(console.error);

