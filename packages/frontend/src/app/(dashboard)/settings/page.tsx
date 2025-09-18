'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Building, 
  Building2,
  Upload, 
  Save, 
  Plus,
  Trash2,
  QrCode,
  CreditCard,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileText,
  Palette,
  Loader2
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { organizationApi } from '@/lib/api/organization';
import type { OrganizationSettings, BankDetails, QRCode } from '@/lib/api/organization';
import { useOrganization, useOrganizationLogo } from '@/lib/providers/organization-provider';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { organization, refreshOrganization, updateOrganization } = useOrganization();
  const { logoUrl: proxiedLogoUrl } = useOrganizationLogo();
  const [settings, setSettings] = useState<OrganizationSettings>({
    companyName: '',
    address: {},
    contactInfo: {},
    gstDetails: {},
    bankDetails: [],
    qrCodes: [],
    branding: {},
    businessSettings: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [editingBank, setEditingBank] = useState<BankDetails | null>(null);
  const [editingQR, setEditingQR] = useState<QRCode | null>(null);

  // Load settings from organization context
  useEffect(() => {
    if (organization) {
      setSettings(organization);
      setLoading(false);
    }
  }, [organization]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      await refreshOrganization();
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateOrganization(settings);
      toast.success('Organization settings updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save organization settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      const result = await organizationApi.uploadLogo(file);
      console.log('Logo upload result:', result);
      
      // Update local settings
      setSettings(prev => ({
        ...prev,
        logo: result.logoUrl
      }));

      // Update organization context
      await updateOrganization({ logo: result.logoUrl });
      
      // Refresh organization data to ensure everything is in sync
      await refreshOrganization();
      
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleInputChange = (section: keyof OrganizationSettings, field: string, value: any) => {
    setSettings(prev => {
      const currentSection = prev[section];
      if (Array.isArray(currentSection)) {
        // Don't modify arrays this way
        return prev;
      }
      return {
        ...prev,
        [section]: {
          ...(typeof currentSection === 'object' && currentSection !== null ? currentSection : {}),
          [field]: value
        }
      };
    });
  };

  const handleAddBank = (bankData: BankDetails) => {
    const newBank = {
      ...bankData,
      id: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setSettings(prev => ({
      ...prev,
      bankDetails: [...(prev.bankDetails || []), newBank]
    }));
    setShowBankDialog(false);
    setEditingBank(null);
  };

  const handleEditBank = (bankData: BankDetails) => {
    setSettings(prev => ({
      ...prev,
      bankDetails: prev.bankDetails?.map(bank => 
        bank.id === editingBank?.id ? bankData : bank
      ) || []
    }));
    setShowBankDialog(false);
    setEditingBank(null);
  };

  const handleDeleteBank = async (bankId: string) => {
    try {
      await organizationApi.deleteBankDetails(bankId);
      setSettings(prev => ({
        ...prev,
        bankDetails: prev.bankDetails?.filter(bank => bank.id !== bankId) || []
      }));
      toast.success('Bank details deleted successfully');
    } catch (error) {
      console.error('Error deleting bank details:', error);
      toast.error('Failed to delete bank details');
    }
  };

  const handleAddQR = (qrData: QRCode) => {
    const newQR = {
      ...qrData,
      id: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setSettings(prev => ({
      ...prev,
      qrCodes: [...(prev.qrCodes || []), newQR]
    }));
    setShowQRDialog(false);
    setEditingQR(null);
  };

  const handleEditQR = (qrData: QRCode) => {
    setSettings(prev => ({
      ...prev,
      qrCodes: prev.qrCodes?.map(qr => 
        qr.id === editingQR?.id ? qrData : qr
      ) || []
    }));
    setShowQRDialog(false);
    setEditingQR(null);
  };

  const handleDeleteQR = async (qrId: string) => {
    try {
      await organizationApi.deleteQRCode(qrId);
      setSettings(prev => ({
        ...prev,
        qrCodes: prev.qrCodes?.filter(qr => qr.id !== qrId) || []
      }));
      toast.success('QR code deleted successfully');
    } catch (error) {
      console.error('Error deleting QR code:', error);
      toast.error('Failed to delete QR code');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            Organization Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your organization details, branding, and configuration
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Basic information about your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload Section */}
            <div>
              <Label htmlFor="logo">Company Logo</Label>
              <div className="flex items-center gap-4 mt-2">
                {proxiedLogoUrl ? (
                  <div className="relative">
                    <img 
                      src={proxiedLogoUrl} 
                      alt="Company Logo" 
                      className="h-16 w-16 object-contain border rounded-lg"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                      onClick={() => {
                        setSettings(prev => ({ ...prev, logo: null }));
                        updateOrganization({ logo: null });
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <Building className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('logo')?.click()}
                    disabled={uploadingLogo}
                    className="w-full"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 5MB. Recommended: 200x200px
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
            
            <div>
              <Label htmlFor="businessType">Business Type</Label>
              <Input
                id="businessType"
                value={settings.businessSettings?.businessType || ''}
                onChange={(e) => handleInputChange('businessSettings', 'businessType', e.target.value)}
                placeholder="e.g., Private Limited, Partnership"
              />
            </div>

            <div>
              <Label htmlFor="establishedYear">Established Year</Label>
              <Input
                id="establishedYear"
                type="number"
                value={settings.businessSettings?.establishedYear || ''}
                onChange={(e) => handleInputChange('businessSettings', 'establishedYear', parseInt(e.target.value) || undefined)}
                placeholder="e.g., 2020"
              />
            </div>

            <div>
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={settings.businessSettings?.licenseNumber || ''}
                onChange={(e) => handleInputChange('businessSettings', 'licenseNumber', e.target.value)}
                placeholder="Enter license number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              How customers can reach your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={settings.contactInfo?.phone || ''}
                onChange={(e) => handleInputChange('contactInfo', 'phone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={settings.contactInfo?.email || ''}
                onChange={(e) => handleInputChange('contactInfo', 'email', e.target.value)}
                placeholder="contact@company.com"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={settings.contactInfo?.website || ''}
                onChange={(e) => handleInputChange('contactInfo', 'website', e.target.value)}
                placeholder="https://www.company.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address Information
            </CardTitle>
            <CardDescription>
              Physical address of your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Textarea
                id="street"
                value={settings.address?.street || ''}
                onChange={(e) => handleInputChange('address', 'street', e.target.value)}
                placeholder="Enter street address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={settings.address?.city || ''}
                  onChange={(e) => handleInputChange('address', 'city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={settings.address?.state || ''}
                  onChange={(e) => handleInputChange('address', 'state', e.target.value)}
                  placeholder="State"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={settings.address?.country || ''}
                  onChange={(e) => handleInputChange('address', 'country', e.target.value)}
                  placeholder="Country"
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={settings.address?.postalCode || ''}
                  onChange={(e) => handleInputChange('address', 'postalCode', e.target.value)}
                  placeholder="Postal Code"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GST Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              GST & Tax Details
            </CardTitle>
            <CardDescription>
              Tax registration and compliance information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={settings.gstDetails?.gstNumber || ''}
                onChange={(e) => handleInputChange('gstDetails', 'gstNumber', e.target.value)}
                placeholder="Enter GST number"
              />
            </div>

            <div>
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={settings.gstDetails?.panNumber || ''}
                onChange={(e) => handleInputChange('gstDetails', 'panNumber', e.target.value)}
                placeholder="Enter PAN number"
              />
            </div>

            <div>
              <Label htmlFor="registrationDate">Registration Date</Label>
              <Input
                id="registrationDate"
                type="date"
                value={settings.gstDetails?.registrationDate || ''}
                onChange={(e) => handleInputChange('gstDetails', 'registrationDate', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Details Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bank Details
              </CardTitle>
              <CardDescription>
                Manage your organization's bank account information
              </CardDescription>
            </div>
            <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingBank(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bank Account
                </Button>
              </DialogTrigger>
              <BankDetailsDialog
                bank={editingBank}
                onSave={editingBank ? handleEditBank : handleAddBank}
                onCancel={() => {
                  setShowBankDialog(false);
                  setEditingBank(null);
                }}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {settings.bankDetails && settings.bankDetails.length > 0 ? (
            <div className="space-y-4">
              {settings.bankDetails.map((bank) => (
                <div key={bank.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{bank.bankName}</h4>
                      {bank.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Account: {bank.accountNumber}</p>
                      <p>IFSC: {bank.ifscCode}</p>
                      <p>Holder: {bank.accountHolderName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingBank(bank);
                        setShowBankDialog(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bank.id && handleDeleteBank(bank.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bank accounts added yet</p>
              <p className="text-sm">Add your first bank account to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Codes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Codes
              </CardTitle>
              <CardDescription>
                Manage QR codes for payments, contact info, and more
              </CardDescription>
            </div>
            <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingQR(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add QR Code
                </Button>
              </DialogTrigger>
              <QRCodeDialog
                qrCode={editingQR}
                onSave={editingQR ? handleEditQR : handleAddQR}
                onCancel={() => {
                  setShowQRDialog(false);
                  setEditingQR(null);
                }}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {settings.qrCodes && settings.qrCodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {settings.qrCodes.map((qr) => (
                <div key={qr.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{qr.name}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={qr.isActive ? "default" : "secondary"}>
                        {qr.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingQR(qr);
                          setShowQRDialog(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => qr.id && handleDeleteQR(qr.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Type: {qr.type}</p>
                    {qr.description && <p>{qr.description}</p>}
                    <p className="truncate">Content: {qr.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No QR codes created yet</p>
              <p className="text-sm">Add your first QR code to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Bank Details Dialog Component
function BankDetailsDialog({ 
  bank, 
  onSave, 
  onCancel 
}: { 
  bank: BankDetails | null; 
  onSave: (bank: BankDetails) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState<BankDetails>(
    bank || {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      accountType: 'savings',
      branchName: '',
      isDefault: false,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{bank ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
        <DialogDescription>
          {bank ? 'Update bank account details' : 'Add a new bank account for your organization'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="bankName">Bank Name *</Label>
          <Input
            id="bankName"
            value={formData.bankName}
            onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
            placeholder="Enter bank name"
            required
          />
        </div>

        <div>
          <Label htmlFor="accountHolderName">Account Holder Name *</Label>
          <Input
            id="accountHolderName"
            value={formData.accountHolderName}
            onChange={(e) => setFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
            placeholder="Enter account holder name"
            required
          />
        </div>

        <div>
          <Label htmlFor="accountNumber">Account Number *</Label>
          <Input
            id="accountNumber"
            value={formData.accountNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
            placeholder="Enter account number"
            required
          />
        </div>

        <div>
          <Label htmlFor="ifscCode">IFSC Code *</Label>
          <Input
            id="ifscCode"
            value={formData.ifscCode}
            onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value }))}
            placeholder="Enter IFSC code"
            required
          />
        </div>

        <div>
          <Label htmlFor="accountType">Account Type *</Label>
          <Select
            value={formData.accountType}
            onValueChange={(value: 'savings' | 'current' | 'cc' | 'od') => 
              setFormData(prev => ({ ...prev, accountType: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">Savings</SelectItem>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="cc">Cash Credit</SelectItem>
              <SelectItem value="od">Overdraft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="branchName">Branch Name</Label>
          <Input
            id="branchName"
            value={formData.branchName || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, branchName: e.target.value }))}
            placeholder="Enter branch name"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {bank ? 'Update' : 'Add'} Bank Account
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// QR Code Dialog Component
function QRCodeDialog({ 
  qrCode, 
  onSave, 
  onCancel 
}: { 
  qrCode: QRCode | null; 
  onSave: (qr: QRCode) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState<QRCode>(
    qrCode || {
      name: '',
      type: 'payment',
      content: '',
      description: '',
      isActive: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{qrCode ? 'Edit QR Code' : 'Add QR Code'}</DialogTitle>
        <DialogDescription>
          {qrCode ? 'Update QR code details' : 'Create a new QR code for your organization'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="qrName">Name *</Label>
          <Input
            id="qrName"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter QR code name"
            required
          />
        </div>

        <div>
          <Label htmlFor="qrType">Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value: 'payment' | 'contact' | 'website' | 'custom') => 
              setFormData(prev => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select QR code type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="contact">Contact</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="qrContent">Content *</Label>
          <Textarea
            id="qrContent"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Enter QR code content (URL, UPI ID, etc.)"
            rows={3}
            required
          />
        </div>

        <div>
          <Label htmlFor="qrDescription">Description</Label>
          <Input
            id="qrDescription"
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter description (optional)"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {qrCode ? 'Update' : 'Add'} QR Code
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
