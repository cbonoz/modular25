'use client';

import React from 'react';
import { ethers } from 'ethers';
import {
    Card,
    Button,
    Input,
    Checkbox,
    Tooltip,
    Spin,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { FileDrop } from './FileDrop';
import { isEmpty } from '../util';

const EmployeeClaimForm = ({
    data,
    claimAmount,
    setClaimAmount,
    claimDescription,
    setClaimDescription,
    files,
    setFiles,
    shouldUpload,
    setShouldUpload,
    contractUSDFCBalance,
    usdcLoading,
    rpcLoading,
    onSubmitClaim
}) => {
    return (
        <div>
            <h4>Submit Reimbursement Request</h4>

            {!data?.policyParams?.isActive && (
                <div style={{
                    background: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: '4px',
                    padding: '12px',
                    marginBottom: '16px'
                }}>
                    <p style={{ color: '#ff4d4f', fontWeight: 'bold', margin: 0 }}>
                        ⚠️ Policy Inactive
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
                        This reimbursement policy is currently inactive. New claims cannot be submitted at this time.
                    </p>
                </div>
            )}

            {/* USDFC Balance Info for Employees */}
            <div style={{
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px'
            }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#389e0d' }}>💰 USDFC Contract Balance</h5>
                {usdcLoading ? (
                    <Spin size="small" />
                ) : (
                    <p style={{ margin: 0, fontSize: '14px' }}>
                        Available for reimbursements: <strong>{ethers.utils.formatEther(contractUSDFCBalance)} USDFC</strong>
                        <br />
                        <small style={{ color: '#666' }}>
                            Approved claims will be automatically reimbursed in USDFC if the contract has sufficient balance.
                        </small>
                    </p>
                )}
            </div>

            <p>Upload your receipt and provide claim details below:</p>
            <br />

            <h5>Amount (USD)</h5>
            <Input
                type="number"
                placeholder="Enter amount"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                max={data?.policyParams?.maxAmount}
                disabled={!data?.policyParams?.isActive}
            />
            <p style={{ fontSize: '12px', color: '#666' }}>
                Maximum allowed: ${data?.policyParams?.maxAmount}
            </p>
            <br />

            <h5>Description</h5>
            <TextArea
                rows={3}
                placeholder="Describe your expense (e.g., Monthly internet bill for remote work)"
                value={claimDescription}
                onChange={(e) => setClaimDescription(e.target.value)}
                disabled={!data?.policyParams?.isActive}
            />
            <br />
            <br />

            <h5>Receipt Upload</h5>
            <p className="bold">
                Also upload to IPFS?&nbsp;
                <Checkbox
                    type="checkbox"
                    checked={shouldUpload}
                    onChange={(e) => setShouldUpload(e.target.checked)}
                    disabled={!data?.policyParams?.isActive}
                />
                &nbsp;
                <Tooltip
                    className="pointer"
                    title="If checked, receipt will be stored on IPFS for verification"
                >
                    <InfoCircleOutlined />
                </Tooltip>
            </p>
            <FileDrop
                files={files}
                setFiles={(files) => setFiles(files)}
                disabled={!data?.policyParams?.isActive}
            />
            <br />

            <Button
                type="primary"
                onClick={onSubmitClaim}
                loading={rpcLoading}
                disabled={rpcLoading || !claimAmount || !claimDescription || isEmpty(files) || !data?.policyParams?.isActive}
            >
                {data?.policyParams?.isActive ? 'Submit Claim' : 'Policy Inactive'}
            </Button>
        </div>
    );
};

export default EmployeeClaimForm;
