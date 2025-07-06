'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, Button, Input, Checkbox, Tooltip, Spin } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { FileDrop } from '../FileDrop';
import { isEmpty } from '../../util';
import { evaluateClaimWithAI } from '../../util/aiService';
import { getContractPasscodeStatus } from '../../util/appContract';

const EmployeeClaimForm = ({
	data,
	contractUSDFCBalance,
	usdcLoading,
	rpcLoading,
	onSubmitClaim,
	signer,
	contractAddress
}) => {
	// Internal state management - no more prop drilling
	const [claimAmount, setClaimAmount] = useState('');
	const [claimDescription, setClaimDescription] = useState('');
	const [files, setFiles] = useState([]);
	const [shouldUpload, setShouldUpload] = useState(true);
	const [passcode, setPasscode] = useState('');
	const [contractHasPasscode, setContractHasPasscode] = useState(false);
	const [amountError, setAmountError] = useState('');

	// AI evaluation state
	const [aiEvaluation, setAiEvaluation] = useState(null);
	const [aiEvaluating, setAiEvaluating] = useState(false);

	// Check if policy is active and has sufficient balance
	const isPolicyActive = data?.policyParams?.isActive;
	const contractBalance = parseFloat(ethers.utils.formatUnits(contractUSDFCBalance || '0', 18));
	const hasBalance = contractBalance > 0;
	const canSubmitClaims = isPolicyActive && hasBalance;

	// Check contract passcode status on mount
	useEffect(() => {
		const checkPasscodeStatus = async () => {
			if (signer && contractAddress) {
				try {
					const hasPasscode = await getContractPasscodeStatus(signer, contractAddress);
					setContractHasPasscode(hasPasscode);
				} catch (error) {
					console.error('Error checking passcode status:', error);
				}
			}
		};
		checkPasscodeStatus();
	}, [signer, contractAddress]);

	// AI evaluation handler
	const handleEvaluateWithAI = async (claimData) => {
		setAiEvaluating(true);
		try {
			const evaluation = await evaluateClaimWithAI(data, claimData);
			setAiEvaluation(evaluation);
			return evaluation;
		} catch (error) {
			console.error('AI evaluation failed:', error);
			setAiEvaluation({
				approved: null,
				confidence: 0,
				reasoning: 'AI evaluation service temporarily unavailable. Manual review required.',
				flags: ['AI_SERVICE_ERROR'],
				recommendation: 'MANUAL_REVIEW'
			});
		} finally {
			setAiEvaluating(false);
		}
	};

	// Handle amount input change with validation
	const handleAmountChange = (e) => {
		const value = e.target.value;
		setClaimAmount(value);

		// Clear previous error
		setAmountError('');

		// Validate if value is not empty
		if (value.trim()) {
			const numericAmount = parseFloat(value);
			const maxAmount = parseFloat(data?.policyParams?.maxAmount || '0');

			console.log('Validating amount:', numericAmount, 'against max:', maxAmount);

			if (isNaN(numericAmount)) {
				setAmountError('Please enter a valid number');
			} else if (numericAmount <= 0) {
				setAmountError('Amount must be greater than 0');
			} else if (maxAmount > 0 && numericAmount > maxAmount) {
				setAmountError(`Amount cannot exceed $${maxAmount}`);
			}
		}
	};

	// Handle form submission
	const handleSubmit = () => {
		// Validate amount is a valid number
		const numericAmount = parseFloat(claimAmount);
		const maxAmount = parseFloat(data?.policyParams?.maxAmount || '0');

		if (isNaN(numericAmount) || numericAmount <= 0) {
			setAmountError('Please enter a valid amount greater than 0');
			return;
		}

		if (maxAmount > 0 && numericAmount > maxAmount) {
			setAmountError(`Amount cannot exceed $${maxAmount}`);
			return;
		}

		if (onSubmitClaim) {
			onSubmitClaim({
				amount: numericAmount.toString(), // Ensure it's a string representation of a valid number
				description: claimDescription,
				files,
				shouldUpload,
				passcode: contractHasPasscode ? passcode : ''
			});

			// Clear form after submission
			setClaimAmount('');
			setClaimDescription('');
			setFiles([]);
			setPasscode('');
			setAiEvaluation(null);
			setAmountError('');
		}
	};

	return (
		<div>
			<h4>Request reimbursement</h4>

			{!data?.policyParams?.isActive && (
				<div
					style={{
						background: '#fff2f0',
						border: '1px solid #ffccc7',
						borderRadius: '4px',
						padding: '12px',
						marginBottom: '16px'
					}}
				>
					<p style={{ color: '#ff4d4f', fontWeight: 'bold', margin: 0 }}>⚠️ Policy Inactive</p>
					<p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
						This reimbursement policy is currently inactive. New claims cannot be submitted at this
						time.
					</p>
				</div>
			)}

			{/* USDFC Balance Info for Employees */}
			<div
				style={{
					background: '#f6ffed',
					border: '1px solid #b7eb8f',
					borderRadius: '4px',
					padding: '12px',
					marginBottom: '16px'
				}}
			>
				<h5 style={{ margin: '0 0 8px 0', color: '#389e0d' }}>💰 USDFC Contract Balance</h5>
				{usdcLoading ? (
					<Spin size="small" />
				) : (
					<p style={{ margin: 0, fontSize: '14px' }}>
						Available for reimbursements:{' '}
						<strong>{ethers.utils.formatEther(contractUSDFCBalance)} USDFC</strong>
						<br />
						<small style={{ color: '#666' }}>
							Approved claims will be automatically reimbursed in USDFC if the contract has
							sufficient balance.
						</small>
					</p>
				)}
			</div>

			<p>Upload your receipt and provide claim details below:</p>
			<br />

			<h5>Amount (USD)</h5>
			<Input
				type="number"
				placeholder="Enter amount"
				value={claimAmount}
				onChange={handleAmountChange}
				max={data?.policyParams?.maxAmount}
				disabled={!data?.policyParams?.isActive}
			/>
			{amountError && (
				<p style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>{amountError}</p>
			)}
			<p style={{ fontSize: '12px', color: '#666' }}>
				Maximum allowed: ${parseFloat(data?.policyParams?.maxAmount || '0') || 'Not set'}
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
				Also upload receipt?&nbsp;
				<Checkbox
					type="checkbox"
					checked={shouldUpload}
					onChange={(e) => setShouldUpload(e.target.checked)}
					disabled={!data?.policyParams?.isActive}
				/>
				&nbsp;
				<Tooltip
					className="pointer"
					title="If checked, receipt will be stored via FilCDN for verification"
				>
					<InfoCircleOutlined />
				</Tooltip>
			</p>
			{shouldUpload && (
				<FileDrop files={files} setFiles={setFiles} disabled={!data?.policyParams?.isActive} />
			)}
			<br />

			{/* AI Evaluation Section */}
			<div style={{ marginBottom: '16px' }}>
				<h5>AI Policy Evaluation</h5>
				<p style={{ fontSize: '14px', color: '#666' }}>
					Get an AI assessment of your claim against the policy rules before submitting.
				</p>

				<Button
					type="default"
					onClick={() => {
						handleEvaluateWithAI({
							amount: claimAmount,
							description: claimDescription,
							hasReceipt: !isEmpty(files)
						});
					}}
					loading={aiEvaluating}
					disabled={
						aiEvaluating || !claimAmount || !claimDescription || !data?.policyParams?.isActive
					}
					style={{ marginBottom: '16px' }}
				>
					{aiEvaluating ? 'Evaluating...' : 'Evaluate Claim with AI'}
				</Button>

				{/* AI Evaluation Results */}
				{aiEvaluation && (
					<Card
						size="small"
						style={{
							background:
								aiEvaluation.recommendation === 'APPROVE'
									? '#f6ffed'
									: aiEvaluation.recommendation === 'REJECT'
									? '#fff2f0'
									: '#fffbe6',
							border: `1px solid ${
								aiEvaluation.recommendation === 'APPROVE'
									? '#b7eb8f'
									: aiEvaluation.recommendation === 'REJECT'
									? '#ffccc7'
									: '#ffe58f'
							}`
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
							<span style={{ fontSize: '16px' }}>
								{aiEvaluation.recommendation === 'APPROVE'
									? '✅'
									: aiEvaluation.recommendation === 'REJECT'
									? '❌'
									: '⚠️'}
							</span>
							<strong>AI Recommendation: {aiEvaluation.recommendation.replace('_', ' ')}</strong>
							<span
								style={{
									fontSize: '12px',
									color: '#666',
									background: 'rgba(0,0,0,0.1)',
									padding: '2px 6px',
									borderRadius: '4px'
								}}
							>
								{Math.round(aiEvaluation.confidence * 100)}% confidence
							</span>
						</div>

						<p style={{ margin: '8px 0', fontSize: '14px' }}>
							<strong>Analysis:</strong> {aiEvaluation.reasoning}
						</p>

						{aiEvaluation.flags && aiEvaluation.flags.length > 0 && (
							<div style={{ marginTop: '8px' }}>
								<strong style={{ fontSize: '12px', color: '#666' }}>Flags:</strong>
								<div style={{ marginTop: '4px' }}>
									{aiEvaluation.flags.map((flag, index) => (
										<span
											key={index}
											style={{
												display: 'inline-block',
												background: '#ff4d4f',
												color: 'white',
												fontSize: '10px',
												padding: '2px 6px',
												borderRadius: '3px',
												marginRight: '4px',
												marginBottom: '2px'
											}}
										>
											{flag.replace('_', ' ')}
										</span>
									))}
								</div>
							</div>
						)}

						<div style={{ marginTop: '12px', fontSize: '12px', color: '#8c8c8c' }}>
							💡 This is an AI assessment for guidance only. Final approval is at the discretion of
							the policy owner.
						</div>
					</Card>
				)}
			</div>

			{/* Passcode Section - only shows when contract requires it */}
			{contractHasPasscode && (
				<div style={{ marginBottom: '16px' }}>
					<h5>Contract Passcode</h5>
					<p style={{ fontSize: '14px', color: '#666' }}>
						Enter the passcode to authorize this claim submission.
					</p>

					<Input.Password
						placeholder="Enter contract passcode"
						value={passcode}
						onChange={(e) => setPasscode(e.target.value)}
						disabled={!data?.policyParams?.isActive}
						style={{ marginBottom: '8px' }}
					/>
				</div>
			)}

			{/* Submit Button */}
			<Button
				type="primary"
				onClick={handleSubmit}
				loading={rpcLoading}
				disabled={
					rpcLoading ||
					!claimAmount ||
					!claimDescription ||
					isEmpty(files) ||
					!data?.policyParams?.isActive ||
					(contractHasPasscode && !passcode) ||
					!!amountError // Disable if there's an amount error
				}
			>
				{data?.policyParams?.isActive ? 'Submit Claim' : 'Policy Inactive'}
			</Button>
		</div>
	);
};

export default EmployeeClaimForm;
