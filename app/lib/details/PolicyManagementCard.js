'use client';

import React from 'react';
import { Card, Button, Tooltip } from 'antd';
import { InfoCircleOutlined, PoweroffOutlined, CheckCircleOutlined } from '@ant-design/icons';

const PolicyManagementCard = ({ isActive, rpcLoading, onUpdatePolicyStatus }) => {
    const handleToggleStatus = () => {
        if (onUpdatePolicyStatus) {
            onUpdatePolicyStatus(!isActive);
        }
    };

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
            <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                        Current Status
                    </div>
                    <div style={{ 
                        fontSize: '18px', 
                        fontWeight: '600',
                        color: isActive ? '#52c41a' : '#ff4d4f'
                    }}>
                        {isActive ? 'Active' : 'Inactive'}
                    </div>
                </div>

                <Button
                    type={isActive ? "default" : "primary"}
                    danger={isActive}
                    icon={isActive ? <PoweroffOutlined /> : <CheckCircleOutlined />}
                    onClick={handleToggleStatus}
                    loading={rpcLoading}
                    size="large"
                    style={{ minWidth: '140px' }}
                >
                    {isActive ? 'Deactivate Policy' : 'Activate Policy'}
                </Button>

                <div style={{ 
                    marginTop: '12px', 
                    fontSize: '12px', 
                    color: '#666',
                    fontStyle: 'italic'
                }}>
                    {isActive 
                        ? 'Deactivating will prevent new claims from being submitted'
                        : 'Activating will allow employees to submit new claims'
                    }
                </div>
            </div>
        </Card>
    );
};

export default PolicyManagementCard;