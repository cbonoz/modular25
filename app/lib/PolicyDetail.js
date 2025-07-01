'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import {
    Card,
    Breadcrumb,
    Row,
    Col,
    Button,
    Divider,
    Spin,
    Input,
    Tabs,
    Checkbox,
    Tooltip,
} from 'antd';
import {
    bytesToSize,
    getExplorerUrl,
    humanError,
    ipfsUrl,
    isEmpty,
} from '../util';
import { ACTIVE_CHAIN, CHAIN_MAP, MAX_FILE_SIZE_BYTES } from '../constants';
import RenderObject from './RenderObject';

import {
    submitClaim,
    getClaim,
    getEmployeeClaims,
    processClaim,
    getMetadata,
    validateReceipt,
    updatePolicyStatus,
} from '../util/appContract';
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import ConnectButton from './ConnectButton';
import { FileDrop } from './FileDrop';
import TextArea from 'antd/es/input/TextArea';
import { InfoCircleOutlined } from '@ant-design/icons';
import { uploadFiles } from '../util/stor';

const PolicyDetail = ({ uploadId }) => {
    const [loading, setLoading] = useState(false);
    const [rpcLoading, setRpcLoading] = useState(false);
    const [result, setResult] = useState();
    const [files, setFiles] = useState([]);
    const [validateFiles, setValidateFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('1');
    const [shouldUpload, setShouldUpload] = useState(true);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState();
    const [data, setData] = useState();
    const [claimAmount, setClaimAmount] = useState('');
    const [claimDescription, setClaimDescription] = useState('');
    const [employeeClaims, setEmployeeClaims] = useState([]);
    const [allClaims, setAllClaims] = useState([]);
    const [networkError, setNetworkError] = useState(false);
    console.log('policy contract', uploadId);

    const { address, isConnected } = useAccount();
    const { chain } = useNetwork();
    const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();
    const signer = useEthersSigner({ chainId: chain?.id || ACTIVE_CHAIN.id });

    const isOwner = data?.owner === address;

    // Handle network changes
    useEffect(() => {
        if (isConnected && chain) {
            console.log('Network changed to:', chain.name, chain.id);
            setError(undefined);
            setNetworkError(false);
            
            if (!CHAIN_MAP[chain.id]) {
                setNetworkError(true);
                setError(`Unsupported network. Please switch to ${ACTIVE_CHAIN.name} and refresh`);
            }
        }
    }, [chain?.id, isConnected]);

    const breadcrumbs = [
        {
            title: 'Home',
            href: '/',
        },
        {
            title: data?.name || 'Policy',
            href: `/upload/${uploadId}`,
        },
    ];

    function setRpcPending() {
        setError();
        setRpcLoading(true);
        setResult();
    }

    // Submit reimbursement claim
    async function submitReimbursementClaim() {
        setRpcPending();
        try {
            if (!files[0]) {
                throw new Error('Please upload a receipt');
            }

            let cid = '';
            if (shouldUpload) {
                cid = await uploadFiles(files);
            }

            const receiptHash = files[0].dataHash;
            const res = await submitClaim(
                signer,
                uploadId,
                claimAmount,
                claimDescription,
                receiptHash,
                cid
            );

            console.log('submitted claim', res);
            setResult({
                type: 'claim_submitted',
                message: 'Reimbursement claim submitted successfully!',
                amount: claimAmount,
                description: claimDescription,
                cid
            });

            // Clear form
            setClaimAmount('');
            setClaimDescription('');
            setFiles([]);

            // Refresh claims
            await loadEmployeeClaims();
        } catch (e) {
            console.log('error submitting claim', e);
            setError(humanError(e));
        } finally {
            setRpcLoading(false);
        }
    }

    // Validate receipt
    async function validateReceiptHash() {
        setRpcPending();
        try {
            const receiptHash = validateFiles[0].dataHash;
            const res = await validateReceipt(signer, uploadId, receiptHash);
            console.log('validate receipt', res);
            setResult({
                type: 'receipt_validation',
                exists: res.exists,
                claimId: res.claimId,
                receiptHash
            });
        } catch (e) {
            setError(humanError(e));
        } finally {
            setRpcLoading(false);
        }
    }

    // Load employee's claims
    async function loadEmployeeClaims() {
        if (!address) return;
        try {
            const claimIds = await getEmployeeClaims(signer, uploadId, address);
            const claims = [];
            for (const claimId of claimIds) {
                const claim = await getClaim(signer, uploadId, claimId);
                claims.push({ id: claimId, ...claim });
            }
            setEmployeeClaims(claims);
        } catch (e) {
            console.error('Error loading employee claims', e);
        }
    }

    // Load all claims (for owner)
    async function loadAllClaims() {
        if (!data?.claimCount) return;
        try {
            const claims = [];
            for (let i = 1; i <= data.claimCount; i++) {
                const claim = await getClaim(signer, uploadId, i);
                claims.push({ id: i, ...claim });
            }
            setAllClaims(claims);
        } catch (e) {
            console.error('Error loading all claims', e);
        }
    }

    // Process claim (owner only)
    async function handleProcessClaim(claimId, status, reason = '') {
        setRpcPending();
        try {
            await processClaim(signer, uploadId, claimId, status, reason);
            setResult({
                type: 'claim_processed',
                claimId,
                status: status === 1 ? 'Approved' : 'Rejected',
                reason
            });
            await loadAllClaims(); // Refresh claims
        } catch (e) {
            setError(humanError(e));
        } finally {
            setRpcLoading(false);
        }
    }

    // Update policy status (owner only)
    async function handleUpdatePolicyStatus(isActive) {
        setRpcPending();
        try {
            await updatePolicyStatus(signer, uploadId, isActive);
            setResult({
                type: 'policy_status_updated',
                status: isActive ? 'Activated' : 'Deactivated'
            });
            await getData(); // Refresh policy data
        } catch (e) {
            setError(humanError(e));
        } finally {
            setRpcLoading(false);
        }
    }

    async function getData() {
        setLoading(true);

        try {
            const d = await getMetadata(signer, uploadId);
            d['contract'] = uploadId;
            console.log('got policy data', d);
            setData(d);

            // Load claims based on user role
            if (d.owner === address) {
                await loadAllClaims();
            } else {
                await loadEmployeeClaims();
            }
        } catch (e) {
            console.error('error getting policy data', e);
            alert('Error getting policy data: ' + humanError(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const checkData = uploadId && signer;
        if (checkData) {
            getData();
        }
    }, [uploadId, signer, address]);

    const cardTitle = useMemo(() => {
        if (data) {
            return `${isOwner ? 'Policy Management' : 'Employee Portal'}: ${data.name}`;
        } else if (error) {
            return 'Error: ' + humanError(error);
        } else {
            return 'Loading...';
        }
    }, [error, data, isOwner]);

    if (!signer) {
        return (
            <Card title="Reimbursement Policy Portal">
                <p className="bold">Connect your wallet to access this policy portal.</p>
                <br />
                <ConnectButton connectOnMount />
            </Card>
        );
    }

    const getStatusColor = (status) => {
        switch(status) {
            case 0: return '#faad14'; // Pending - yellow
            case 1: return '#52c41a'; // Approved - green
            case 2: return '#ff4d4f'; // Rejected - red
            default: return '#d9d9d9';
        }
    };

    const getStatusText = (status) => {
        switch(status) {
            case 0: return 'Pending';
            case 1: return 'Approved';
            case 2: return 'Rejected';
            default: return 'Unknown';
        }
    };

    // Employee tab - Submit reimbursement claim
    const employeeTab = {
        key: '1',
        label: 'Submit Reimbursement Claim',
        children: (
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
                    onClick={submitReimbursementClaim}
                    loading={rpcLoading}
                    disabled={rpcLoading || !claimAmount || !claimDescription || isEmpty(files) || !data?.policyParams?.isActive}
                >
                    {data?.policyParams?.isActive ? 'Submit Claim' : 'Policy Inactive'}
                </Button>
            </div>
        ),
    };

    // Validation tab
    const validationTab = {
        key: '2',
        label: 'Validate Receipt',
        children: (
            <div>
                <h4>Receipt Validation</h4>
                <p>Upload a receipt to check if it exists in the system:</p>
                <FileDrop
                    files={validateFiles}
                    setFiles={(files) => setValidateFiles(files)}
                />
                <Button
                    type="dashed"
                    onClick={validateReceiptHash}
                    loading={rpcLoading}
                    disabled={rpcLoading || isEmpty(validateFiles)}
                >
                    Validate Receipt
                </Button>
            </div>
        ),
    };

    // Claims history tab
    const claimsHistoryTab = {
        key: '3',
        label: `My Claims (${employeeClaims.length})`,
        children: (
            <div>
                <h4>Your Submitted Claims</h4>
                {employeeClaims.length === 0 ? (
                    <p>No claims submitted yet.</p>
                ) : (
                    employeeClaims.map((claim) => (
                        <Card
                            key={claim.id}
                            size="small"
                            style={{ marginBottom: '10px' }}
                            title={`Claim #${claim.id}`}
                        >
                            <p><strong>Amount:</strong> ${claim.amount}</p>
                            <p><strong>Description:</strong> {claim.description}</p>
                            <p><strong>Status:</strong>
                                <span style={{ color: getStatusColor(claim.status), fontWeight: 'bold' }}>
                                    {' ' + getStatusText(claim.status)}
                                </span>
                            </p>
                            <p><strong>Submitted:</strong> {claim.timestamp}</p>
                            {claim.rejectionReason && (
                                <p><strong>Rejection Reason:</strong> {claim.rejectionReason}</p>
                            )}
                        </Card>
                    ))
                )}
            </div>
        ),
    };

    // Owner management tab
    const ownerManagementTab = {
        key: '4',
        label: `Manage Claims (${allClaims.length})`,
        children: (
            <div>
                <h4>Policy Claims Management</h4>
                {allClaims.length === 0 ? (
                    <p>No claims submitted yet.</p>
                ) : (
                    allClaims.map((claim) => (
                        <Card
                            key={claim.id}
                            size="small"
                            style={{ marginBottom: '10px' }}
                            title={`Claim #${claim.id} - ${getStatusText(claim.status)}`}
                        >
                            <p><strong>Employee:</strong> {claim.employee}</p>
                            <p><strong>Amount:</strong> ${claim.amount}</p>
                            <p><strong>Description:</strong> {claim.description}</p>
                            <p><strong>Submitted:</strong> {claim.timestamp}</p>

                            {claim.status === 0 && ( // Pending claims
                                <div style={{ marginTop: '10px' }}>
                                    <Button
                                        type="primary"
                                        size="small"
                                        onClick={() => handleProcessClaim(claim.id, 1, '')}
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
                                                handleProcessClaim(claim.id, 2, reason);
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
                    ))
                )}
            </div>
        ),
    };

    const tabItems = [validationTab];

    if (!isOwner) {
        tabItems.unshift(employeeTab);
        tabItems.push(claimsHistoryTab);
    } else {
        tabItems.push(ownerManagementTab);
    }

    return (
        <div className="policy-detail-page">
            <Breadcrumb items={breadcrumbs} />
            <br />
            <Card
                title={
                    <span
                        style={{
                            color:
                                cardTitle.indexOf('Policy') !== -1 || cardTitle.indexOf('Employee') !== -1
                                    ? 'green'
                                    : 'red',
                        }}
                    >
                        {cardTitle}
                    </span>
                }
            >
                {loading && <p>Loading policy information...</p>}

                <Row
                    gutter={{
                        xs: 8,
                        sm: 16,
                        md: 24,
                        lg: 32,
                    }}
                >
                    <Col span={12}>
                        <div>
                            <h4>Policy Information</h4>
                            <Card size="small">
                                <p><strong>Policy Name:</strong> {data?.name}</p>
                                <p><strong>Description:</strong> {data?.description}</p>
                                <p><strong>Business Type:</strong> {data?.policyParams?.businessType}</p>
                                <p><strong>Location:</strong> {data?.policyParams?.location}</p>
                                <p><strong>Employee Count:</strong> {data?.policyParams?.employeeCount}</p>
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
                                                    handleUpdatePolicyStatus(!data?.policyParams?.isActive);
                                                }
                                            }}
                                        >
                                            {data?.policyParams?.isActive ? 'Deactivate' : 'Activate'}
                                        </Button>
                                    )}
                                </p>
                                <p><strong>Total Claims:</strong> {data?.claimCount}</p>
                                <p><strong>Created:</strong> {data?.createdAt}</p>
                                <p><strong>Owner:</strong> {data?.owner}</p>
                            </Card>
                        </div>
                        <br />
                        <p>
                            <a
                                href={getExplorerUrl(ACTIVE_CHAIN, uploadId)}
                                target="_blank"
                            >
                                View contract on explorer
                            </a>
                        </p>
                    </Col>
                    <Col span={12}>
                        <div>
                            <Tabs
                                activeKey={activeTab}
                                tabPosition="top"
                                size="large"
                                onChange={(key) => {
                                    console.log('tab key', key);
                                    setError(undefined);
                                    setActiveTab(key);
                                }}
                                items={tabItems}
                                style={{ height: 'auto' }}
                            />
                        </div>

                        {rpcLoading && (
                            <div>
                                <br />
                                <Spin size="large" />
                                <p>Processing transaction...</p>
                            </div>
                        )}
                        <br />
                        {result && (
                            <div>
                                <Card title="Result" size="small">
                                    {result.type === 'claim_submitted' && (
                                        <div>
                                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                                ✅ {result.message}
                                            </p>
                                            <p>Amount: ${result.amount}</p>
                                            <p>Description: {result.description}</p>
                                        </div>
                                    )}
                                    {result.type === 'receipt_validation' && (
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
                                    {result.type === 'claim_processed' && (
                                        <div>
                                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                                ✅ Claim #{result.claimId} {result.status}
                                            </p>
                                            {result.reason && <p>Reason: {result.reason}</p>}
                                        </div>
                                    )}
                                    {result.type === 'policy_status_updated' && (
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
                                    {result.type === 'policy_status_updated' && (
                                        <div>
                                            <p style={{ color: 'green', fontWeight: 'bold' }}>
                                                ✅ Policy {result.status}
                                            </p>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}

                        {error && (
                            <div className="error-text">
                                <div style={{ marginBottom: '15px' }}>
                                    Error: {error}
                                </div>
                                {networkError && isConnected && chain && !CHAIN_MAP[chain.id] && (
                                    <div style={{ 
                                        padding: '15px', 
                                        border: '1px solid #ff4d4f', 
                                        borderRadius: '6px', 
                                        backgroundColor: '#fff2f0',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ marginBottom: '10px', color: '#ff4d4f' }}>
                                            <strong>Wrong Network Detected</strong>
                                        </div>
                                        <div style={{ marginBottom: '15px', fontSize: '14px' }}>
                                            You're connected to <strong>{chain.name}</strong>.<br />
                                            This app requires <strong>{ACTIVE_CHAIN.name}</strong>.
                                        </div>
                                        <Button 
                                            type="primary" 
                                            danger
                                            size="large"
                                            loading={isSwitching}
                                            onClick={async () => {
                                                try {
                                                    console.log('Switching to network:', ACTIVE_CHAIN.id, ACTIVE_CHAIN);
                                                    await switchNetwork?.(ACTIVE_CHAIN.id);
                                                } catch (error) {
                                                    console.error('Network switch failed:', error);
                                                    // Fallback: show manual instructions
                                                    alert(`Failed to switch networks automatically. Please manually switch to ${ACTIVE_CHAIN.name} in your wallet.`);
                                                }
                                            }}
                                            style={{ minWidth: '200px' }}
                                        >
                                            {isSwitching ? 'Switching...' : `Switch to ${ACTIVE_CHAIN.name}`}
                                        </Button>
                                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                            If the button doesn't work, please switch networks manually in your wallet.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default PolicyDetail;
