'use client';

import React from 'react';
import { Card, Button } from 'antd';

const ClaimsList = ({
    claims,
    isOwnerView = false,
    onProcessClaim,
    getStatusColor,
    getStatusText
}) => {
    if (claims.length === 0) {
        return <p>{isOwnerView ? 'No claims submitted yet.' : 'No claims submitted yet.'}</p>;
    }

    return (
        <>
            {claims.map((claim) => (
                <Card
                    key={claim.id}
                    size="small"
                    style={{ marginBottom: '10px' }}
                    title={`Claim #${claim.id}${isOwnerView ? ` - ${getStatusText(claim.status)}` : ''}`}
                >
                    {isOwnerView && (
                        <p><strong>Employee:</strong> {claim.employee}</p>
                    )}
                    <p><strong>Amount:</strong> ${claim.amount}</p>
                    <p><strong>Description:</strong> {claim.description}</p>
                    <p><strong>Status:</strong>
                        <span style={{ color: getStatusColor(claim.status), fontWeight: 'bold' }}>
                            {' ' + getStatusText(claim.status)}
                        </span>
                    </p>
                    <p><strong>Submitted:</strong> {claim.timestamp}</p>

                    {isOwnerView && claim.status === 0 && onProcessClaim && ( // Pending claims
                        <div style={{ marginTop: '10px' }}>
                            <Button
                                type="primary"
                                size="small"
                                onClick={() => onProcessClaim(claim.id, 1, '')}
                                style={{ marginRight: '8px' }}
                            >
                                Approve
                            </Button>
                            <Button
                                type="default"
                                size="small"
                                onClick={() => {
                                    const reason = prompt('Reason for rejection:');
                                    if (reason !== null) {
                                        onProcessClaim(claim.id, 2, reason);
                                    }
                                }}
                            >
                                Reject
                            </Button>
                        </div>
                    )}

                    {claim.rejectionReason && (
                        <p><strong>Rejection Reason:</strong> {claim.rejectionReason}</p>
                    )}
                </Card>
            ))}
        </>
    );
};

export default ClaimsList;
