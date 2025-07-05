'use client';

import React from 'react';
import { Card, Button, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined, PoweroffOutlined, CheckCircleOutlined, StopOutlined, PlayCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const PolicyManagementCard = ({ 
    policy, 
    handleUpdatePolicyStatus, 
    policyStatusLoading, 
    rpcLoading, 
    isOwner 
}) => {
    // Disable buttons when any loading state is active
    const isAnyLoading = policyStatusLoading || rpcLoading;
    const isActive = policy?.policyParams?.isActive;

    return (
        <Card 
            title={
                <span>
                    Policy Management
                    <Tooltip title="Activate or deactivate this policy">
                        <InfoCircleOutlined style={{ marginLeft: '8px' }} />
                    </Tooltip>
                </span>
            }
            style={{ marginTop: '16px' }}
        >
            {isOwner && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Button
                        type={isActive ? "default" : "primary"}
                        danger={isActive}
                        loading={policyStatusLoading} // Only show loading for this specific action
                        disabled={isAnyLoading} // Disable when any operation is loading
                        onClick={() => handleUpdatePolicyStatus(isActive)}
                        icon={isActive ? <StopOutlined /> : <PlayCircleOutlined />}
                        size="large"
                        style={{ minWidth: '140px' }}
                    >
                        {isActive ? 'Deactivate Policy' : 'Activate Policy'}
                    </Button>
                </div>
            )}
            {!isActive && (
                <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                        <InfoCircleOutlined /> This policy is currently inactive. 
                        New claims cannot be submitted while the policy is inactive.
                    </Text>
                </div>
            )}
        </Card>
    );
};

export default PolicyManagementCard;