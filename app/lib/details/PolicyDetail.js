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
	Tooltip
} from 'antd';
import { bytesToSize, getExplorerUrl, humanError, ipfsUrl, isEmpty } from '../../util';
import { ACTIVE_CHAIN, CHAIN_MAP, MAX_FILE_SIZE_BYTES } from '../../constants';
// Import mainnet chain for comparison
import { filecoin } from '@wagmi/core/chains';
import RenderObject from '../RenderObject';

// Import modular components
import EmployeeClaimForm from './EmployeeClaimForm';
import PolicyInfoCard from './PolicyInfoCard';
import PolicyManagementCard from './PolicyManagementCard';
import ClaimsList from './ClaimsList';
import ResultCard from './ResultCard';
import OwnerFundingCard from './OwnerFundingCard';
import { getStatusColor, getStatusText, RESULT_MESSAGES } from '../../constants/PolicyConstants';

import {
	submitClaim,
	getClaim,
	getEmployeeClaims,
	processClaim,
	getMetadata,
	updatePolicyStatus,
	getContractUSDFCBalance,
	getUserUSDFCBalance,
	fundContractWithUSDFC,
	getFundingInfo,
	withdrawFromContract,
	getContractPasscodeStatus,
	debugFundingPrerequisites
} from '../../util/appContract';
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import { useEthersSigner } from '../../hooks/useEthersSigner';
import ConnectButton from '../ConnectButton';
import { FileDrop } from '../FileDrop';
import TextArea from 'antd/es/input/TextArea';
import { InfoCircleOutlined } from '@ant-design/icons';
import { uploadFilesWithSynapse } from '../../util/synapse';
import { CLEARED_CONTRACT } from '@/util/metadata';

const PolicyDetail = ({ uploadId }) => {
	// All hooks must be called at the top level, before any early returns
	const { address, isConnected } = useAccount();
	const { chain } = useNetwork();
	const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();
	const signer = useEthersSigner({ chainId: chain?.id || ACTIVE_CHAIN.id });

	// All useState hooks
	const [pageLoading, setPageLoading] = useState(true);
	const [loading, setLoading] = useState(false);
	const [rpcLoading, setRpcLoading] = useState(false);
	const [policyStatusLoading, setPolicyStatusLoading] = useState(false);
	const [walletLoading, setWalletLoading] = useState(true);
	const [result, setResult] = useState();
	const [activeTab, setActiveTab] = useState('');
	const [error, setError] = useState();
	const [data, setData] = useState();
	const [employeeClaims, setEmployeeClaims] = useState([]);
	const [allClaims, setAllClaims] = useState([]);
	const [networkError, setNetworkError] = useState(false);

	// USDFC-related state
	const [contractUSDFCBalance, setContractUSDFCBalance] = useState('0');
	const [userUSDFCBalance, setUserUSDFCBalance] = useState('0');
	const [fundingAmount, setFundingAmount] = useState('');
	const [withdrawAmount, setWithdrawAmount] = useState('');
	const [fundingInfo, setFundingInfo] = useState({
		totalFunded: '0',
		totalReimbursed: '0',
		remainingBalance: '0'
	});
	const [usdcLoading, setUsdcLoading] = useState(false);

	// Upload status state
	const [uploadStatus, setUploadStatus] = useState(null); // { status: 'uploading', 'success', 'failed', data: ... }

	// Computed values
	const isOwner = data?.owner === address;

	// All useEffect hooks
	// Handle network changes and initial loading
	useEffect(() => {
		if (isConnected && chain) {
			console.log('Network changed to:', chain.name, chain.id);
			setError(undefined);
			setNetworkError(false);
			setWalletLoading(false);

			if (!CHAIN_MAP[chain.id]) {
				setNetworkError(true);
				setError(`Unsupported network. Please switch to ${ACTIVE_CHAIN.name} and refresh`);
			}
		} else if (isConnected === false) {
			// User is definitively not connected
			setWalletLoading(false);
		}
	}, [chain?.id, isConnected]);

	// Initial page load effect
	useEffect(() => {
		// Set a timeout to stop wallet loading after 2 seconds
		const timeout = setTimeout(() => {
			setWalletLoading(false);
		}, 2000);

		return () => clearTimeout(timeout);
	}, []);

	useEffect(() => {
		const checkData = uploadId && signer;
		if (checkData) {
			getData();
		}
	}, [uploadId, signer, address]);

	// Set default active tab when data loads or user role is determined
	useEffect(() => {
		if (data && address && activeTab === '') {
			const defaultTab = data.owner !== address ? '1' : '4'; // Employee: Submit Claim, Owner: View Claims
			console.log(
				'Setting default tab:',
				defaultTab,
				'isOwner:',
				data.owner === address,
				'owner:',
				data.owner,
				'address:',
				address
			);
			setActiveTab(defaultTab);
		}
	}, [data, address, activeTab]);

	// Add useEffect to load claims when data is available and user role is determined
	useEffect(() => {
		if (data && signer && address) {
			console.log('Data loaded, loading claims for role:', isOwner ? 'owner' : 'employee');
			if (isOwner) {
				loadAllClaims();
			} else {
				loadEmployeeClaims();
			}
		}
	}, [data, signer, address, isOwner]);

	// useMemo hooks
	const cardTitle = useMemo(() => {
		if (data) {
			return `${isOwner ? 'Policy Management' : 'Employee Portal'}: ${data.name}`;
		} else if (error) {
			return 'Policy Not Found';
		} else {
			return 'Loading...';
		}
	}, [error, data, isOwner]);

	const breadcrumbs = useMemo(
		() => [
			{
				title: 'Home',
				href: '/'
			},
			{
				title: data?.name || 'Policy',
				href: `/upload/${uploadId}`
			}
		],
		[data?.name, uploadId]
	);

	console.log('policy contract', uploadId);

	const setRpcPending = () => {
		setError();
		setRpcLoading(true);
		setResult();
	};

	// Simplified claim submission handler - receives structured data from EmployeeClaimForm
	async function handleClaimSubmission(claimData) {
		setRpcPending();
		try {
			const { amount, description, files, shouldUpload, passcode } = claimData;

			if (!files[0]) {
				throw new Error('Please upload a receipt');
			}

			const receiptHash = files[0].dataHash;

			// Determine if we're on mainnet (Filecoin) - non-blocking uploads
			// or testnet (Filecoin Calibration) - blocking uploads
			const isMainnet = chain?.id === filecoin.id;
			const shouldBlock = shouldUpload && !isMainnet; // Block on testnet, non-blocking on mainnet

			let uploadPromise = null;
			let finalCid = '';

			if (shouldUpload) {
				setUploadStatus({
					status: 'uploading',
					fileName: files[0].name,
					fileSize: files[0].size
				});

				if (shouldBlock) {
					// BLOCKING: Wait for upload to complete before submitting claim (testnet)
					console.log('📤 Blocking upload on testnet - waiting for completion...');
					try {
						finalCid = await uploadFilesWithSynapse(files, null, signer, chain);
						console.log('✓ Synapse upload completed:', finalCid);
						setUploadStatus({
							status: 'success',
							cid: finalCid,
							fileName: files[0].name,
							fileSize: files[0].size,
							timestamp: new Date().toISOString()
						});
					} catch (error) {
						console.error('✗ Synapse upload failed:', error);
						setUploadStatus({
							status: 'failed',
							error: error.message,
							fileName: files[0].name,
							fileSize: files[0].size,
							timestamp: new Date().toISOString()
						});

						// Check if this is a recoverable testnet issue
						const isRecoverableTestnetIssue =
							error.isNetworkIssue ||
							error.isGasIssue ||
							error.message?.includes('testnet') ||
							error.message?.includes('500') ||
							error.message?.includes('exit=[33]');

						if (isRecoverableTestnetIssue) {
							console.log(
								'⚠️ Detected recoverable testnet issue - allowing claim submission without upload'
							);
							// Show warning but allow user to continue
							setUploadStatus((prev) => ({
								...prev,
								allowProceed: true,
								warningMessage:
									'Upload failed due to testnet issues. You can proceed with claim submission using the receipt hash only.'
							}));
							finalCid = ''; // No CID, will use receipt hash only
						} else {
							// For non-recoverable errors, still fail
							throw new Error(`Upload failed: ${error.message}`);
						}
					}
				} else {
					// NON-BLOCKING: Start upload in background (mainnet)
					console.log('📤 Non-blocking upload on mainnet - submitting claim immediately...');
					uploadPromise = uploadFilesWithSynapse(files, null, signer, chain)
						.then((cid) => {
							console.log('✓ Synapse upload completed:', cid);
							setUploadStatus({
								status: 'success',
								cid,
								fileName: files[0].name,
								fileSize: files[0].size,
								timestamp: new Date().toISOString()
							});
							return cid;
						})
						.catch((error) => {
							console.error('✗ Synapse upload failed:', error);
							setUploadStatus({
								status: 'failed',
								error: error.message,
								fileName: files[0].name,
								fileSize: files[0].size,
								timestamp: new Date().toISOString()
							});
							return ''; // Return empty CID on failure
						});
				}
			}

			// Submit claim with appropriate CID
			const res = await submitClaim(
				signer,
				uploadId,
				amount,
				description,
				receiptHash,
				finalCid, // Will be populated if blocking upload, empty if non-blocking
				passcode
			);

			console.log('submitted claim', res);

			// Show success message with upload status info
			setResult({
				type: RESULT_MESSAGES.CLAIM_SUBMITTED,
				message: 'Reimbursement claim submitted successfully!',
				amount: amount,
				description: description,
				uploadInProgress: shouldUpload && uploadPromise !== null,
				uploadCompleted: shouldUpload && shouldBlock,
				network: isMainnet ? 'mainnet' : 'testnet'
			});

			// Refresh claims
			await loadEmployeeClaims();

			// If non-blocking upload was started, handle the result in background
			if (uploadPromise) {
				uploadPromise.then((cid) => {
					if (cid) {
						console.log('Background upload completed for claim, CID:', cid);
					}
				});
			}
		} catch (e) {
			console.log('error submitting claim', e);
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
		if (!data?.claimCount || !signer) return;
		try {
			console.log('Loading all claims, claimCount:', data.claimCount);
			const claims = [];
			for (let i = 1; i <= data.claimCount; i++) {
				const claim = await getClaim(signer, uploadId, i);
				claims.push({ id: i, ...claim });
			}
			console.log('Loaded claims:', claims);
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

			// Refresh contract balance after claim approval (when funds are disbursed)
			if (status === 1) {
				await loadUSDFCData();
			}
		} catch (e) {
			setError(humanError(e));
		} finally {
			setRpcLoading(false);
		}
	}

	// Update policy status (owner only)
	const handleUpdatePolicyStatus = async (newStatus) => {
		if (!signer || !uploadId) {
			setError('Wallet not connected');
			return;
		}

		setError(); // Clear any previous errors
		setPolicyStatusLoading(true); // Only use policy status loading
		setResult(); // Clear any previous results
		try {
			// Use the proper utility function instead of calling contract directly
			await updatePolicyStatus(signer, uploadId, newStatus);
			setResult({
				type: RESULT_MESSAGES.POLICY_STATUS_UPDATED,
				status: newStatus ? 'Activated' : 'Deactivated'
			});
			await getData(); // Refresh policy data
		} catch (e) {
			setError(humanError(e));
		} finally {
			setPolicyStatusLoading(false); // Only stop policy status loading
		}
	};

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
			// Don't set error here unless it's ownership-related, as this might just be a network issue
		} finally {
			setUsdcLoading(false);
		}
	}

	// Fund contract with USDFC (owner only)
	async function handleFundContract(amount) {
		setRpcPending();
		try {
			// Validate amount parameter
			if (!amount || amount.toString().trim() === '') {
				throw new Error('Please enter a valid funding amount');
			}

			// First run debug to check prerequisites
			console.log('Running funding prerequisites check with amount:', amount);
			const debugInfo = await debugFundingPrerequisites(signer, uploadId, amount);

			// If we reach here, debug completed - now try the actual funding
			await fundContractWithUSDFC(signer, uploadId, amount);
			setResult({
				type: RESULT_MESSAGES.CONTRACT_FUNDED,
				amount: amount
			});
			setFundingAmount(''); // Clear the input
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
				type: RESULT_MESSAGES.FUNDS_WITHDRAWN,
				amount: withdrawAmount
			});
			setWithdrawAmount(''); // Clear the input
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

			// Don't load claims here - let the useEffect handle it after data is set
			// This ensures proper state updates and prevents race conditions

			// Load USDFC data after main policy data is loaded
			await loadUSDFCData();
		} catch (e) {
			console.error('error getting policy data', e);
			setError(
				'Contract or policy could not be found. Please verify the contract address and try again.'
			);
		} finally {
			setLoading(false);
		}
	}

	// Early returns after all hooks are called
	if (walletLoading) {
		return (
			<Card title="Loading Policy Portal">
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						minHeight: '200px',
						textAlign: 'center'
					}}
				>
					<Spin size="large" />
					<p style={{ marginTop: '16px', color: '#666' }}>Checking wallet connection...</p>
				</div>
			</Card>
		);
	}

	if (!signer && !walletLoading) {
		return (
			<Card title="Reimbursement Policy Portal">
				<p className="bold">Connect your wallet to access this policy portal.</p>
				<br />
				<ConnectButton connectOnMount />
			</Card>
		);
	}

	// Tab configuration
	const employeeTab = {
		key: '1',
		label: 'Submit Claim',
		children: (
			<EmployeeClaimForm
				data={data}
				contractUSDFCBalance={contractUSDFCBalance}
				usdcLoading={usdcLoading}
				rpcLoading={rpcLoading}
				onSubmitClaim={handleClaimSubmission}
				signer={signer}
				contractAddress={uploadId}
			/>
		)
	};

	const claimsHistoryTab = {
		key: '3',
		label: `My Claims (${employeeClaims.length})`,
		children: (
			<ClaimsList
				claims={employeeClaims}
				isOwner={false}
				onProcessClaim={null}
				getStatusColor={getStatusColor}
				getStatusText={getStatusText}
				rpcLoading={rpcLoading}
			/>
		)
	};

	const ownerTabs = [
		{
			key: '4',
			label: `View Claims (${allClaims.length})`,
			children: (
				<ClaimsList
					claims={allClaims}
					isOwnerView={true}
					onProcessClaim={handleProcessClaim}
					getStatusColor={getStatusColor}
					getStatusText={getStatusText}
					rpcLoading={rpcLoading}
				/>
			)
		},
		{
			key: '5',
			label: 'Funding Management',
			children: (
				<div>
					<OwnerFundingCard
						contractUSDFCBalance={contractUSDFCBalance}
						userUSDFCBalance={userUSDFCBalance}
						usdcLoading={usdcLoading}
						rpcLoading={rpcLoading}
						policyStatusLoading={policyStatusLoading}
						onFundContract={handleFundContract}
						onWithdrawFromContract={handleWithdrawFromContract}
						onFundingComplete={async () => {
							// Refresh both policy data and USDFC balances after funding operations
							await Promise.all([getData(), loadUSDFCData()]);
						}}
					/>

					<PolicyManagementCard
						policy={data}
						onUpdatePolicyStatus={handleUpdatePolicyStatus}
						policyStatusLoading={policyStatusLoading}
						isOwner={isOwner}
						rpcLoading={rpcLoading}
						style={{ marginBottom: '24px' }}
					/>
				</div>
			)
		}
	];

	const tabItems = [];
	if (!isOwner) {
		tabItems.push(employeeTab);
		tabItems.push(claimsHistoryTab);
	} else {
		tabItems.push(...ownerTabs);
	}

	return (
		<div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
			<Breadcrumb
				items={breadcrumbs}
				style={{
					padding: '16px 24px',
					background: 'white',
					borderBottom: '1px solid #f0f0f0'
				}}
			/>

			{loading ? (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						minHeight: '400px',
						textAlign: 'center'
					}}
				>
					<Spin size="large" />
					<h3 style={{ margin: '20px 0', color: '#666' }}>Loading Policy Information...</h3>
					<p style={{ color: '#999', fontSize: '14px' }}>
						Fetching contract data and USDFC balances
					</p>
				</div>
			) : error && !data ? (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						minHeight: '400px',
						textAlign: 'center',
						padding: '40px'
					}}
				>
					<div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
					<h3 style={{ color: '#ff4d4f', marginBottom: '16px' }}>Policy Not Found</h3>
					<p
						style={{
							color: '#666',
							fontSize: '16px',
							marginBottom: '24px',
							maxWidth: '500px'
						}}
					>
						The contract or policy could not be found. This might happen if:
					</p>
					<ul
						style={{
							textAlign: 'left',
							color: '#666',
							fontSize: '14px',
							marginBottom: '24px',
							listStyle: 'none',
							padding: 0
						}}
					>
						<li style={{ marginBottom: '8px' }}>• The policy link is incorrect or expired</li>
						<li style={{ marginBottom: '8px' }}>• The policy is still being created</li>
						<li style={{ marginBottom: '8px' }}>
							• Your wallet is connected to the wrong blockchain
						</li>
						<li style={{ marginBottom: '8px' }}>• The policy creation was unsuccessful</li>
					</ul>
					<div style={{ display: 'flex', gap: '12px' }}>
						<Button type="primary" onClick={() => window.location.reload()}>
							Retry
						</Button>
						<Button type="default" onClick={() => (window.location.href = '/')}>
							Go Home
						</Button>
					</div>
					{networkError && isConnected && chain && !CHAIN_MAP[chain.id] && (
						<div
							style={{
								marginTop: '24px',
								padding: '16px',
								border: '1px solid #ff4d4f',
								borderRadius: '6px',
								backgroundColor: '#fff2f0',
								maxWidth: '400px'
							}}
						>
							<div
								style={{
									marginBottom: '10px',
									color: '#ff4d4f',
									fontWeight: 'bold'
								}}
							>
								Wrong Network Detected
							</div>
							<div
								style={{
									marginBottom: '15px',
									fontSize: '14px'
								}}
							>
								You're connected to <strong>{chain.name}</strong>.<br />
								This app requires <strong>{ACTIVE_CHAIN.name}</strong>.
							</div>
							<Button
								type="primary"
								danger
								loading={isSwitching}
								onClick={async () => {
									try {
										console.log('Switching to network:', ACTIVE_CHAIN.id, ACTIVE_CHAIN);
										await switchNetwork?.(ACTIVE_CHAIN.id);
									} catch (error) {
										console.error('Network switch failed:', error);
									}
								}}
								style={{ width: '100%' }}
							>
								{isSwitching ? 'Switching...' : `Switch to ${ACTIVE_CHAIN.name}`}
							</Button>
						</div>
					)}
				</div>
			) : (
				<>
					{/* Hero Section */}
					<div
						style={{
							background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
							color: 'white',
							padding: '48px 24px',
							marginBottom: '24px'
						}}
					>
						<div style={{ maxWidth: '1200px', margin: '0 auto' }}>
							<Row gutter={[32, 32]} align="middle">
								<Col xs={24} lg={16}>
									<div>
										<h1
											style={{
												fontSize: '36px',
												fontWeight: 'bold',
												color: 'white',
												marginBottom: '16px',
												margin: 0
											}}
										>
											{data?.name}
										</h1>
										<p
											style={{
												fontSize: '18px',
												color: 'rgba(255,255,255,0.9)',
												marginBottom: '24px',
												lineHeight: '1.6'
											}}
										>
											{data?.description}
										</p>

										<Row gutter={[24, 16]}>
											<Col xs={12} sm={6}>
												<div>
													<div
														style={{
															fontSize: '14px',
															opacity: 0.8
														}}
													>
														Category
													</div>
													<div
														style={{
															fontSize: '16px',
															fontWeight: '600'
														}}
													>
														{data?.policyParams?.category || 'General'}
													</div>
												</div>
											</Col>
											<Col xs={12} sm={6}>
												<div>
													<div
														style={{
															fontSize: '14px',
															opacity: 0.8
														}}
													>
														Max Amount
													</div>
													<div
														style={{
															fontSize: '16px',
															fontWeight: '600'
														}}
													>
														${data?.policyParams?.maxAmount} USD
													</div>
												</div>
											</Col>
											<Col xs={12} sm={6}>
												<div>
													<div
														style={{
															fontSize: '14px',
															opacity: 0.8
														}}
													>
														Location
													</div>
													<div
														style={{
															fontSize: '16px',
															fontWeight: '600'
														}}
													>
														{data?.policyParams?.location || 'Not specified'}
													</div>
												</div>
											</Col>
											<Col xs={12} sm={6}>
												<div>
													<div
														style={{
															fontSize: '14px',
															opacity: 0.8
														}}
													>
														Status
													</div>
													<div
														style={{
															fontSize: '16px',
															fontWeight: '600',
															display: 'flex',
															alignItems: 'center',
															gap: '8px'
														}}
													>
														{(() => {
															// Check if balance is zero for both owners and employees
															const balance = parseFloat(
																ethers.utils.formatUnits(contractUSDFCBalance || '0', 18)
															);
															const isBalanceZero = balance === 0;
															const isActive = data?.policyParams?.isActive;

															return (
																<>
																	<span>
																		{isActive && !isBalanceZero ? '✅ Active' : '❌ Inactive'}
																	</span>
																	{isActive && isBalanceZero && (
																		<div
																			style={{
																				fontSize: '12px',
																				color: 'rgba(255,255,255,0.7)',
																				fontWeight: 'normal'
																			}}
																		>
																			Needs funding
																		</div>
																	)}
																</>
															);
														})()}
													</div>
												</div>
											</Col>
										</Row>
									</div>
								</Col>

								{/* Only show balance for owners */}
								{isOwner && (
									<Col xs={24} lg={8}>
										<div style={{ textAlign: 'right' }}>
											<div
												style={{
													background: 'rgba(255,255,255,0.1)',
													borderRadius: '12px',
													padding: '24px',
													backdropFilter: 'blur(10px)'
												}}
											>
												<div
													style={{
														fontSize: '14px',
														opacity: 0.8,
														marginBottom: '8px'
													}}
												>
													Available Balance
												</div>
												<div
													style={{
														fontSize: '32px',
														fontWeight: 'bold',
														marginBottom: '16px'
													}}
												>
													$
													{parseFloat(
														ethers.utils.formatUnits(contractUSDFCBalance || '0', 18)
													).toFixed(2)}
												</div>
												<div
													style={{
														fontSize: '12px',
														opacity: 0.7
													}}
												>
													USDFC in contract
												</div>
											</div>
										</div>
									</Col>
								)}
							</Row>
						</div>
					</div>

					{/* Main Content */}
					<div
						style={{
							maxWidth: '1200px',
							margin: '0 auto',
							padding: '0 24px'
						}}
					>
						{/* Main Actions */}
						<Card
							title={
								<span
									style={{
										fontSize: '20px',
										fontWeight: '600'
									}}
								>
									{isOwner ? 'Policy Management' : 'Employee Portal'}
								</span>
							}
							style={{ marginBottom: '24px' }}
						>
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
								style={{ minHeight: '400px' }}
							/>

							{rpcLoading && (
								<div
									style={{
										textAlign: 'center',
										padding: '24px',
										background: '#f8f9fa',
										borderRadius: '8px',
										marginTop: '16px'
									}}
								>
									<Spin size="large" />
									<p
										style={{
											marginTop: '16px',
											color: '#666'
										}}
									>
										Processing transaction...
									</p>
								</div>
							)}

							{result && (
								<div style={{ marginTop: '16px' }}>
									<ResultCard result={result} uploadStatus={uploadStatus} />
								</div>
							)}

							{/* Show upload status even when there's no result yet */}
							{!result && uploadStatus && (
								<div style={{ marginTop: '16px' }}>
									<ResultCard uploadStatus={uploadStatus} />
								</div>
							)}

							{error && data && (
								<div
									style={{
										background: '#fff2f0',
										border: '1px solid #ffccc7',
										borderRadius: '8px',
										padding: '16px',
										marginTop: '16px'
									}}
								>
									<div
										style={{
											color: '#ff4d4f',
											fontWeight: '600',
											marginBottom: '8px'
										}}
									>
										Error
									</div>
									<div style={{ color: '#ff4d4f' }}>{error}</div>
								</div>
							)}
						</Card>

						{/* Additional Information */}
						<Card title="Contract Information" style={{ marginBottom: '24px' }} size="small">
							<Row gutter={[16, 16]}>
								<Col xs={24} sm={12}>
									<div>
										<strong>Contract Address:</strong>
										<div
											style={{
												fontFamily: 'monospace',
												fontSize: '12px',
												background: '#f5f5f5',
												padding: '4px 8px',
												borderRadius: '4px',
												marginTop: '4px'
											}}
										>
											{uploadId}
										</div>
									</div>
								</Col>
								<Col xs={24} sm={12}>
									<div>
										<strong>Business Type:</strong>{' '}
										{data?.policyParams?.businessType || 'Not specified'}
										<br />
										<strong>Employee Count:</strong>{' '}
										{data?.policyParams?.employeeCount || 'Not specified'}
									</div>
								</Col>
							</Row>
							<Divider />
							<div style={{ textAlign: 'center' }}>
								<Button
									type="link"
									href={getExplorerUrl(ACTIVE_CHAIN, uploadId)}
									target="_blank"
									icon={<InfoCircleOutlined />}
								>
									View Contract on Explorer
								</Button>
							</div>
						</Card>
					</div>
				</>
			)}
		</div>
	);
};

export default PolicyDetail;
