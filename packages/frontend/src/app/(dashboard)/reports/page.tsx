'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  TrendingUp, 
  Car, 
  Wrench, 
  ClipboardList, 
  DollarSign,
  BarChart3,
  Download
} from "lucide-react";
import Link from "next/link";

interface ReportCard {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  features: string[];
}

const reportCards: ReportCard[] = [
  {
    title: "Vehicle Inward Report",
    description: "Track vehicle intake, expected delivery dates, and status progression",
    icon: Car,
    href: "/reports/vehicle-inward",
    color: "text-blue-600",
    features: ["Date range filtering", "Status tracking", "Delivery timeline", "Export options"]
  },
  {
    title: "Vehicle Installation Report", 
    description: "Monitor product installations, quantities, and associated costs",
    icon: Wrench,
    href: "/reports/vehicle-installation",
    color: "text-green-600",
    features: ["Product breakdown", "Installation tracking", "Cost analysis", "Brand insights"]
  },
  {
    title: "Vehicle Detailed Report",
    description: "Comprehensive vehicle information including installations and payments",
    icon: ClipboardList,
    href: "/reports/vehicle-detailed",
    color: "text-purple-600",
    features: ["Complete vehicle history", "Installation details", "Payment tracking", "Owner information"]
  },
  {
    title: "Account Reports",
    description: "Financial insights, revenue analysis, and business performance metrics",
    icon: DollarSign,
    href: "/reports/accounts",
    color: "text-orange-600",
    features: ["Revenue tracking", "Performance metrics", "Trend analysis", "Financial insights"]
  }
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive reporting and analytics for your vehicle management system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Analytics
          </Badge>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">
              Available report types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Real-time</div>
            <p className="text-xs text-muted-foreground">
              Live data integration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Export Formats</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Excel, CSV</div>
            <p className="text-xs text-muted-foreground">
              Multiple export options
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtering</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Advanced</div>
            <p className="text-xs text-muted-foreground">
              Date range, status, location
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {reportCards.map((report) => {
          const IconComponent = report.icon;
          return (
            <Card key={report.href} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`h-6 w-6 ${report.color}`} />
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
                <CardDescription className="text-sm">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Key Features</h4>
                  <ul className="space-y-1">
                    {report.features.map((feature, index) => (
                      <li key={index} className="text-sm flex items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href={report.href}>
                  <Button className="w-full">
                    View Report
                    <FileText className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Report Features
          </CardTitle>
          <CardDescription>
            All reports include advanced filtering, real-time data, and export capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Data Filtering</h4>
              <p className="text-sm text-muted-foreground">
                Filter by date ranges, locations, salespersons, and status to get precise insights
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Real-time Updates</h4>
              <p className="text-sm text-muted-foreground">
                All reports reflect the latest data from your system with real-time synchronization
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Export Options</h4>
              <p className="text-sm text-muted-foreground">
                Download reports in Excel or CSV format for external analysis and sharing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
