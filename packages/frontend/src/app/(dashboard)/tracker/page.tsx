'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Wrench, ClipboardList, Activity, ArrowRight, Users, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function TrackerOverviewPage() {
  const trackerModules = [
    {
      title: "Call Follow-Up Tracker",
      description: "Track and manage customer follow-up calls and communications",
      href: "/tracker/call-follow-up",
      icon: Phone,
      stats: {
        active: 12,
        pending: 8,
        completed: 45
      },
      features: [
        "Caller details management",
        "Operator assignment",
        "Priority levels",
        "Response time tracking",
        "Clickable phone numbers"
      ]
    },
    {
      title: "Service Tracker",
      description: "Manage service jobs, maintenance, and repair operations",
      href: "/tracker/service",
      icon: Wrench,
      stats: {
        active: 6,
        pending: 4,
        completed: 32
      },
      features: [
        "Service job management",
        "Status workflow tracking",
        "File attachments",
        "Comment system",
        "Scheduled appointments"
      ]
    },
    {
      title: "Customer Requirements Tracker",
      description: "Track customer requirements, requests, and project specifications",
      href: "/tracker/requirements",
      icon: ClipboardList,
      stats: {
        active: 9,
        pending: 7,
        completed: 28
      },
      features: [
        "Requirement details",
        "Priority management",
        "Status tracking",
        "File attachments",
        "Progress tracking"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tracker</h1>
          <p className="text-muted-foreground">
            Comprehensive tracking capabilities for different business processes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">27</div>
            <p className="text-xs text-muted-foreground">
              Across all tracker modules
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">19</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">105</div>
            <p className="text-xs text-muted-foreground">
              Successfully processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tracker Modules */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {trackerModules.map((module) => {
          const IconComponent = module.icon;
          return (
            <Card key={module.href} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {module.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{module.stats.active}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{module.stats.pending}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{module.stats.completed}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Key Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    {module.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <Button asChild className="w-full">
                  <Link href={module.href}>
                    Open {module.title}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks across all tracker modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" asChild>
              <Link href="/tracker/call-follow-up?action=new">
                <Phone className="mr-2 h-4 w-4" />
                New Call Follow-Up
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tracker/service?action=new">
                <Wrench className="mr-2 h-4 w-4" />
                New Service Job
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tracker/requirements?action=new">
                <ClipboardList className="mr-2 h-4 w-4" />
                New Requirement
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
