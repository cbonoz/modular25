'use client';

import React from 'react';
import { ethers } from 'ethers';
import {
    Card,
    Row,
    Col,
    Button,
    Divider,
    Spin,
    Input,
    Tooltip,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

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
        <Card title="USDFC Funding & Balance" style={{ marginTop: '16px' }}>
            {usdcLoading ? (
                <Spin size="small" />
            ) : (
                <>
                    <Row gutter={16}>
                        <Col span={12}>
                            <p><strong>Contract USDFC Balance:</strong></p>
                            <p style={{ fontSize: '18px', color: '#1890ff' }}>
                                {ethers.utils.formatEther(contractUSDFCBalance)} USDFC
                            </p>
                        </Col>
                        <Col span={12}>
                            <p><strong>Your USDFC Balance:</strong></p>
                            <p style={{ fontSize: '16px' }}>
                                {ethers.utils.formatEther(userUSDFCBalance)} USDFC
                            </p>
                        </Col>
                    </Row>

                    <Divider />

                    <Row gutter={16}>
                        <Col span={8}>
                            <p><strong>Total Funded:</strong></p>
                            <p>{ethers.utils.formatEther(fundingInfo.totalFunded)} USDFC</p>
                        </Col>
                        <Col span={8}>
                            <p><strong>Total Reimbursed:</strong></p>
                            <p>{ethers.utils.formatEther(fundingInfo.totalReimbursed)} USDFC</p>
                        </Col>
                        <Col span={8}>
                            <p><strong>Available Balance:</strong></p>
                            <p style={{ color: '#52c41a' }}>
                                {ethers.utils.formatEther(fundingInfo.remainingBalance)} USDFC
                            </p>
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
                            />
                            <Button
                                type="primary"
                                onClick={onFundContract}
                                loading={rpcLoading}
                                disabled={!fundingAmount || parseFloat(fundingAmount) <= 0}
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
                                max={ethers.utils.formatEther(contractUSDFCBalance)}
                            />
                            <Button
                                type="default"
                                onClick={onWithdrawFromContract}
                                loading={rpcLoading}
                                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(ethers.utils.formatEther(contractUSDFCBalance))}
                            >
                                Withdraw
                            </Button>
                        </div>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                            <Tooltip title="Manage USDFC funds for automatic reimbursements">
                                <InfoCircleOutlined style={{ marginRight: '4px' }} />
                                Available to withdraw: {ethers.utils.formatEther(contractUSDFCBalance)} USDFC
                            </Tooltip>
                        </p>
                    </div>
                </>
            )}
        </Card>
    );
};

export default OwnerFundingCard;
