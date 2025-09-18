"use client";

import { VehicleWorkflowDashboard } from "@/components/dashboard/vehicle-workflow-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { use } from "react";

interface VehicleWorkflowPageProps {
  params: Promise<{
    vehicleId: string;
  }>;
}

export default function VehicleWorkflowPage({ params }: VehicleWorkflowPageProps) {
  const router = useRouter();
  const { vehicleId } = use(params);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              Vehicle Workflow Dashboard
            </h1>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="py-6">
        <VehicleWorkflowDashboard vehicleId={vehicleId} />
      </div>
    </div>
  );
}