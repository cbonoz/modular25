'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { ethers } from 'ethers';
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

// Import modular components
import EmployeeClaimForm from './EmployeeClaimForm';
import PolicyInfoCard from './PolicyInfoCard';
import OwnerFundingCard from './OwnerFundingCard';
import ClaimsList from './ClaimsList';
import ResultCard from './ResultCard';
import { getStatusColor, getStatusText, RESULT_MESSAGES } from './PolicyConstants';

import {
    submitClaim,
    getClaim,
    getEmployeeClaims,
    processClaim,
    getMetadata,
    validateReceipt,
    updatePolicyStatus,
    getContractUSDFCBalance,
    getUserUSDFCBalance,
    fundContractWithUSDFC,
    getFundingInfo,
    withdrawFromContract,
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

    // USDFC-related state
    const [contractUSDFCBalance, setContractUSDFCBalance] = useState('0');
    const [userUSDFCBalance, setUserUSDFCBalance] = useState('0');
    const [fundingAmount, setFundingAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [fundingInfo, setFundingInfo] = useState({ totalFunded: '0', totalReimbursed: '0', remainingBalance: '0' });
    const [usdcLoading, setUsdcLoading] = useState(false);

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
                type: RESULT_MESSAGES.CLAIM_SUBMITTED,
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
                type: RESULT_MESSAGES.RECEIPT_VALIDATION,
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
                type: RESULT_MESSAGES.CLAIM_PROCESSED,
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
                type: RESULT_MESSAGES.POLICY_STATUS_UPDATED,
                status: isActive ? 'Activated' : 'Deactivated'
            });
            await getData(); // Refresh policy data
        } catch (e) {
            setError(humanError(e));
        } finally {
            setRpcLoading(false);
        }
    }

    // Load USDFC balances and funding info
    async function loadUSDFCData() {
        try {
            setUsdcLoading(true);
            
            // Get contract USDFC balance
            const contractBalance = await getContractUSDFCBalance(signer, uploadId);
            setContractUSDFCBalance(contractBalance.toString());
            
            // Get user USDFC balance
            if (address) {
                const userBalance = await getUserUSDFCBalance(signer, address);
                setUserUSDFCBalance(userBalance.toString());
            }
            
            // Get funding info
            const funding = await getFundingInfo(signer, uploadId);
            setFundingInfo({
                totalFunded: funding.totalFunded.toString(),
                totalReimbursed: funding.totalReimbursed.toString(),
                remainingBalance: funding.remainingBalance.toString()
            });
            
        } catch (e) {
            console.error('Error loading USDFC data', e);
        } finally {
            setUsdcLoading(false);
        }
    }

    // Fund contract with USDFC (owner only)
    async function handleFundContract() {
        setRpcPending();
        try {
            await fundContractWithUSDFC(signer, uploadId, fundingAmount);
            setResult({
                type: RESULT_MESSAGES.CONTRACT_FUNDED,
                amount: fundingAmount
            });
            setFundingAmount('');
            await loadUSDFCData(); // Refresh balances
        } catch (e) {
            setError(humanError(e));
        } finally {
            setRpcLoading(false);
        }
    }

    // Withdraw from contract (owner only)
    async function handleWithdrawFromContract() {
        setRpcPending();
        try {
            await withdrawFromContract(signer, uploadId, withdrawAmount);
            setResult({
                type: RESULT_MESSAGES.CONTRACT_WITHDRAWAL,
                amount: withdrawAmount
            });
            setWithdrawAmount('');
            await loadUSDFCData(); // Refresh balances
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
            
            // Load USDFC data after main policy data is loaded
            await loadUSDFCData();
            
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

    // Employee tab - Submit reimbursement claim
    const employeeTab = {
        key: '1',
        label: 'Submit Reimbursement Claim',
        children: (
            <EmployeeClaimForm
                data={data}
                claimAmount={claimAmount}
                setClaimAmount={setClaimAmount}
                claimDescription={claimDescription}
                setClaimDescription={setClaimDescription}
                files={files}
                setFiles={setFiles}
                shouldUpload={shouldUpload}
                setShouldUpload={setShouldUpload}
                contractUSDFCBalance={contractUSDFCBalance}
                usdcLoading={usdcLoading}
                rpcLoading={rpcLoading}
                onSubmitClaim={submitReimbursementClaim}
            />
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
            <ClaimsList
                claims={employeeClaims}
                isOwner={false}
                onProcessClaim={null} // Employees can't process claims
                rpcLoading={rpcLoading}
            />
        ),
    };

    // Owner management tab
    const ownerManagementTab = {
        key: '4',
        label: `Manage Claims (${allClaims.length})`,
        children: (
            <ClaimsList
                claims={allClaims}
                isOwner={true}
                onProcessClaim={handleProcessClaim}
                rpcLoading={rpcLoading}
            />
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
                {loading ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '400px',
                        textAlign: 'center'
                    }}>
                        <Spin size="large" />
                        <h3 style={{ margin: '20px 0', color: '#666' }}>Loading Policy Information...</h3>
                        <p style={{ color: '#999', fontSize: '14px' }}>
                            Fetching contract data and USDFC balances
                        </p>
                    </div>
                ) : (
                    <>
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
                            <PolicyInfoCard
                                data={data}
                                isOwner={isOwner}
                                onUpdatePolicyStatus={handleUpdatePolicyStatus}
                            />
                            
                            {/* USDFC Funding Section - Owner Only */}
                            {isOwner && (
                                <OwnerFundingCard
                                    contractUSDFCBalance={contractUSDFCBalance}
                                    userUSDFCBalance={userUSDFCBalance}
                                    fundingInfo={fundingInfo}
                                    fundingAmount={fundingAmount}
                                    setFundingAmount={setFundingAmount}
                                    withdrawAmount={withdrawAmount}
                                    setWithdrawAmount={setWithdrawAmount}
                                    onFundContract={handleFundContract}
                                    onWithdrawFromContract={handleWithdrawFromContract}
                                    usdcLoading={usdcLoading}
                                    rpcLoading={rpcLoading}
                                />
                            )}
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
                            <ResultCard result={result} />
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
                    </>
                )}
            </Card>
        </div>
    );
};

export default PolicyDetail;
