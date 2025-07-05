'use client';

import React from 'react';
import { Card, Progress, Button } from 'antd';
import { RESULT_MESSAGES } from '../../constants/PolicyConstants';
import { CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';

const ResultCard = ({ result, uploadStatus }) => {
    if (!result && !uploadStatus) return null;

    return (
        <div style={{ marginBottom: '16px' }}>
            {/* Upload Status Card */}
            {uploadStatus && (
                <Card title="Receipt Upload Status" size="small" style={{ marginBottom: '16px' }}>
                    {uploadStatus.status === 'uploading' && (
                        <div>
                            <p style={{ color: 'blue', fontWeight: 'bold' }}>
                                📤 Uploading receipt to Synapse...
                            </p>
                            <p>File: {uploadStatus.fileName} ({Math.round(uploadStatus.fileSize / 1024)}KB)</p>
                            <Progress percent={30} status="active" />
                        </div>
                    )}
                    {uploadStatus.status === 'success' && (
                        <div>
                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                ✅ Receipt uploaded successfully to Synapse!
                            </p>
                            <p>File: {uploadStatus.fileName}</p>
                            <p>CID: <code>{uploadStatus.cid}</code></p>
                            <p>Timestamp: {new Date(uploadStatus.timestamp).toLocaleString()}</p>
                            <Button 
                                type="link" 
                                href={`https://gateway.pinata.cloud/ipfs/${uploadStatus.cid}`}
                                target="_blank"
                                size="small"
                            >
                                View Receipt 🔗
                            </Button>
                        </div>
                    )}
                    {uploadStatus.status === 'failed' && (
                        <div>
                            <p style={{ color: 'red', fontWeight: 'bold' }}>
                                ❌ Receipt upload failed
                            </p>
                            <p>File: {uploadStatus.fileName}</p>
                            <p>Error: {uploadStatus.error}</p>
                            <p>Timestamp: {new Date(uploadStatus.timestamp).toLocaleString()}</p>
                            <p style={{ color: 'orange' }}>
                                ⚠️ Your claim was still submitted successfully with the receipt hash.
                            </p>
                        </div>
                    )}
                </Card>
            )}

            {/* Main Result Card */}
            {result && (
                <Card title="Result" size="small">
                    {result.type === RESULT_MESSAGES.CLAIM_SUBMITTED && (
                        <Card className="bg-green-50 border-green-200">
                            <div className="flex items-start space-x-3">
                                <CheckCircleOutlined className="text-green-500 text-xl mt-1" />
                                <div className="flex-1">
                                    <h3 className="text-green-800 font-semibold mb-2">
                                        {result.message}
                                    </h3>
                                    <div className="space-y-2">
                                        <p className="text-green-700">
                                            <strong>Amount:</strong> ${result.amount}
                                        </p>
                                        <p className="text-green-700">
                                            <strong>Description:</strong> {result.description}
                                        </p>
                                        {result.uploadInProgress && (
                                            <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                                                <div className="flex items-center space-x-2">
                                                    <LoadingOutlined className="text-blue-500" />
                                                    <span className="text-blue-700">
                                                        Receipt upload in progress on {result.network}...
                                                    </span>
                                                </div>
                                                <p className="text-blue-600 text-sm mt-1">
                                                    Your claim has been submitted. The receipt is being uploaded to permanent storage in the background.
                                                </p>
                                            </div>
                                        )}
                                        {result.uploadCompleted && (
                                            <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                                                <div className="flex items-center space-x-2">
                                                    <CheckCircleOutlined className="text-green-500" />
                                                    <span className="text-green-700">
                                                        Receipt uploaded to permanent storage on {result.network}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                    {result.type === RESULT_MESSAGES.RECEIPT_VALIDATION && (
                        <div>
                            <p>Receipt Hash: {result.receiptHash}</p>
                            <p style={{
                                color: result.exists ? 'green' : 'orange',
                                fontWeight: 'bold'
                            }}>
                                {result.exists ? '✅ Receipt found in system' : '⚠️ Receipt not found'}
                            </p>
                            {result.exists && <p>Associated with Claim #{result.claimId}</p>}
                        </div>
                    )}
                    {result.type === RESULT_MESSAGES.CLAIM_PROCESSED && (
                        <div>
                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                ✅ Claim #{result.claimId} {result.status}
                                {result.status === 'Approved' && ' & USDFC Reimbursed'}
                            </p>
                            {result.status === 'Approved' && (
                                <p>The employee has been automatically reimbursed in USDFC.</p>
                            )}
                            {result.reason && <p>Reason: {result.reason}</p>}
                        </div>
                    )}
                    {result.type === RESULT_MESSAGES.POLICY_STATUS_UPDATED && (
                        <div>
                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                ✅ Policy {result.status} Successfully
                            </p>
                            <p>
                                {result.status === 'Activated'
                                    ? 'Employees can now submit new claims.'
                                    : 'New claim submissions are now disabled.'}
                            </p>
                        </div>
                    )}
                    {result.type === RESULT_MESSAGES.CONTRACT_FUNDED && (
                        <div>
                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                ✅ Contract Funded Successfully
                            </p>
                            <p>Amount: {result.amount} USDFC</p>
                            <p>The contract now has funds available for automatic USDFC reimbursements.</p>
                        </div>
                    )}
                    {result.type === RESULT_MESSAGES.CONTRACT_WITHDRAWAL && (
                        <div>
                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                ✅ Withdrawal Successful
                            </p>
                            <p>Amount: {result.amount} USDFC</p>
                            <p>Funds have been transferred back to your wallet.</p>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default ResultCard;
