'use client';

import React, { useEffect, useState } from 'react';
import {
    Button,
    Input,
    Row,
    Col,
    Steps,
    Result,
    Divider,
    Checkbox,
    Card,
    Image,
    Tooltip,
    Select,
    Switch,
    Spin,
} from 'antd';
import {
    policyUrl,
    ipfsUrl,
    getExplorerUrl,
    humanError,
    isEmpty,
    bytesToSize,
} from '../../util';
import { uploadFiles } from '../../util/stor';
import TextArea from 'antd/lib/input/TextArea';
import {
    EXAMPLE_ITEM,
    ACTIVE_CHAIN,
    APP_NAME,
    CHAIN_MAP,
    MAX_FILE_SIZE_BYTES,
} from '../../constants';
import { FileDrop } from '../FileDrop';
import { deployContract, fundContractWithUSDFC } from '../../util/appContract';
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import ConnectButton from '../ConnectButton';
import { useEthersSigner } from '../../hooks/useEthersSigner';
import { InfoCircleOutlined } from '@ant-design/icons';
import PolicyFormFields from './PolicyFormFields';

function CreatePolicy() {
    const { address, isConnected } = useAccount();
    const { chain } = useNetwork();
    const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();

    const signer = useEthersSigner({ chainId: chain?.id });
    const activeChain = CHAIN_MAP[chain?.id] || ACTIVE_CHAIN;

    const [data, setData] = useState({});
    const [error, setError] = useState();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [result, setResult] = useState();
    const [networkError, setNetworkError] = useState(false);
    const [initialFunding, setInitialFunding] = useState('0');

    // Handle network changes
    useEffect(() => {
        if (isConnected && chain) {
            console.log('Network changed to:', chain.name, chain.id);
            // Clear any existing errors when network changes
            setError(undefined);
            setNetworkError(false);

            // Check if we're on the supported network
            if (!CHAIN_MAP[chain.id]) {
                setNetworkError(true);
                setError(`Unsupported network. Please switch to ${ACTIVE_CHAIN.name}`);
            }

            // Page is ready once we have network info
            setPageLoading(false);
        } else if (isConnected === false) {
            // User is not connected, page is ready to show connect button
            setPageLoading(false);
        }
    }, [chain?.id, isConnected]);

    // Initial page load effect
    useEffect(() => {
        // Set a timeout to stop loading after 3 seconds even if wallet doesn't connect
        const timeout = setTimeout(() => {
            setPageLoading(false);
        }, 3000);

        return () => clearTimeout(timeout);
    }, []);

    const setDemo = () => setData({
        name: 'Remote Work Internet Reimbursement Policy',
        description: 'Employees working from home are eligible for up to 50% reimbursement of monthly internet costs, with a maximum of $100 per month. Receipts must be submitted monthly with proof of internet service.',
        businessType: 'technology',
        location: 'california',
        employeeCount: '11-50',
        maxAmount: '100',
        category: 'internet',
        ...EXAMPLE_ITEM
    });

    const updateData = (key, value) => {
        setData({ ...data, [key]: value });
    };

    const getActiveError = (data) => {
        if (networkError) {
            return `Please switch to ${ACTIVE_CHAIN.name} network in your wallet`;
        }
        if (!isConnected || !address) {
            return 'Please connect your wallet';
        }
        if (!data.name || !data.description) {
            return 'Please provide a policy name and description.';
        }
        if (!data.businessType || !data.location || !data.employeeCount) {
            return 'Please provide business type, location, and employee count.';
        }
        if (!data.maxAmount || !data.category) {
            return 'Please specify maximum reimbursement amount and category.';
        }
        if (!signer) {
            return `Please connect a valid ${activeChain.name} wallet`;
        }

        return undefined;
    };

    const errMessage = getActiveError(data);

    const create = async () => {
        setError(undefined);
        setNetworkError(false);

        if (errMessage) {
            setError(errMessage);
            return;
        }

        // Double-check network before deployment
        if (!isConnected || !chain || !CHAIN_MAP[chain.id]) {
            setNetworkError(true);
            setError(`Please connect to ${ACTIVE_CHAIN.name} network and refresh the page`);
            return;
        }

        setLoading(true);
        const body = { ...data };
        if (!isEmpty(body.keywords)) {
            body['description'] = `${body.description}} | {${body.keywords}}}`;
        }

        // Format files for upload.
        const files = (body.files || []).map((x) => {
            return x;
        });

        let res = { ...data };

        try {
            // 1) Create files/metadata to ipfs (optional policy documents)
            let cid = data.cid ?? '';
            if (data.files && data.files.length > 0) {
                const files = (body.files || []).map((x) => {
                    return x;
                });
                const file = files[0];
                res['fileName'] = file.name;
                cid = await uploadFiles(files, res);
            }

            // 2) Deploy reimbursement policy contract
            const contract = await deployContract(
                signer,
                data.name,
                data.description,
                data.businessType,
                data.location,
                data.employeeCount,
                data.maxAmount,
                data.category
            );

            res['cid'] = cid;
            res['contract'] = contract.address;
            res['policyUrl'] = policyUrl(contract.address || cid);
            res['contractUrl'] = getExplorerUrl(activeChain, contract.address);

            // 3) Fund contract with initial USDFC if specified
            if (initialFunding && parseFloat(initialFunding) > 0) {
                try {
                    const { ethers } = await import('ethers');
                    const fundingAmount = ethers.utils.parseEther(initialFunding);
                    await fundContractWithUSDFC(signer, contract.address, fundingAmount);
                    res['initialFunding'] = initialFunding;
                    console.log('Contract funded with', initialFunding, 'USDFC');
                } catch (fundingError) {
                    console.warn('Contract deployed but funding failed:', fundingError);
                    res['fundingError'] = humanError(fundingError);
                }
            }

            // 4) Store additional metadata locally (optional)
            const policyData = {
                ...data,
                address: contract.address,
                deployedAt: new Date().toISOString()
            };

            // Result rendered after successful policy deployment
            setResult(res);
        } catch (e) {
            console.error('error creating reimbursement policy', e);
            
            // Provide specific error messages for common issues
            let errorMessage = humanError(e);
            
            // Additional context for gas estimation failures
            if (e.message && (e.message.includes('failed to estimate gas') || 
                             e.message.includes('ApplyWithGasOnState failed') ||
                             e.message.includes('actor not found'))) {
                errorMessage = 'Unable to create policy. Please ensure your wallet has sufficient funds for gas fees and try again. If you just funded your wallet, wait a moment for the transaction to confirm.';
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const openTab = (url) => {
        window.open(url, '_blank');
    };

    const getStep = () => {
        if (!!result) {
            return 2;
        } else if (!errMessage) {
            return 1;
        }
        return 0;
    };

    const resultOptions = [                        <Button
                            type="primary"
                            onClick={() => openTab(result?.contractUrl)}
                            target="_blank"
                        >
                            View policy contract
                        </Button>,
    ];

    if (result?.cid) {
        resultOptions.push(
            <Button
                type="dashed"
                onClick={() => openTab(ipfsUrl(result.cid))}
                target="_blank"
            >
                View policy documents
            </Button>
        );
    }

    return (
        <div>
            {pageLoading ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    textAlign: 'center'
                }}>
                    <Image
                        className='pb-2 mb-2'
                        src="logo.png"
                        alt="Cleared Logo"
                        width={180}
                        height={37}
                    />
                    <br />
                    <Spin size="large" />
                    <h3 style={{ margin: '20px 0', color: '#666' }}>Loading Policy Creation Portal...</h3>
                    <p style={{ color: '#999', fontSize: '14px' }}>
                        Checking wallet connection and network status
                    </p>
                </div>
            ) : (
                <>
                    <Row>
                        <Col span={24}>
                            <div className="centered">
                                <Image
                                    className='pb-2 mb-2'
                                    src="logo.png"
                                    alt="Cleared Logo"
                                    width={180}
                                    height={37}
                                />
                                <h3 style={{ margin: '30px 0 40px 0', fontSize: '28px' }}>Create Reimbursement Policy</h3>

                        {isConnected && chain && !CHAIN_MAP[chain.id] && (
                            <div style={{
                                padding: '8px 12px',
                                borderRadius: '4px',
                                backgroundColor: '#fff2f0',
                                border: '1px solid #ffb3b3',
                                fontSize: '12px',
                                marginBottom: '10px'
                            }}>
                                Connected to: <strong>{chain.name}</strong>
                                <span style={{ color: '#ff4d4f' }}> (Unsupported)</span>
                            </div>
                        )}

                        <br />
                        <br />
                    </div>
                </Col>
            </Row>

            <Row>
                <Col span={16}>
                    <div className="create-form white boxed">
                        {!result && (
                            <>
                                <h2 className="vertical-margin">
                                    Policy Information
                                </h2>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setDemo();
                                    }}
                                >
                                    Set demo values
                                </a>
                                <Divider />

                                <PolicyFormFields
                                    data={data}
                                    updateData={updateData}
                                    initialFunding={initialFunding}
                                    setInitialFunding={setInitialFunding}
                                    userUSDFCBalance="0"
                                />

                                <br />

                                <h4>Company Administrator</h4>
                                <Input
                                    placeholder={'Company administrator wallet address'}
                                    value={address || data.createdBy}
                                    disabled
                                    onChange={(e) =>
                                        updateData('createdBy', e.target.value)
                                    }
                                />

                                <br />
                                <br />

                                <Card title="Policy Template (Optional)">
                                    <p>Upload a policy document or legal reference to automatically generate smart contract rules.</p>
                                    <FileDrop
                                        files={data.files || []}
                                        setFiles={(files) =>
                                            updateData('files', files)
                                        }
                                    />
                                    <br />
                                    <p className="text-sm text-gray-600">
                                        Supported formats: PDF, DOC, TXT. This will help generate more accurate reimbursement rules.
                                    </p>
                                </Card>

                                <br />

                                {/* Remove the old shouldUpload checkbox section */}

                                {/* TODO: add configurable amount of items */}

                                <div>
                                    <Divider />
                                    {address && (
                                        <Button
                                            type="primary"
                                            className="standard-button"
                                            onClick={create}
                                            disabled={loading || errMessage}
                                            loading={loading}
                                            size="large"
                                        >
                                            Deploy Reimbursement Policy
                                        </Button>
                                    )}

                                    {!address && (
                                        <ConnectButton text="Connect wallet to continue" />
                                    )}                                {!error && !result && loading && (
                                    <span className="italic">
                                        &nbsp;Deploying reimbursement policy contract.
                                        Confirmation may take a few moments.
                                    </span>
                                )}

                                {networkError && (
                                    <div style={{ marginTop: '10px' }}>
                                        <Button
                                            type="default"
                                            onClick={() => window.location.reload()}
                                            size="small"
                                        >
                                            Refresh Page
                                        </Button>
                                        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                            Network changed. Please refresh to continue.
                                        </p>
                                    </div>
                                )}
                                </div>

                                <br />
                                <br />
                            </>
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
                        {result && (
                            <div>
                                <Result
                                    status="success"
                                    title="Reimbursement Policy Deployed! 🎉"
                                    subTitle="Your policy is now live on-chain. Share the employee submission link below with your team."
                                    extra={resultOptions}
                                />
                                <div>
                                    <br />
                                    <br />
                                    <div>
                                        <h5>
                                            Employee Submission Portal:
                                        </h5>
                                        <p>Share this link with your employees to submit reimbursement requests:</p>
                                        <br />
                                        <a
                                            href={result.policyUrl}
                                            target="_blank"
                                            style={{
                                                background: '#f0f2f5',
                                                padding: '10px',
                                                borderRadius: '4px',
                                                fontFamily: 'monospace',
                                                fontSize: '14px',
                                                display: 'block',
                                                marginBottom: '10px'
                                            }}
                                        >
                                            {result.policyUrl}
                                        </a>
                                        <br />                        <p><strong>Policy Details:</strong></p>
                        <ul>
                            <li>Category: {data.category}</li>
                            <li>Max Amount: ${data.maxAmount} USD</li>
                            <li>Business Type: {data.businessType}</li>
                            <li>Location: {data.location}</li>
                            {result.initialFunding && (
                                <li style={{ color: '#52c41a', fontWeight: 'bold' }}>
                                    ✅ Initial Funding: {result.initialFunding} USDFC
                                </li>
                            )}
                            {result.fundingError && (
                                <li style={{ color: '#ff4d4f' }}>
                                    ⚠️ Funding Error: {result.fundingError}
                                </li>
                            )}
                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Col>
                <Col span={1}></Col>
                <Col span={7}>
                    <div className="white boxed">
                        <Steps
                            className="standard-margin"
                            direction="vertical"
                            size="small"
                            items={[
                                {
                                    title: 'Define Policy Rules',
                                    description:
                                        'Specify business details and reimbursement parameters.',
                                },
                                {
                                    title: `Deploy ${APP_NAME} Policy Contract`,
                                    description: (
                                        <span>
                                            Deploys a{' '}
                                            <a
                                                href="https://github.com/cbonoz/xrp23/blob/main/contracts/contracts/ClearedContract.sol"
                                                target="_blank"
                                            >
                                                reimbursement policy contract
                                            </a>{' '}
                                            that enforces your rules on-chain
                                        </span>
                                    ),
                                },
                                {
                                    title: 'Share Employee Portal',
                                    description:
                                        'Distribute the generated link for employees to submit reimbursement requests',
                                },
                            ]}
                            current={getStep()}
                        ></Steps>
                    </div>
                </Col>
            </Row>
                </>
            )}
        </div>
    );
}

export default CreatePolicy;
