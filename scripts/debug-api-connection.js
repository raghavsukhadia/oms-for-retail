#!/usr/bin/env node

/**
 * Debug script to check API connection and endpoints
 * Run this script to diagnose "Failed to fetch" errors
 */

const http = require('http');
const https = require('https');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const BACKEND_PORT = 3001;

console.log('🔍 OMSMS API Connection Debugger');
console.log('================================\n');

// Parse URL
const url = new URL(API_BASE_URL);
console.log(`📍 Checking API URL: ${API_BASE_URL}`);
console.log(`🌐 Host: ${url.hostname}`);
console.log(`🔌 Port: ${url.port || (url.protocol === 'https:' ? 443 : 80)}`);
console.log(`📋 Protocol: ${url.protocol}\n`);

// Test 1: Check if port is accessible
function checkPort(host, port) {
  return new Promise((resolve) => {
    const client = http.request({
      host,
      port,
      method: 'GET',
      path: '/',
      timeout: 5000
    }, (res) => {
      resolve({ success: true, status: res.statusCode });
    });

    client.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    client.on('timeout', () => {
      resolve({ success: false, error: 'Connection timeout' });
    });

    client.end();
  });
}

// Test 2: Check specific endpoints
function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    const urlObj = new URL(fullUrl);
    
    const client = (urlObj.protocol === 'https:' ? https : http).request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          success: true, 
          status: res.statusCode, 
          data: data.slice(0, 200) + (data.length > 200 ? '...' : '')
        });
      });
    });

    client.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    client.on('timeout', () => {
      resolve({ success: false, error: 'Request timeout' });
    });

    client.end();
  });
}

async function runDiagnostics() {
  console.log('🔧 Running Diagnostics...\n');

  // Test 1: Port accessibility
  console.log('1️⃣ Testing port accessibility...');
  const portResult = await checkPort(url.hostname, url.port || BACKEND_PORT);
  
  if (portResult.success) {
    console.log(`✅ Port ${url.port || BACKEND_PORT} is accessible (Status: ${portResult.status})`);
  } else {
    console.log(`❌ Port ${url.port || BACKEND_PORT} is not accessible: ${portResult.error}`);
    console.log('\n💡 Possible solutions:');
    console.log('   - Make sure the backend server is running');
    console.log('   - Check if the port is correct in your environment configuration');
    console.log('   - Verify no firewall is blocking the connection');
    return;
  }

  // Test 2: Health endpoint
  console.log('\n2️⃣ Testing health endpoint...');
  const healthResult = await checkEndpoint('/health');
  
  if (healthResult.success && healthResult.status === 200) {
    console.log('✅ Health endpoint is working');
    console.log(`📝 Response preview: ${healthResult.data}`);
  } else {
    console.log(`❌ Health endpoint failed: ${healthResult.error || `Status ${healthResult.status}`}`);
  }

  // Test 3: Locations endpoint (the one that's failing)
  console.log('\n3️⃣ Testing locations endpoint...');
  const locationsResult = await checkEndpoint('/locations?status=active&limit=100');
  
  if (locationsResult.success) {
    if (locationsResult.status === 200) {
      console.log('✅ Locations endpoint is working');
      console.log(`📝 Response preview: ${locationsResult.data}`);
    } else if (locationsResult.status === 401) {
      console.log('⚠️ Locations endpoint requires authentication');
      console.log('💡 This is expected - try logging in first');
    } else {
      console.log(`⚠️ Locations endpoint returned status ${locationsResult.status}`);
      console.log(`📝 Response: ${locationsResult.data}`);
    }
  } else {
    console.log(`❌ Locations endpoint failed: ${locationsResult.error}`);
  }

  // Test 4: New master data endpoints
  console.log('\n4️⃣ Testing new master data endpoints...');
  const endpoints = ['/sales', '/coordinators', '/supervisors', '/accounts'];
  
  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint);
    if (result.success) {
      console.log(`✅ ${endpoint} endpoint accessible (Status: ${result.status})`);
    } else {
      console.log(`❌ ${endpoint} endpoint failed: ${result.error}`);
    }
  }

  console.log('\n📋 Environment Check:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || 'not set'}`);
  
  console.log('\n🎯 Troubleshooting Guide:');
  console.log('=======================');
  console.log('1. Ensure backend server is running:');
  console.log('   cd packages/backend && npm run dev');
  console.log('');
  console.log('2. Check environment variables:');
  console.log('   Frontend: NEXT_PUBLIC_API_URL=http://localhost:3001/api');
  console.log('   Backend: PORT=3001');
  console.log('');
  console.log('3. Verify CORS configuration allows your frontend URL');
  console.log('');
  console.log('4. Check if authentication is required and properly configured');
}

runDiagnostics().catch(console.error);