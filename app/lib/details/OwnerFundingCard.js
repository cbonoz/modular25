'use client';

import React from 'react';
import { Card, Statistic, Row, Col, Input, Button, Divider, Spin, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ethers } from 'ethers';

const OwnerFundingCard = ({
    contractUSDFCBalance,
    userUSDFCBalance,
    fundingInfo,
    fundingAmount,
    setFundingAmount,
    withdrawAmount,
    setWithdrawAmount,
    usdcLoading,
    rpcLoading,
    onFundContract,
    onWithdrawFromContract
}) => {
    return (
        <Card 
            title={
                <span>
                    USDFC Funding & Balance
                    <Tooltip title="Manage USDFC funds for automatic reimbursements">
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
                    <Row gutter={16}>
                        <Col span={12}>
                            <p><strong>Contract USDFC Balance:</strong></p>
                            <p style={{ fontSize: '18px', color: '#1890ff' }}>
                                {ethers.utils.formatUnits(contractUSDFCBalance, 6)} USDFC
                            </p>
                        </Col>
                        <Col span={12}>
                            <p><strong>Your USDFC Balance:</strong></p>
                            <p style={{ fontSize: '16px' }}>
                                {ethers.utils.formatUnits(userUSDFCBalance, 6)} USDFC
                            </p>
                        </Col>
                    </Row>

                    <Divider />

                    <Row gutter={16}>
                        <Col span={8}>
                            <Statistic
                                title="Total Funded"
                                value={ethers.utils.formatUnits(fundingInfo.totalFunded, 6)}
                                prefix="$"
                                precision={2}
                            />
                        </Col>
                        <Col span={8}>
                            <Statistic
                                title="Total Reimbursed"
                                value={ethers.utils.formatUnits(fundingInfo.totalReimbursed, 6)}
                                prefix="$"
                                precision={2}
                            />
                        </Col>
                        <Col span={8}>
                            <Statistic
                                title="Available Balance"
                                value={ethers.utils.formatUnits(fundingInfo.remainingBalance, 6)}
                                prefix="$"
                                valueStyle={{ color: '#3f8600' }}
                                precision={2}
                            />
                        </Col>
                    </Row>

                    <Divider />

                    <div>
                        <p><strong>Fund Contract with USDFC:</strong></p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                            <Input
                                style={{ width: '200px' }}
                                placeholder="Enter USDFC amount"
                                value={fundingAmount}
                                onChange={(e) => setFundingAmount(e.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                                prefix="$"
                                suffix="USDFC"
                            />
                            <Button
                                type="primary"
                                onClick={onFundContract}
                                loading={rpcLoading}
                                disabled={!fundingAmount || rpcLoading || parseFloat(fundingAmount) <= 0}
                            >
                                Fund Contract
                            </Button>
                        </div>

                        <p><strong>Withdraw USDFC from Contract:</strong></p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Input
                                style={{ width: '200px' }}
                                placeholder="Enter withdrawal amount"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                                prefix="$"
                                suffix="USDFC"
                                max={ethers.utils.formatUnits(contractUSDFCBalance, 6)}
                            />
                            <Button
                                onClick={onWithdrawFromContract}
                                loading={rpcLoading}
                                disabled={!withdrawAmount || rpcLoading || parseFloat(withdrawAmount) <= 0}
                            >
                                Withdraw
                            </Button>
                        </div>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                            <Tooltip title="Maximum amount that can be withdrawn">
                                <InfoCircleOutlined style={{ marginRight: '4px' }} />
                                Available to withdraw: {ethers.utils.formatUnits(contractUSDFCBalance, 6)} USDFC
                            </Tooltip>
                        </p>
                    </div>
                </>
            )}
        </Card>
    );
};

export default OwnerFundingCard;
