import { Metadata } from 'next';
import { VehicleWorkflowGrid } from '@/components/dashboard/vehicle-workflow-grid';

export const metadata: Metadata = {
  title: 'Dashboard - OMSMS',
  description: 'Vehicle accessory management dashboard overview.',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white bg-slate-700 py-2 px-4 rounded">
          WELCOME, OMSMS
        </h1>
      </div>

      {/* Vehicle Workflow Grid */}
      <VehicleWorkflowGrid />
    </div>
  );
}