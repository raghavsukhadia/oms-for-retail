import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { getTenantDb } from './database';
import { AnalyticsEngine, AnalyticsFilter } from './analytics';
import { logger } from './logger';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';

export interface ReportConfig {
  title: string;
  description?: string;
  type: 'summary' | 'detailed' | 'analytics' | 'audit';
  format: 'pdf' | 'excel' | 'csv';
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters?: AnalyticsFilter;
  sections?: string[];
  branding?: {
    logo?: string;
    company?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
  };
}

export interface ReportData {
  overview: any;
  analytics: any;
  vehicles: any[];
  workflows: any[];
  users: any[];
  locations: any[];
  auditLogs: any[];
}

export class ReportGenerator {
  /**
   * Generate report in specified format
   */
  static async generateReport(
    tenantId: string,
    config: ReportConfig
  ): Promise<{ filePath: string; fileName: string }> {
    try {
      const reportData = await this.collectReportData(tenantId, config);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${config.title.replace(/\s+/g, '_')}_${timestamp}.${config.format}`;
      const filePath = path.join(process.cwd(), 'temp', 'reports', fileName);
      
      // Ensure reports directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      switch (config.format) {
        case 'pdf':
          await this.generatePDFReport(reportData, config, filePath);
          break;
        case 'excel':
          await this.generateExcelReport(reportData, config, filePath);
          break;
        case 'csv':
          await this.generateCSVReport(reportData, config, filePath);
          break;
        default:
          throw new Error(`Unsupported report format: ${config.format}`);
      }

      return { filePath, fileName };
    } catch (error) {
      logger.error('Error generating report:', error);
      throw new Error('Failed to generate report');
    }
  }

  /**
   * Collect all data needed for the report
   */
  private static async collectReportData(
    tenantId: string,
    config: ReportConfig
  ): Promise<ReportData> {
    const tenantDb = await getTenantDb(tenantId);
    
    const dateFilter = {
      createdAt: {
        gte: config.dateRange.startDate,
        lte: config.dateRange.endDate
      }
    };

    const [
      analyticsData,
      vehicles,
      workflows,
      users,
      locations,
      auditLogs
    ] = await Promise.all([
      AnalyticsEngine.generateDashboardData(tenantId, config.filters),
      this.getVehicleData(tenantDb, dateFilter, config),
      this.getWorkflowData(tenantDb, dateFilter, config),
      this.getUserData(tenantDb, config),
      this.getLocationData(tenantDb, config),
      this.getAuditData(tenantDb, dateFilter, config)
    ]);

    return {
      overview: {
        title: config.title,
        description: config.description,
        generatedAt: new Date(),
        period: {
          startDate: config.dateRange.startDate,
          endDate: config.dateRange.endDate
        },
        tenant: tenantId
      },
      analytics: analyticsData,
      vehicles,
      workflows,
      users,
      locations,
      auditLogs
    };
  }

  /**
   * Generate PDF report
   */
  private static async generatePDFReport(
    data: ReportData,
    config: ReportConfig,
    filePath: string
  ): Promise<void> {
    const doc = new PDFDocument({ margin: 50 });
    const stream = createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(config.title, 50, 50);
    doc.fontSize(12).text(`Generated: ${data.overview.generatedAt.toLocaleString()}`, 50, 80);
    doc.fontSize(12).text(`Period: ${data.overview.period.startDate.toLocaleDateString()} - ${data.overview.period.endDate.toLocaleDateString()}`, 50, 100);
    
    let yPosition = 140;

    // Overview Section
    if (config.sections?.includes('overview') || !config.sections) {
      doc.fontSize(16).text('Executive Summary', 50, yPosition);
      yPosition += 30;
      
      const overview = data.analytics.overview;
      doc.fontSize(12)
        .text(`Total Vehicles: ${overview.totalVehicles.value}`, 50, yPosition)
        .text(`Active Vehicles: ${overview.activeVehicles.value}`, 300, yPosition);
      yPosition += 20;
      
      doc.text(`Completed Vehicles: ${overview.completedVehicles.value}`, 50, yPosition)
        .text(`Revenue: $${overview.revenue.value.toFixed(2)}`, 300, yPosition);
      yPosition += 40;
    }

    // Analytics Section
    if (config.sections?.includes('analytics') || !config.sections) {
      doc.fontSize(16).text('Performance Analytics', 50, yPosition);
      yPosition += 30;
      
      // Vehicle Distribution
      doc.fontSize(14).text('Vehicle Status Distribution:', 50, yPosition);
      yPosition += 20;
      
      data.analytics.distribution.vehiclesByStatus.forEach((item: any) => {
        doc.fontSize(10).text(`${item.category}: ${item.value} (${item.percentage.toFixed(1)}%)`, 70, yPosition);
        yPosition += 15;
      });
      yPosition += 20;
    }

    // Vehicle Details Section
    if (config.sections?.includes('vehicles') || !config.sections) {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(16).text('Vehicle Details', 50, yPosition);
      yPosition += 30;
      
      // Table header
      doc.fontSize(10)
        .text('Car Number', 50, yPosition)
        .text('Owner', 150, yPosition)
        .text('Status', 250, yPosition)
        .text('Location', 350, yPosition)
        .text('Created', 450, yPosition);
      yPosition += 20;
      
      // Table rows
      data.vehicles.slice(0, 20).forEach((vehicle: any) => {
        if (yPosition > 750) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.fontSize(8)
          .text(vehicle.carNumber || 'N/A', 50, yPosition)
          .text(vehicle.ownerName || 'N/A', 150, yPosition)
          .text(vehicle.status || 'N/A', 250, yPosition)
          .text(vehicle.location?.locationName || 'N/A', 350, yPosition)
          .text(vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : 'N/A', 450, yPosition);
        yPosition += 15;
      });
    }

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  /**
   * Generate Excel report
   */
  private static async generateExcelReport(
    data: ReportData,
    config: ReportConfig,
    filePath: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    
    // Overview Sheet
    const overviewSheet = workbook.addWorksheet('Overview');
    
    // Header
    overviewSheet.mergeCells('A1:E1');
    overviewSheet.getCell('A1').value = config.title;
    overviewSheet.getCell('A1').font = { size: 16, bold: true };
    
    overviewSheet.getCell('A3').value = 'Generated:';
    overviewSheet.getCell('B3').value = data.overview.generatedAt.toLocaleString();
    
    overviewSheet.getCell('A4').value = 'Period:';
    overviewSheet.getCell('B4').value = `${data.overview.period.startDate.toLocaleDateString()} - ${data.overview.period.endDate.toLocaleDateString()}`;
    
    // Metrics
    let row = 6;
    overviewSheet.getCell(`A${row}`).value = 'Key Metrics';
    overviewSheet.getCell(`A${row}`).font = { bold: true };
    row++;
    
    const metrics = [
      ['Total Vehicles', data.analytics.overview.totalVehicles.value],
      ['Active Vehicles', data.analytics.overview.activeVehicles.value],
      ['Completed Vehicles', data.analytics.overview.completedVehicles.value],
      ['Revenue', `$${data.analytics.overview.revenue.value.toFixed(2)}`],
      ['Avg Processing Time', `${data.analytics.overview.averageProcessingTime.value.toFixed(1)} days`]
    ];
    
    metrics.forEach(([label, value]) => {
      overviewSheet.getCell(`A${row}`).value = label;
      overviewSheet.getCell(`B${row}`).value = value;
      row++;
    });

    // Vehicles Sheet
    if (config.sections?.includes('vehicles') || !config.sections) {
      const vehiclesSheet = workbook.addWorksheet('Vehicles');
      
      // Headers
      const vehicleHeaders = [
        'Car Number', 'Owner Name', 'Status', 'Location', 'Salesperson',
        'Inward Date', 'Expected Delivery', 'Actual Delivery', 'Created At'
      ];
      
      vehicleHeaders.forEach((header, index) => {
        const cell = vehiclesSheet.getCell(1, index + 1);
        cell.value = header;
        cell.font = { bold: true };
      });
      
      // Data
      data.vehicles.forEach((vehicle, index) => {
        const rowNum = index + 2;
        vehiclesSheet.getCell(rowNum, 1).value = vehicle.carNumber;
        vehiclesSheet.getCell(rowNum, 2).value = vehicle.ownerName;
        vehiclesSheet.getCell(rowNum, 3).value = vehicle.status;
        vehiclesSheet.getCell(rowNum, 4).value = vehicle.location?.locationName || '';
        vehiclesSheet.getCell(rowNum, 5).value = vehicle.salesperson ? 
          `${vehicle.salesperson.firstName || ''} ${vehicle.salesperson.lastName || ''}`.trim() : '';
        vehiclesSheet.getCell(rowNum, 6).value = vehicle.inwardDate ? new Date(vehicle.inwardDate) : '';
        vehiclesSheet.getCell(rowNum, 7).value = vehicle.expectedDeliveryDate ? new Date(vehicle.expectedDeliveryDate) : '';
        vehiclesSheet.getCell(rowNum, 8).value = vehicle.actualDeliveryDate ? new Date(vehicle.actualDeliveryDate) : '';
        vehiclesSheet.getCell(rowNum, 9).value = new Date(vehicle.createdAt);
      });
      
      // Auto-size columns
      vehiclesSheet.columns.forEach(column => {
        column.width = 15;
      });
    }

    // Analytics Sheet
    if (config.sections?.includes('analytics') || !config.sections) {
      const analyticsSheet = workbook.addWorksheet('Analytics');
      
      // Status Distribution
      analyticsSheet.getCell('A1').value = 'Vehicle Status Distribution';
      analyticsSheet.getCell('A1').font = { bold: true };
      
      analyticsSheet.getCell('A3').value = 'Status';
      analyticsSheet.getCell('B3').value = 'Count';
      analyticsSheet.getCell('C3').value = 'Percentage';
      
      data.analytics.distribution.vehiclesByStatus.forEach((item: any, index: number) => {
        const rowNum = index + 4;
        analyticsSheet.getCell(rowNum, 1).value = item.category;
        analyticsSheet.getCell(rowNum, 2).value = item.value;
        analyticsSheet.getCell(rowNum, 3).value = `${item.percentage.toFixed(1)}%`;
      });
    }

    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * Generate CSV report
   */
  private static async generateCSVReport(
    data: ReportData,
    config: ReportConfig,
    filePath: string
  ): Promise<void> {
    const csvLines: string[] = [];
    
    // Header
    csvLines.push(`"${config.title}"`);
    csvLines.push(`"Generated: ${data.overview.generatedAt.toLocaleString()}"`);
    csvLines.push(`"Period: ${data.overview.period.startDate.toLocaleDateString()} - ${data.overview.period.endDate.toLocaleDateString()}"`);
    csvLines.push('');
    
    // Vehicles data
    if (config.sections?.includes('vehicles') || !config.sections) {
      csvLines.push('"Car Number","Owner Name","Status","Location","Salesperson","Created At"');
      
      data.vehicles.forEach((vehicle: any) => {
        const row = [
          vehicle.carNumber || '',
          vehicle.ownerName || '',
          vehicle.status || '',
          vehicle.location?.locationName || '',
          vehicle.salesperson ? 
            `${vehicle.salesperson.firstName || ''} ${vehicle.salesperson.lastName || ''}`.trim() : '',
          vehicle.createdAt ? new Date(vehicle.createdAt).toISOString() : ''
        ].map(field => `"${field}"`).join(',');
        
        csvLines.push(row);
      });
    }
    
    const csvContent = csvLines.join('\n');
    await fs.writeFile(filePath, csvContent, 'utf8');
  }

  // Data collection helper methods
  private static async getVehicleData(tenantDb: any, dateFilter: any, config: ReportConfig): Promise<any[]> {
    if (!config.sections?.includes('vehicles') && config.sections) return [];
    
    return tenantDb.vehicle.findMany({
      where: dateFilter,
      include: {
        location: {
          select: { locationId: true, locationName: true }
        },
        salesperson: {
          select: { userId: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit for performance
    });
  }

  private static async getWorkflowData(tenantDb: any, dateFilter: any, config: ReportConfig): Promise<any[]> {
    if (!config.sections?.includes('workflows') && config.sections) return [];
    
    return tenantDb.workflowInstance.findMany({
      where: {
        createdAt: dateFilter.createdAt
      },
      include: {
        workflow: {
          select: { workflowName: true }
        },
        assignee: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
  }

  private static async getUserData(tenantDb: any, config: ReportConfig): Promise<any[]> {
    if (!config.sections?.includes('users') && config.sections) return [];
    
    return tenantDb.user.findMany({
      select: {
        userId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private static async getLocationData(tenantDb: any, config: ReportConfig): Promise<any[]> {
    if (!config.sections?.includes('locations') && config.sections) return [];
    
    return tenantDb.location.findMany({
      select: {
        locationId: true,
        locationName: true,
        city: true,
        state: true,
        status: true,
        createdAt: true
      },
      orderBy: { locationName: 'asc' }
    });
  }

  private static async getAuditData(tenantDb: any, dateFilter: any, config: ReportConfig): Promise<any[]> {
    if (!config.sections?.includes('audit') && config.sections) return [];
    
    return tenantDb.auditLog.findMany({
      where: {
        createdAt: dateFilter.createdAt
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });
  }

  /**
   * Clean up old report files
   */
  static async cleanupOldReports(olderThanDays: number = 7): Promise<void> {
    try {
      const reportsDir = path.join(process.cwd(), 'temp', 'reports');
      const files = await fs.readdir(reportsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      for (const file of files) {
        const filePath = path.join(reportsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          logger.info(`Cleaned up old report file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old reports:', error);
    }
  }
}