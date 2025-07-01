'use client';

import React from 'react';
import { Card, Button } from 'antd';
import { getExplorerUrl } from '../../util';
import { ACTIVE_CHAIN } from '../../constants';

const PolicyInfoCard = ({ data, isOwner, onUpdatePolicyStatus }) => {
    return (
        <div>
            <h4>Policy Information</h4>
            <Card size="small">
                <p><strong>Policy Name:</strong> {data?.name}</p>
                <p><strong>Description:</strong> {data?.description}</p>

                {/* Show detailed business info only to owners */}
                {isOwner && (
                    <>
                        <p><strong>Business Type:</strong> {data?.policyParams?.businessType}</p>
                        <p><strong>Location:</strong> {data?.policyParams?.location}</p>
                        <p><strong>Employee Count:</strong> {data?.policyParams?.employeeCount}</p>
                    </>
                )}

                <p><strong>Max Amount:</strong> ${data?.policyParams?.maxAmount}</p>
                <p><strong>Category:</strong> {data?.policyParams?.category}</p>
                <p><strong>Status:</strong>
                    <span style={{
                        color: data?.policyParams?.isActive ? 'green' : 'red',
                        fontWeight: 'bold'
                    }}>
                        {data?.policyParams?.isActive ? ' Active' : ' Inactive'}
                    </span>
                    {isOwner && (
                        <Button
                            size="small"
                            type={data?.policyParams?.isActive ? 'default' : 'primary'}
                            style={{ marginLeft: '10px' }}
                            onClick={() => {
                                const action = data?.policyParams?.isActive ? 'deactivate' : 'activate';
                                const confirmed = window.confirm(
                                    `Are you sure you want to ${action} this policy? ${
                                        data?.policyParams?.isActive
                                            ? 'This will prevent new claims from being submitted.'
                                            : 'This will allow employees to submit claims again.'
                                    }`
                                );
                                if (confirmed) {
                                    onUpdatePolicyStatus(!data?.policyParams?.isActive);
                                }
                            }}
                        >
                            {data?.policyParams?.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                    )}
                </p>

                {/* Show additional owner info only to owners */}
                {isOwner && (
                    <>
                        <p><strong>Total Claims:</strong> {data?.claimCount}</p>
                        <p><strong>Created:</strong> {data?.createdAt}</p>
                        <p><strong>Owner:</strong> {data?.owner}</p>
                    </>
                )}
            </Card>
        </div>
    );
};

export default PolicyInfoCard;
