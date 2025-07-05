'use client';

import React, { useState, useEffect } from 'react';
import { Input, Select, Row, Col, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { US_STATES } from '../../constants';
import TextArea from 'antd/es/input/TextArea';

const { Option } = Select;

const PolicyFormFields = ({ onDataChange, initialData = {} }) => {
    // Internal state management
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        businessType: '',
        location: '',
        employeeCount: '',
        maxAmount: '',
        category: '',
        passcode: '',
        ...initialData
    });

    // Update internal state when initialData changes (for demo button)
    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setFormData(prevData => ({
                ...prevData,
                ...initialData
            }));
        }
    }, [initialData]);

    const updateData = (key, value) => {
        const newData = { ...formData, [key]: value };
        setFormData(newData);
        
        // Notify parent component of changes
        if (onDataChange) {
            onDataChange(newData);
        }
    };

    const businessTypes = [
        { value: 'technology', label: 'Technology' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'finance', label: 'Finance' },
        { value: 'retail', label: 'Retail' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'other', label: 'Other' }
    ];

    const employeeCountOptions = [
        { value: '1-10', label: '1-10 employees' },
        { value: '11-50', label: '11-50 employees' },
        { value: '51-200', label: '51-200 employees' },
        { value: '201-500', label: '201-500 employees' },
        { value: '501-1000', label: '501-1000 employees' },
        { value: '1000+', label: '1000+ employees' }
    ];

    const categories = [
        { value: 'internet', label: 'Internet & Utilities' },
        { value: 'equipment', label: 'Equipment & Hardware' },
        { value: 'software', label: 'Software & Subscriptions' },
        { value: 'travel', label: 'Travel & Transportation' },
        { value: 'meals', label: 'Meals & Entertainment' },
        { value: 'training', label: 'Training & Development' },
        { value: 'healthcare', label: 'Healthcare & Wellness' },
        { value: 'office', label: 'Office Supplies' },
        { value: 'other', label: 'Other' }
    ];

    return (
        <div>
            <h4>Policy Details</h4>
            <Input
                placeholder="Policy name (e.g., Remote Work Reimbursement Policy)"
                value={formData.name}
                onChange={(e) => updateData('name', e.target.value)}
                style={{ marginBottom: '16px' }}
            />

            <TextArea
                rows={3}
                placeholder="Describe the purpose and scope of this reimbursement policy..."
                value={formData.description}
                onChange={(e) => updateData('description', e.target.value)}
                style={{ marginBottom: '16px' }}
            />

            <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={12}>
                    <label>Business Type</label>
                    <Select
                        placeholder="Select business type"
                        value={formData.businessType}
                        onChange={(value) => updateData('businessType', value)}
                        style={{ width: '100%' }}
                    >
                        {businessTypes.map(type => (
                            <Option key={type.value} value={type.value}>
                                {type.label}
                            </Option>
                        ))}
                    </Select>
                </Col>
                <Col span={12}>
                    <label>
                        Business Location
                        <Tooltip title="Select the primary state/location where your business operates">
                            <InfoCircleOutlined style={{ marginLeft: '4px' }} />
                        </Tooltip>
                    </label>
                    <Select
                        placeholder="Select state/location"
                        value={formData.location}
                        onChange={(value) => updateData('location', value)}
                        style={{ width: '100%' }}
                        showSearch
                        filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                    >
                        {US_STATES.map(state => (
                            <Option key={state.value} value={state.value}>
                                {state.label}
                            </Option>
                        ))}
                    </Select>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={12}>
                    <label>Employee Count</label>
                    <Select
                        placeholder="Select employee count"
                        value={formData.employeeCount}
                        onChange={(value) => updateData('employeeCount', value)}
                        style={{ width: '100%' }}
                    >
                        {employeeCountOptions.map(option => (
                            <Option key={option.value} value={option.value}>
                                {option.label}
                            </Option>
                        ))}
                    </Select>
                </Col>
                <Col span={12}>
                    <label>Reimbursement Category</label>
                    <Select
                        placeholder="Select category"
                        value={formData.category}
                        onChange={(value) => updateData('category', value)}
                        style={{ width: '100%' }}
                    >
                        {categories.map(category => (
                            <Option key={category.value} value={category.value}>
                                {category.label}
                            </Option>
                        ))}
                    </Select>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={12}>
                    <label>
                        Maximum Reimbursement Amount (USD)
                        <Tooltip title="Maximum amount per claim that can be reimbursed">
                            <InfoCircleOutlined style={{ marginLeft: '4px' }} />
                        </Tooltip>
                    </label>
                    <Input
                        type="number"
                        placeholder="e.g., 100"
                        value={formData.maxAmount}
                        onChange={(e) => updateData('maxAmount', e.target.value)}
                        prefix="$"
                        min="1"
                        step="1"
                    />
                </Col>
                <Col span={12}>
                    <label>
                        Access Passcode (Optional)
                        <Tooltip title="Set a passcode to restrict who can submit claims to this policy">
                            <InfoCircleOutlined style={{ marginLeft: '4px' }} />
                        </Tooltip>
                    </label>
                    <Input.Password
                        placeholder="Leave empty for no passcode"
                        value={formData.passcode || ''}
                        onChange={(e) => updateData('passcode', e.target.value)}
                        autoComplete="new-password"
                    />
                </Col>
            </Row>
        </div>
    );
};

export default PolicyFormFields;
