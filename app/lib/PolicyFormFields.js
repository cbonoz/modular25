'use client';

import React from 'react';
import { Input, Select, Card, Row, Col } from 'antd';
import TextArea from 'antd/es/input/TextArea';

const PolicyFormFields = ({
    data,
    updateData,
    initialFunding,
    setInitialFunding,
    userUSDFCBalance = '0'
}) => {
    const businessTypes = [
        { value: 'technology', label: 'Technology' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'finance', label: 'Finance' },
        { value: 'retail', label: 'Retail' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'other', label: 'Other' }
    ];

    const businessLocations = [
        { value: 'california', label: 'California, USA' },
        { value: 'new-york', label: 'New York, USA' },
        { value: 'texas', label: 'Texas, USA' },
        { value: 'florida', label: 'Florida, USA' },
        { value: 'washington', label: 'Washington, USA' },
        { value: 'other-us', label: 'Other US State' },
        { value: 'international', label: 'International' }
    ];

    const employeeCounts = [
        { value: '1-10', label: '1-10 employees' },
        { value: '11-50', label: '11-50 employees' },
        { value: '51-200', label: '51-200 employees' },
        { value: '201-1000', label: '201-1000 employees' },
        { value: '1000+', label: '1000+ employees' }
    ];

    const reimbursementCategories = [
        { value: 'internet', label: 'Internet/Utilities' },
        { value: 'phone', label: 'Phone/Mobile' },
        { value: 'office-supplies', label: 'Office Supplies' },
        { value: 'travel', label: 'Travel Expenses' },
        { value: 'training', label: 'Training/Education' },
        { value: 'health', label: 'Health/Wellness' },
        { value: 'other', label: 'Other' }
    ];

    return (
        <Card>
            <Row gutter={16}>
                <Col span={12}>
                    <h4>Policy Name</h4>
                    <Input
                        placeholder="e.g., Remote Work Internet Reimbursement Policy"
                        value={data.name}
                        onChange={(e) => updateData('name', e.target.value)}
                    />
                </Col>
                <Col span={12}>
                    <h4>Maximum Reimbursement Amount (USD)</h4>
                    <Input
                        type="number"
                        placeholder="e.g., 100"
                        value={data.maxAmount}
                        onChange={(e) => updateData('maxAmount', e.target.value)}
                        min="1"
                        step="1"
                    />
                </Col>
            </Row>
            <br />

            <h4>Policy Description</h4>
            <TextArea
                rows={3}
                placeholder="Describe the purpose and scope of this reimbursement policy..."
                value={data.description}
                onChange={(e) => updateData('description', e.target.value)}
            />
            <br />
            <br />

            <Row gutter={16}>
                <Col span={12}>
                    <h4>Business Type</h4>
                    <Select
                        style={{ width: '100%' }}
                        placeholder="Select business type"
                        value={data.businessType}
                        onChange={(value) => updateData('businessType', value)}
                        options={businessTypes}
                    />
                </Col>
                <Col span={12}>
                    <h4>Reimbursement Category</h4>
                    <Select
                        style={{ width: '100%' }}
                        placeholder="Select category"
                        value={data.category}
                        onChange={(value) => updateData('category', value)}
                        options={reimbursementCategories}
                    />
                </Col>
            </Row>
            <br />

            <Row gutter={16}>
                <Col span={12}>
                    <h4>Business Location</h4>
                    <Select
                        style={{ width: '100%' }}
                        placeholder="Select business location"
                        value={data.location}
                        onChange={(value) => updateData('location', value)}
                        options={businessLocations}
                    />
                </Col>
                <Col span={12}>
                    <h4>Number of Employees</h4>
                    <Select
                        style={{ width: '100%' }}
                        placeholder="Select company size"
                        value={data.employeeCount}
                        onChange={(value) => updateData('employeeCount', value)}
                        options={employeeCounts}
                    />
                </Col>
            </Row>
            <br />

            <h4>Initial Contract Funding (USDFC)</h4>
            <Input
                type="number"
                placeholder="Enter initial USDFC funding amount (optional)"
                value={initialFunding}
                onChange={(e) => setInitialFunding(e.target.value)}
                min="0"
                step="0.01"
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                Your USDFC balance: {parseFloat(userUSDFCBalance).toFixed(4)} USDFC
                <br />
                You can fund the contract now or later from the policy management page.
            </p>
        </Card>
    );
};

export default PolicyFormFields;
