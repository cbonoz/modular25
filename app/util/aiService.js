/**
 * AI Service for evaluating reimbursement claims against policy rules
 * This service can be easily swapped out with different AI providers
 */

export class AIClaimEvaluator {
    constructor() {
        this.categoryKeywords = {
            'internet': ['internet', 'wifi', 'broadband', 'connection', 'isp', 'monthly', 'comcast', 'verizon', 'att'],
            'equipment': ['laptop', 'computer', 'monitor', 'keyboard', 'mouse', 'hardware', 'desk', 'chair', 'webcam'],
            'software': ['software', 'license', 'subscription', 'app', 'tool', 'saas', 'adobe', 'microsoft', 'slack'],
            'travel': ['flight', 'hotel', 'uber', 'taxi', 'gas', 'mileage', 'parking', 'airline', 'rental'],
            'meals': ['meal', 'lunch', 'dinner', 'restaurant', 'food', 'coffee', 'breakfast', 'catering'],
            'training': ['course', 'training', 'certification', 'workshop', 'conference', 'seminar', 'education'],
            'healthcare': ['medical', 'health', 'doctor', 'prescription', 'dental', 'vision', 'therapy'],
            'office': ['office', 'supplies', 'paper', 'pen', 'desk', 'chair', 'stationary', 'folders']
        };

        this.reasonableAmounts = {
            'internet': { min: 20, max: 200 },
            'equipment': { min: 50, max: 2000 },
            'software': { min: 10, max: 500 },
            'travel': { min: 10, max: 1000 },
            'meals': { min: 5, max: 100 },
            'training': { min: 50, max: 2000 },
            'healthcare': { min: 10, max: 500 },
            'office': { min: 5, max: 300 }
        };
    }

    /**
     * Evaluate a claim against policy rules
     * @param {Object} evaluationRequest - The evaluation request
     * @param {Object} evaluationRequest.policy - Policy details
     * @param {Object} evaluationRequest.claim - Claim details
     * @returns {Promise<Object>} Evaluation result
     */
    async evaluateClaim(evaluationRequest) {
        try {
            // For now, use simulated AI evaluation
            // This can be easily replaced with actual AI API calls
            return await this._simulateAIEvaluation(evaluationRequest);
        } catch (error) {
            console.error('AI evaluation failed:', error);
            return this._createErrorEvaluation(error);
        }
    }

    /**
     * Prepare evaluation prompt/request from policy and claim data
     * @param {Object} policyData - Policy metadata
     * @param {Object} claimData - Claim details
     * @returns {Object} Structured evaluation request
     */
    prepareEvaluationRequest(policyData, claimData) {
        return {
            policy: {
                name: policyData.name,
                description: policyData.description,
                businessType: policyData.policyParams.businessType,
                location: policyData.policyParams.location,
                category: policyData.policyParams.category,
                maxAmount: policyData.policyParams.maxAmount,
                isActive: policyData.policyParams.isActive
            },
            claim: {
                amount: claimData.amount,
                description: claimData.description,
                category: policyData.policyParams.category,
                receiptUploaded: claimData.hasReceipt
            },
            evaluation_criteria: [
                "Does the claim amount exceed the policy maximum?",
                "Is the claim description appropriate for the policy category?",
                "Does the claim align with the business type and location?",
                "Is the claim reasonable and legitimate?",
                "Are there any red flags or suspicious elements?"
            ],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Simulate AI evaluation with business logic
     * Replace this method with actual AI service integration
     */
    async _simulateAIEvaluation(evaluationRequest) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { policy, claim } = evaluationRequest;
        const flags = [];
        let approved = true;
        let confidence = 0.9;
        let reasoning = [];

        // Check amount against policy maximum
        const amountCheck = this._validateAmount(claim.amount, policy.maxAmount);
        if (!amountCheck.valid) {
            approved = false;
            confidence = 0.1;
            flags.push(...amountCheck.flags);
            reasoning.push(...amountCheck.reasoning);
        } else {
            reasoning.push(...amountCheck.reasoning);
        }

        // Check description relevance to category
        const categoryCheck = this._validateCategory(claim.description, policy.category);
        if (!categoryCheck.valid) {
            confidence -= 0.3;
            flags.push(...categoryCheck.flags);
        }
        reasoning.push(...categoryCheck.reasoning);

        // Check amount reasonableness for category
        const amountReasonCheck = this._validateAmountReasonableness(claim.amount, policy.category);
        if (!amountReasonCheck.valid) {
            confidence -= 0.2;
            flags.push(...amountReasonCheck.flags);
        }
        reasoning.push(...amountReasonCheck.reasoning);

        // Check receipt requirement
        const receiptCheck = this._validateReceipt(claim.receiptUploaded);
        if (!receiptCheck.valid) {
            confidence -= 0.1;
            flags.push(...receiptCheck.flags);
        }
        reasoning.push(...receiptCheck.reasoning);

        return this._formatEvaluationResult({
            approved: approved && confidence > 0.6,
            confidence: Math.max(0.1, Math.min(0.99, confidence)),
            reasoning: reasoning.join('. '),
            flags,
            evaluationRequest
        });
    }

    /**
     * Validate claim amount against policy maximum
     */
    _validateAmount(claimAmount, policyMaxAmount) {
        const amount = parseFloat(claimAmount);
        if (amount > policyMaxAmount) {
            return {
                valid: false,
                flags: ['AMOUNT_EXCEEDS_MAX'],
                reasoning: [`Claim amount $${amount} exceeds policy maximum of $${policyMaxAmount}`]
            };
        }
        return {
            valid: true,
            flags: [],
            reasoning: [`Claim amount $${amount} is within policy limit of $${policyMaxAmount}`]
        };
    }

    /**
     * Validate claim description against category keywords
     */
    _validateCategory(description, category) {
        const expectedKeywords = this.categoryKeywords[category] || [];
        const hasRelevantKeywords = expectedKeywords.some(keyword => 
            description.toLowerCase().includes(keyword)
        );

        if (!hasRelevantKeywords && description.length > 10) {
            return {
                valid: false,
                flags: ['DESCRIPTION_MISMATCH'],
                reasoning: [`Claim description may not match ${category} category`]
            };
        }
        return {
            valid: true,
            flags: [],
            reasoning: [`Claim description appears relevant to ${category} category`]
        };
    }

    /**
     * Validate amount reasonableness for category
     */
    _validateAmountReasonableness(claimAmount, category) {
        const categoryRange = this.reasonableAmounts[category];
        if (!categoryRange) {
            return {
                valid: true,
                flags: [],
                reasoning: [`No amount range defined for ${category} category`]
            };
        }

        const amount = parseFloat(claimAmount);
        if (amount < categoryRange.min || amount > categoryRange.max) {
            return {
                valid: false,
                flags: ['UNUSUAL_AMOUNT'],
                reasoning: [`Amount seems unusual for ${category} expenses (typical range: $${categoryRange.min}-$${categoryRange.max})`]
            };
        }
        return {
            valid: true,
            flags: [],
            reasoning: [`Amount is reasonable for ${category} category`]
        };
    }

    /**
     * Validate receipt upload requirement
     */
    _validateReceipt(receiptUploaded) {
        if (!receiptUploaded) {
            return {
                valid: false,
                flags: ['NO_RECEIPT'],
                reasoning: ['No receipt uploaded - manual verification recommended']
            };
        }
        return {
            valid: true,
            flags: [],
            reasoning: ['Receipt uploaded for verification']
        };
    }

    /**
     * Format the final evaluation result
     */
    _formatEvaluationResult({ approved, confidence, reasoning, flags, evaluationRequest }) {
        const recommendation = approved && confidence > 0.6 ? 'APPROVE' : 
                             confidence > 0.4 ? 'MANUAL_REVIEW' : 'REJECT';

        return {
            approved,
            confidence,
            reasoning,
            flags,
            recommendation,
            metadata: {
                evaluatedAt: new Date().toISOString(),
                policyName: evaluationRequest.policy.name,
                category: evaluationRequest.policy.category,
                version: '1.0.0'
            }
        };
    }

    /**
     * Create error evaluation result
     */
    _createErrorEvaluation(error) {
        return {
            approved: null,
            confidence: 0,
            reasoning: 'AI evaluation service temporarily unavailable. Manual review required.',
            flags: ['AI_SERVICE_ERROR'],
            recommendation: 'MANUAL_REVIEW',
            metadata: {
                evaluatedAt: new Date().toISOString(),
                error: error.message,
                version: '1.0.0'
            }
        };
    }
}

/**
 * Factory function to create AI evaluator instance
 * This allows for easy dependency injection and testing
 */
export function createAIEvaluator() {
    return new AIClaimEvaluator();
}

/**
 * Convenience function for one-off evaluations
 */
export async function evaluateClaimWithAI(policyData, claimData) {
    const evaluator = createAIEvaluator();
    const evaluationRequest = evaluator.prepareEvaluationRequest(policyData, claimData);
    return await evaluator.evaluateClaim(evaluationRequest);
}

export default AIClaimEvaluator;