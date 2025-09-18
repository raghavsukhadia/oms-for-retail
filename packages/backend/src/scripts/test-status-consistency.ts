/**
 * Status Consistency Test Script
 * 
 * This script tests the centralized status management system to ensure
 * consistent status calculations across different scenarios.
 */

import { 
  calculateInstallationStatus,
  calculatePaymentStatus,
  normalizeVehicleStatus,
  normalizeInstallationStatus,
  normalizePaymentStatus,
  VEHICLE_STATUSES,
  INSTALLATION_STATUSES,
  PAYMENT_STATUSES,
  type VehicleData
} from '@omsms/shared';

// Test data scenarios
const testScenarios: Array<{
  name: string;
  vehicleData: VehicleData;
  expectedInstallationStatus: string;
  expectedPaymentStatus: string;
}> = [
  {
    name: "Vehicle with no installations",
    vehicleData: {
      vehicleId: "test-1",
      status: VEHICLE_STATUSES.PENDING,
      installations: [],
      workflowInstances: []
    },
    expectedInstallationStatus: INSTALLATION_STATUSES.PENDING,
    expectedPaymentStatus: PAYMENT_STATUSES.PENDING
  },
  {
    name: "Vehicle with completed installations",
    vehicleData: {
      vehicleId: "test-2",
      status: VEHICLE_STATUSES.DELIVERED,
      installations: [
        {
          installationId: "inst-1",
          status: "completed",
          amount: 1000,
          createdAt: new Date()
        }
      ],
      workflowInstances: [],
      totalAmount: 1000,
      totalPaid: 1000
    },
    expectedInstallationStatus: INSTALLATION_STATUSES.COMPLETED,
    expectedPaymentStatus: PAYMENT_STATUSES.PAID
  },
  {
    name: "Vehicle with installation workflow",
    vehicleData: {
      vehicleId: "test-3",
      status: VEHICLE_STATUSES.IN_PROGRESS,
      installations: [
        {
          installationId: "inst-2",
          status: "in_progress",
          amount: 1500,
          createdAt: new Date()
        }
      ],
      workflowInstances: [
        {
          instanceId: "wf-1",
          workflowType: "installation",
          currentStage: "start_installation",
          status: "in_progress",
          stageHistory: []
        }
      ],
      totalAmount: 1500,
      totalPaid: 0
    },
    expectedInstallationStatus: INSTALLATION_STATUSES.IN_PROGRESS,
    expectedPaymentStatus: PAYMENT_STATUSES.PENDING
  },
  {
    name: "Vehicle with partial payment",
    vehicleData: {
      vehicleId: "test-4",
      status: VEHICLE_STATUSES.IN_PROGRESS,
      installations: [
        {
          installationId: "inst-3",
          status: "completed",
          amount: 2000,
          createdAt: new Date()
        }
      ],
      workflowInstances: [
        {
          instanceId: "wf-2",
          workflowType: "payment",
          currentStage: "payment",
          status: "in_progress",
          stageHistory: []
        }
      ],
      totalAmount: 2000,
      totalPaid: 1000
    },
    expectedInstallationStatus: INSTALLATION_STATUSES.COMPLETED,
    expectedPaymentStatus: PAYMENT_STATUSES.PARTIAL
  },
  {
    name: "Overdue vehicle",
    vehicleData: {
      vehicleId: "test-5",
      status: VEHICLE_STATUSES.IN_PROGRESS,
      installations: [
        {
          installationId: "inst-4",
          status: "completed",
          amount: 1200,
          createdAt: new Date()
        }
      ],
      workflowInstances: [],
      expectedDeliveryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      totalAmount: 1200,
      totalPaid: 0
    },
    expectedInstallationStatus: INSTALLATION_STATUSES.COMPLETED,
    expectedPaymentStatus: PAYMENT_STATUSES.OVERDUE
  }
];

// Normalization test cases
const normalizationTests = [
  // Vehicle status normalization
  { input: "In Progress", type: "vehicle", expected: VEHICLE_STATUSES.IN_PROGRESS },
  { input: "QUALITY_CHECK", type: "vehicle", expected: VEHICLE_STATUSES.QUALITY_CHECK },
  { input: "completed", type: "vehicle", expected: VEHICLE_STATUSES.DELIVERED },
  
  // Installation status normalization
  { input: "Done", type: "installation", expected: INSTALLATION_STATUSES.COMPLETED },
  { input: "quality-check", type: "installation", expected: INSTALLATION_STATUSES.QUALITY_CHECK },
  { input: "failed", type: "installation", expected: INSTALLATION_STATUSES.FAILED },
  
  // Payment status normalization
  { input: "Fully Paid", type: "payment", expected: PAYMENT_STATUSES.PAID },
  { input: "partially_paid", type: "payment", expected: PAYMENT_STATUSES.PARTIAL },
  { input: "Late", type: "payment", expected: PAYMENT_STATUSES.OVERDUE }
];

function runStatusCalculationTests() {
  console.log("🧪 Running Status Calculation Tests...\n");
  
  let passed = 0;
  let failed = 0;
  
  testScenarios.forEach((scenario, index) => {
    console.log(`Test ${index + 1}: ${scenario.name}`);
    
    const calculatedInstallationStatus = calculateInstallationStatus(scenario.vehicleData);
    const calculatedPaymentStatus = calculatePaymentStatus(scenario.vehicleData);
    
    const installationMatch = calculatedInstallationStatus === scenario.expectedInstallationStatus;
    const paymentMatch = calculatedPaymentStatus === scenario.expectedPaymentStatus;
    
    if (installationMatch && paymentMatch) {
      console.log("  ✅ PASSED");
      passed++;
    } else {
      console.log("  ❌ FAILED");
      if (!installationMatch) {
        console.log(`    Installation: Expected ${scenario.expectedInstallationStatus}, got ${calculatedInstallationStatus}`);
      }
      if (!paymentMatch) {
        console.log(`    Payment: Expected ${scenario.expectedPaymentStatus}, got ${calculatedPaymentStatus}`);
      }
      failed++;
    }
    console.log();
  });
  
  return { passed, failed };
}

function runNormalizationTests() {
  console.log("🔄 Running Status Normalization Tests...\n");
  
  let passed = 0;
  let failed = 0;
  
  normalizationTests.forEach((test, index) => {
    console.log(`Normalization Test ${index + 1}: "${test.input}" (${test.type})`);
    
    let result: string;
    switch (test.type) {
      case "vehicle":
        result = normalizeVehicleStatus(test.input);
        break;
      case "installation":
        result = normalizeInstallationStatus(test.input);
        break;
      case "payment":
        result = normalizePaymentStatus(test.input);
        break;
      default:
        result = "unknown";
    }
    
    if (result === test.expected) {
      console.log("  ✅ PASSED");
      passed++;
    } else {
      console.log("  ❌ FAILED");
      console.log(`    Expected: ${test.expected}, Got: ${result}`);
      failed++;
    }
    console.log();
  });
  
  return { passed, failed };
}

function main() {
  console.log("🚀 Status Management System Test Suite\n");
  console.log("=" .repeat(50));
  
  const calculationResults = runStatusCalculationTests();
  const normalizationResults = runNormalizationTests();
  
  const totalPassed = calculationResults.passed + normalizationResults.passed;
  const totalFailed = calculationResults.failed + normalizationResults.failed;
  const totalTests = totalPassed + totalFailed;
  
  console.log("=" .repeat(50));
  console.log("📊 Test Results Summary:");
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed} ✅`);
  console.log(`Failed: ${totalFailed} ${totalFailed > 0 ? '❌' : '✅'}`);
  console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  
  if (totalFailed === 0) {
    console.log("\n🎉 All tests passed! Status management system is working correctly.");
  } else {
    console.log("\n⚠️  Some tests failed. Please review the status calculation logic.");
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main();
}

export { runStatusCalculationTests, runNormalizationTests };




