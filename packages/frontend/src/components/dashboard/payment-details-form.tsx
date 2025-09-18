"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CreditCard, FileText, IndianRupee } from "lucide-react";

export interface PaymentDetails {
  // Invoice Details (for draft -> invoice transition)
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  
  // Payment Details (for invoice -> payment transition)
  paymentMethod?: 'cash' | 'cheque' | 'neft' | 'rtgs' | 'upi' | 'card';
  paymentDate?: string;
  amountReceived?: number;
  
  // Method-specific details
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  transactionId?: string;
  upiId?: string;
  
  // Additional details
  remarks?: string;
  receivedBy?: string;
  
  // Extended properties for payment system integration
  amount?: number;
  paidAmount?: number;
  referenceNumber?: string;
  bankDetails?: any;
  notes?: string;
}

interface PaymentDetailsFormProps {
  currentStage: string;
  targetStage: string;
  existingDetails: PaymentDetails;
  onDetailsChange: (details: PaymentDetails) => void;
  onValidationChange: (isValid: boolean) => void;
}

export function PaymentDetailsForm({
  currentStage,
  targetStage,
  existingDetails,
  onDetailsChange,
  onValidationChange
}: PaymentDetailsFormProps) {
  const [details, setDetails] = useState<PaymentDetails>(existingDetails);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determine what stage transition is happening
  const isMovingToInvoice = targetStage === 'invoice' && currentStage === 'draft';
  const isMovingToPayment = targetStage === 'payment' && (currentStage === 'invoice' || currentStage === 'draft');

  useEffect(() => {
    setDetails(existingDetails);
  }, [existingDetails]);

  useEffect(() => {
    validateForm();
  }, [details, isMovingToInvoice, isMovingToPayment]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validation for invoice stage
    if (isMovingToInvoice) {
      if (!details.invoiceNumber?.trim()) {
        newErrors.invoiceNumber = 'Invoice number is required';
      }
      if (!details.invoiceDate) {
        newErrors.invoiceDate = 'Invoice date is required';
      }
      if (!details.invoiceAmount || details.invoiceAmount <= 0) {
        newErrors.invoiceAmount = 'Valid invoice amount is required';
      }
    }

    // Validation for payment stage
    if (isMovingToPayment) {
      if (!details.paymentMethod) {
        newErrors.paymentMethod = 'Payment method is required';
      }
      if (!details.paymentDate) {
        newErrors.paymentDate = 'Payment date is required';
      }
      if (!details.amountReceived || details.amountReceived <= 0) {
        newErrors.amountReceived = 'Valid amount received is required';
      }

      // Method-specific validations
      if (details.paymentMethod === 'cheque') {
        if (!details.chequeNumber?.trim()) {
          newErrors.chequeNumber = 'Cheque number is required';
        }
        if (!details.chequeDate) {
          newErrors.chequeDate = 'Cheque date is required';
        }
        if (!details.bankName?.trim()) {
          newErrors.bankName = 'Bank name is required';
        }
      }

      if (['neft', 'rtgs', 'upi'].includes(details.paymentMethod || '')) {
        if (!details.transactionId?.trim()) {
          newErrors.transactionId = 'Transaction ID is required';
        }
      }

      if (details.paymentMethod === 'upi' && !details.upiId?.trim()) {
        newErrors.upiId = 'UPI ID is required';
      }
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    onValidationChange(isValid);
  };

  const handleInputChange = (field: keyof PaymentDetails, value: any) => {
    const updatedDetails = { ...details, [field]: value };
    setDetails(updatedDetails);
    onDetailsChange(updatedDetails);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  // Don't show form if no transition is happening
  if (!isMovingToInvoice && !isMovingToPayment) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {isMovingToInvoice && (
            <>
              <FileText className="h-5 w-5 text-blue-600" />
              Invoice Details
            </>
          )}
          {isMovingToPayment && (
            <>
              <CreditCard className="h-5 w-5 text-green-600" />
              Payment Details
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invoice Details Section */}
        {isMovingToInvoice && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="INV-2024-001"
                  value={details.invoiceNumber || ''}
                  onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                  className={errors.invoiceNumber ? 'border-red-500' : ''}
                />
                {errors.invoiceNumber && (
                  <p className="text-sm text-red-500">{errors.invoiceNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={formatDate(details.invoiceDate || '')}
                  onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                  className={errors.invoiceDate ? 'border-red-500' : ''}
                />
                {errors.invoiceDate && (
                  <p className="text-sm text-red-500">{errors.invoiceDate}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceAmount">Invoice Amount *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="invoiceAmount"
                  type="number"
                  placeholder="0.00"
                  className={`pl-10 ${errors.invoiceAmount ? 'border-red-500' : ''}`}
                  value={details.invoiceAmount || ''}
                  onChange={(e) => handleInputChange('invoiceAmount', parseFloat(e.target.value) || 0)}
                />
              </div>
              {errors.invoiceAmount && (
                <p className="text-sm text-red-500">{errors.invoiceAmount}</p>
              )}
            </div>
          </>
        )}

        {/* Payment Details Section */}
        {isMovingToPayment && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={details.paymentMethod || ''}
                  onValueChange={(value) => handleInputChange('paymentMethod', value)}
                >
                  <SelectTrigger className={errors.paymentMethod ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="neft">NEFT</SelectItem>
                    <SelectItem value="rtgs">RTGS</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
                {errors.paymentMethod && (
                  <p className="text-sm text-red-500">{errors.paymentMethod}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formatDate(details.paymentDate || '')}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                  className={errors.paymentDate ? 'border-red-500' : ''}
                />
                {errors.paymentDate && (
                  <p className="text-sm text-red-500">{errors.paymentDate}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountReceived">Amount Received *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="amountReceived"
                  type="number"
                  placeholder="0.00"
                  className={`pl-10 ${errors.amountReceived ? 'border-red-500' : ''}`}
                  value={details.amountReceived || ''}
                  onChange={(e) => handleInputChange('amountReceived', parseFloat(e.target.value) || 0)}
                />
              </div>
              {errors.amountReceived && (
                <p className="text-sm text-red-500">{errors.amountReceived}</p>
              )}
            </div>

            {/* Method-specific fields */}
            {details.paymentMethod === 'cheque' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="chequeNumber">Cheque Number *</Label>
                  <Input
                    id="chequeNumber"
                    placeholder="123456"
                    value={details.chequeNumber || ''}
                    onChange={(e) => handleInputChange('chequeNumber', e.target.value)}
                    className={errors.chequeNumber ? 'border-red-500' : ''}
                  />
                  {errors.chequeNumber && (
                    <p className="text-sm text-red-500">{errors.chequeNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chequeDate">Cheque Date *</Label>
                  <Input
                    id="chequeDate"
                    type="date"
                    value={formatDate(details.chequeDate || '')}
                    onChange={(e) => handleInputChange('chequeDate', e.target.value)}
                    className={errors.chequeDate ? 'border-red-500' : ''}
                  />
                  {errors.chequeDate && (
                    <p className="text-sm text-red-500">{errors.chequeDate}</p>
                  )}
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    placeholder="State Bank of India"
                    value={details.bankName || ''}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    className={errors.bankName ? 'border-red-500' : ''}
                  />
                  {errors.bankName && (
                    <p className="text-sm text-red-500">{errors.bankName}</p>
                  )}
                </div>
              </div>
            )}

            {['neft', 'rtgs', 'upi'].includes(details.paymentMethod || '') && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionId">Transaction ID *</Label>
                  <Input
                    id="transactionId"
                    placeholder="TXN123456789"
                    value={details.transactionId || ''}
                    onChange={(e) => handleInputChange('transactionId', e.target.value)}
                    className={errors.transactionId ? 'border-red-500' : ''}
                  />
                  {errors.transactionId && (
                    <p className="text-sm text-red-500">{errors.transactionId}</p>
                  )}
                </div>

                {details.paymentMethod === 'upi' && (
                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID *</Label>
                    <Input
                      id="upiId"
                      placeholder="user@paytm"
                      value={details.upiId || ''}
                      onChange={(e) => handleInputChange('upiId', e.target.value)}
                      className={errors.upiId ? 'border-red-500' : ''}
                    />
                    {errors.upiId && (
                      <p className="text-sm text-red-500">{errors.upiId}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="receivedBy">Received By</Label>
              <Input
                id="receivedBy"
                placeholder="Account person name"
                value={details.receivedBy || ''}
                onChange={(e) => handleInputChange('receivedBy', e.target.value)}
              />
            </div>
          </>
        )}

        {/* Common remarks field */}
        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea
            id="remarks"
            placeholder="Additional notes or comments..."
            value={details.remarks || ''}
            onChange={(e) => handleInputChange('remarks', e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
