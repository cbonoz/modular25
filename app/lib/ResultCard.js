'use client';

import React from 'react';
import { Card } from 'antd';
import { RESULT_MESSAGES } from './PolicyConstants';

const ResultCard = ({ result }) => {
    if (!result) return null;

    return (
        <Card title="Result" size="small">
            {result.type === RESULT_MESSAGES.CLAIM_SUBMITTED && (
                <div>
                    <p style={{ color: 'green', fontWeight: 'bold' }}>
                        ✅ {result.message}
                    </p>
                    <p>Amount: ${result.amount}</p>
                    <p>Description: {result.description}</p>
                </div>
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
    );
};

export default ResultCard;
