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
} from 'antd';
import {
    uploadUrl,
    ipfsUrl,
    getExplorerUrl,
    humanError,
    isEmpty,
    bytesToSize,
} from '../util';
import { uploadFiles } from '../util/stor';
import TextArea from 'antd/lib/input/TextArea';
import {
    EXAMPLE_ITEM,
    ACTIVE_CHAIN,
    APP_NAME,
    CHAIN_MAP,
    MAX_FILE_SIZE_BYTES,
} from '../constants';
import { FileDrop } from './FileDrop';
import { deployContract } from '../util/appContract';
import { useAccount, useNetwork } from 'wagmi';
import ConnectButton from './ConnectButton';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { InfoCircleOutlined } from '@ant-design/icons';

function CreateListing() {
    const { address } = useAccount();
    const { chain } = useNetwork();

    const signer = useEthersSigner({ chainId: chain?.id });
    const activeChain = CHAIN_MAP[chain?.id] || ACTIVE_CHAIN;
    //   useEffect(() => {
    //     const networkId = network?.chain?.id
    //     console.log('network', network)
    //     if (networkId) {
    //       refetch()
    //     }
    //   }, [network, account])

    const [data, setData] = useState({});
    const [error, setError] = useState();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState();

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

        if (errMessage) {
            setError(errMessage);
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
            res['uploadUrl'] = uploadUrl(contract.address || cid);
            res['contractUrl'] = getExplorerUrl(activeChain, contract.address);

            // 3) Store additional metadata locally (optional)
            const policyData = { 
                ...data,
                address: contract.address,
                deployedAt: new Date().toISOString()
            };

            // Result rendered after successful policy deployment
            setResult(res);
        } catch (e) {
            console.error('error creating reimbursement policy', e);
            setError(humanError(e));
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
            <Row>
                <Col span={24}>
                    <div className="centered">
                        <Image
                            src="logo.png"
                            alt="Cleared Logo"
                            width={180}
                            height={37}
                        />
                        <h3>Create Reimbursement Policy</h3>
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

                                <h4>Policy Name</h4>
                                <Input
                                    placeholder="e.g., Remote Work Internet Reimbursement Policy"
                                    value={data.name}
                                    onChange={(e) =>
                                        updateData('name', e.target.value)
                                    }
                                />
                                <br />
                                <br />
                                <h4>Policy Description</h4>
                                <TextArea
                                    aria-label="Policy Description"
                                    onChange={(e) =>
                                        updateData(
                                            'description',
                                            e.target.value
                                        )
                                    }
                                    placeholder="Describe the reimbursement rules and conditions (e.g., Up to 50% of monthly internet costs for remote employees, maximum $100/month)"
                                    prefix="Description"
                                    value={data.description}
                                />
                                <br />
                                <br />
                                <h4>Business Type</h4>
                                <Select
                                    placeholder="Select your business type"
                                    style={{ width: '100%' }}
                                    value={data.businessType}
                                    onChange={(value) => updateData('businessType', value)}
                                    options={[
                                        { value: 'technology', label: 'Technology' },
                                        { value: 'healthcare', label: 'Healthcare' },
                                        { value: 'finance', label: 'Finance' },
                                        { value: 'retail', label: 'Retail' },
                                        { value: 'manufacturing', label: 'Manufacturing' },
                                        { value: 'consulting', label: 'Consulting' },
                                        { value: 'other', label: 'Other' }
                                    ]}
                                />
                                <br />
                                <br />
                                <h4>Business Location</h4>
                                <Select
                                    placeholder="Select your business location"
                                    style={{ width: '100%' }}
                                    value={data.location}
                                    onChange={(value) => updateData('location', value)}
                                    options={[
                                        { value: 'california', label: 'California, USA' },
                                        { value: 'new-york', label: 'New York, USA' },
                                        { value: 'texas', label: 'Texas, USA' },
                                        { value: 'florida', label: 'Florida, USA' },
                                        { value: 'washington', label: 'Washington, USA' },
                                        { value: 'other-us', label: 'Other US State' },
                                        { value: 'international', label: 'International' }
                                    ]}
                                />
                                <br />
                                <br />
                                <h4>Number of Employees</h4>
                                <Select
                                    placeholder="Select company size"
                                    style={{ width: '100%' }}
                                    value={data.employeeCount}
                                    onChange={(value) => updateData('employeeCount', value)}
                                    options={[
                                        { value: '1-10', label: '1-10 employees' },
                                        { value: '11-50', label: '11-50 employees' },
                                        { value: '51-200', label: '51-200 employees' },
                                        { value: '201-1000', label: '201-1000 employees' },
                                        { value: '1000+', label: '1000+ employees' }
                                    ]}
                                />
                                <br />
                                <br />
                                <h4>Maximum Reimbursement Amount (USD)</h4>
                                <Input
                                    type="number"
                                    placeholder="e.g., 100"
                                    value={data.maxAmount}
                                    onChange={(e) =>
                                        updateData('maxAmount', e.target.value)
                                    }
                                />
                                <br />
                                <br />
                                <h4>Reimbursement Category</h4>
                                <Select
                                    placeholder="Select reimbursement category"
                                    style={{ width: '100%' }}
                                    value={data.category}
                                    onChange={(value) => updateData('category', value)}
                                    options={[
                                        { value: 'internet', label: 'Internet/Utilities' },
                                        { value: 'phone', label: 'Phone/Mobile' },
                                        { value: 'office-supplies', label: 'Office Supplies' },
                                        { value: 'travel', label: 'Travel Expenses' },
                                        { value: 'training', label: 'Training/Education' },
                                        { value: 'health', label: 'Health/Wellness' },
                                        { value: 'other', label: 'Other' }
                                    ]}
                                />
                                <br />
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
                                    )}

                                    {!error && !result && loading && (
                                        <span className="italic">
                                            &nbsp;Deploying reimbursement policy contract.
                                            Confirmation may take a few moments.
                                        </span>
                                    )}
                                </div>

                                <br />
                                <br />
                            </>
                        )}
                        {error && (
                            <div className="error-text">Error: {error}</div>
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
                                            href={result.uploadUrl}
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
                                            {result.uploadUrl}
                                        </a>
                                        <br />
                                        <p><strong>Policy Details:</strong></p>
                                        <ul>
                                            <li>Category: {data.category}</li>
                                            <li>Max Amount: ${data.maxAmount} USD</li>
                                            <li>Business Type: {data.businessType}</li>
                                            <li>Location: {data.location}</li>
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
        </div>
    );
}

export default CreateListing;
