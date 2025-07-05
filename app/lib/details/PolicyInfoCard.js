'use client';

import React from 'react';
import { Card } from 'antd';
import { ethers } from 'ethers';
import { getExplorerUrl } from '../../util';
import { ACTIVE_CHAIN } from '../../constants';

const PolicyInfoCard = ({ data, isOwner }) => {
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

                <p><strong>Max Amount:</strong> ${data?.policyParams?.maxAmount ? ethers.utils.formatUnits(data.policyParams.maxAmount, 18) : '0'}</p>
                <p><strong>Category:</strong> {data?.policyParams?.category}</p>
                <p><strong>Status:</strong>
                    <span style={{
                        color: data?.policyParams?.isActive ? 'green' : 'red',
                        fontWeight: 'bold'
                    }}>
                        {data?.policyParams?.isActive ? ' Active' : ' Inactive'}
                    </span>
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
