'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Divider, Spin, Tooltip, Button, Input } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ethers } from 'ethers';

const OwnerFundingCard = ({
    contractUSDFCBalance,
    userUSDFCBalance,
    usdcLoading,
    rpcLoading,
    policyStatusLoading, // Add policy status loading state
    onFundContract,
    onWithdrawFromContract,
    onFundingComplete // Add the new prop
}) => {
    const [fundingAmount, setFundingAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    // Check if any loading operation is active
    const isAnyLoading = rpcLoading || policyStatusLoading;

    const handleFundSubmit = async () => {
        if (onFundContract && fundingAmount) {
            await onFundContract(fundingAmount);
            setFundingAmount('');
            // Call the completion callback to refresh data
            if (onFundingComplete) {
                await onFundingComplete();
            }
        }
    };

    const handleWithdrawSubmit = async () => {
        if (onWithdrawFromContract && withdrawAmount) {
            await onWithdrawFromContract(withdrawAmount);
            setWithdrawAmount('');
            // Call the completion callback to refresh data
            if (onFundingComplete) {
                await onFundingComplete();
            }
        }
    };

    // Helper function to safely format balance values
    const formatBalance = (balance) => {
        if (!balance || balance === undefined) {
            return '0.00';
        }
        try {
            return ethers.utils.formatUnits(balance, 18);
        } catch (error) {
            console.error('Error formatting balance:', error);
            return '0.00';
        }
    };

    return (
        <Card 
            title={
                <span>
                    USDFC Balance & Funding
                    <Tooltip title="View balances and manage policy funding">
                        <InfoCircleOutlined style={{ marginLeft: '8px' }} />
                    </Tooltip>
                </span>
            }
            style={{ marginTop: '16px' }}
        >
            {usdcLoading ? (
                <Spin size="small" />
            ) : (
                <>
                    <Row gutter={16} style={{ marginBottom: '16px' }}>
                        <Col span={12}>
                            <div style={{ 
                                background: '#f6ffed', 
                                padding: '16px', 
                                borderRadius: '8px',
                                border: '1px solid #b7eb8f'
                            }}>
                                <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>Contract USDFC Balance</div>
                                <div style={{ fontSize: '20px', fontWeight: '600', color: '#389e0d' }}>
                                    {formatBalance(contractUSDFCBalance)} USDFC
                                </div>
                            </div>
                        </Col>
                        <Col span={12}>
                            <div style={{ 
                                background: '#f0f8ff', 
                                padding: '16px', 
                                borderRadius: '8px',
                                border: '1px solid #91d5ff'
                            }}>
                                <div style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>Your USDFC Balance</div>
                                <div style={{ fontSize: '20px', fontWeight: '600', color: '#1890ff' }}>
                                    {formatBalance(userUSDFCBalance)} USDFC
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Divider />

                    <Row gutter={16}>
                        <Col span={12}>
                            <h4>Add Funds</h4>
                            <Input
                                type="number"
                                placeholder="Amount to fund"
                                value={fundingAmount}
                                onChange={(e) => setFundingAmount(e.target.value)}
                                prefix="$"
                                suffix="USDFC"
                                style={{ marginBottom: '8px' }}
                            />
                            <Button
                                type="primary"
                                onClick={handleFundSubmit}
                                loading={rpcLoading} // Only show loading for funding operation
                                disabled={!fundingAmount || isAnyLoading || parseFloat(fundingAmount) <= 0} // Disable if any operation is loading
                                block
                            >
                                Fund Policy
                            </Button>
                        </Col>
                        <Col span={12}>
                            <h4>Withdraw Funds</h4>
                            <Input
                                type="number"
                                placeholder="Amount to withdraw"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                prefix="$"
                                suffix="USDFC"
                                style={{ marginBottom: '8px' }}
                            />
                            <Button
                                type="default"
                                onClick={handleWithdrawSubmit}
                                loading={rpcLoading} // Only show loading for withdraw operation
                                disabled={!withdrawAmount || isAnyLoading || parseFloat(withdrawAmount) <= 0} // Disable if any operation is loading
                                block
                            >
                                Withdraw
                            </Button>
                        </Col>
                    </Row>
                </>
            )}
        </Card>
    );
};

export default OwnerFundingCard;
