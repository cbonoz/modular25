'use client';

import { APP_DESC, APP_NAME, EXAMPLE_DATASETS, siteConfig } from '../constants';
import Logo from '../lib/Logo';
import { Button, Card, Row, Col, Divider, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { CheckCircleTwoTone, RocketOutlined, CodeOutlined, SafetyOutlined, DollarOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export default function About() {
    const router = useRouter();

    const features = [
        {
            icon: <SafetyOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
            title: 'Smart Contract Automation',
            description: 'Reimbursement policies are enforced through immutable smart contracts on the Filecoin network, ensuring transparent and automated processing.'
        },
        {
            icon: <DollarOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
            title: 'USDFC Token Integration',
            description: 'Uses USDFC (USD Filecoin) tokens for seamless, programmable payments with 18-decimal precision for accurate financial transactions.'
        },
        {
            icon: <CheckCircleTwoTone twoToneColor="#722ed1" style={{ fontSize: '24px' }} />,
            title: 'Receipt Validation',
            description: 'IPFS-backed receipt storage with cryptographic hash validation ensures tamper-proof documentation and duplicate prevention.'
        },
        {
            icon: <RocketOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
            title: 'Instant Processing',
            description: 'No manual approvals needed - approved claims are automatically processed and funds transferred to employees immediately.'
        }
    ];

    const useCases = [
        'Remote work internet and equipment reimbursements',
        'Travel and expense management for distributed teams',
        'Healthcare and wellness benefit programs',
        'Professional development and training expenses',
        'Office supplies and home office setup costs'
    ];

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
            {/* Header Section */}
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <Logo style={{ marginBottom: '24px' }} />
                <Title level={1} style={{ marginBottom: '16px', fontSize: '48px' }}>
                    About {APP_NAME}
                </Title>
                <Paragraph style={{ fontSize: '20px', color: '#666', maxWidth: '600px', margin: '0 auto 32px' }}>
                    {APP_DESC}
                </Paragraph>
                
                {/* Hackathon Notice */}
                <Card 
                    style={{ 
                        background: '#fafafa',
                        border: '1px solid #d9d9d9',
                        marginBottom: '32px'
                    }}
                >
                    <Space>
                        <CodeOutlined style={{ fontSize: '16px', color: '#8c8c8c' }} />
                        <Text style={{ color: '#595959', fontSize: '14px' }}>
                            Hackathon Prototype
                        </Text>
                    </Space>
                    <Paragraph style={{ marginTop: '8px', marginBottom: 0, color: '#8c8c8c', fontSize: '14px' }}>
                        This application is a hackathon prototype built for demonstration purposes. 
                        It is provided "as-is" without warranties. Please do not use with real funds in production environments.
                    </Paragraph>
                </Card>

                <Button 
                    type="primary" 
                    size="large"
                    onClick={() => router.push('/create')}
                    style={{ 
                        height: '48px', 
                        padding: '0 32px', 
                        fontSize: '18px',
                        fontWeight: '600'
                    }}
                >
                    {siteConfig.cta.primary}
                </Button>
            </div>

            {/* Features Section */}
            <div style={{ marginBottom: '60px' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: '40px' }}>
                    Key Features
                </Title>
                <Row gutter={[32, 32]}>
                    {features.map((feature, index) => (
                        <Col key={index} xs={24} md={12}>
                            <Card style={{ height: '100%', border: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                    <div style={{ 
                                        width: '48px', 
                                        height: '48px', 
                                        background: '#f8f9fa', 
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <Title level={4} style={{ marginBottom: '8px' }}>
                                            {feature.title}
                                        </Title>
                                        <Paragraph style={{ marginBottom: 0, color: '#666' }}>
                                            {feature.description}
                                        </Paragraph>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>

            {/* How It Works Section */}
            <div style={{ marginBottom: '60px' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: '40px' }}>
                    How It Works
                </Title>
                <Row gutter={[32, 32]}>
                    <Col xs={24} md={8}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                                width: '64px', 
                                height: '64px', 
                                background: 'linear-gradient(135deg, #1890ff, #40a9ff)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                color: 'white',
                                fontSize: '24px',
                                fontWeight: 'bold'
                            }}>
                                1
                            </div>
                            <Title level={4}>Deploy Policy</Title>
                            <Paragraph style={{ color: '#666' }}>
                                Create a smart contract with your business rules, maximum amounts, and reimbursement categories.
                            </Paragraph>
                        </div>
                    </Col>
                    <Col xs={24} md={8}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                                width: '64px', 
                                height: '64px', 
                                background: 'linear-gradient(135deg, #52c41a, #73d13d)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                color: 'white',
                                fontSize: '24px',
                                fontWeight: 'bold'
                            }}>
                                2
                            </div>
                            <Title level={4}>Fund & Share</Title>
                            <Paragraph style={{ color: '#666' }}>
                                Add USDFC tokens to your policy contract and share the employee portal link with your team.
                            </Paragraph>
                        </div>
                    </Col>
                    <Col xs={24} md={8}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                                width: '64px', 
                                height: '64px', 
                                background: 'linear-gradient(135deg, #722ed1, #9254de)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                color: 'white',
                                fontSize: '24px',
                                fontWeight: 'bold'
                            }}>
                                3
                            </div>
                            <Title level={4}>Auto-Process</Title>
                            <Paragraph style={{ color: '#666' }}>
                                Employees submit claims with receipts. Approved claims are automatically funded from the contract.
                            </Paragraph>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* Use Cases Section */}
            <div style={{ marginBottom: '60px' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: '40px' }}>
                    Perfect For
                </Title>
                <Card>
                    <Row gutter={[16, 16]}>
                        {useCases.map((useCase, index) => (
                            <Col key={index} xs={24} sm={12}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: '16px' }} />
                                    <Text>{useCase}</Text>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </div>

            {/* Technical Details Section */}
            <div style={{ marginBottom: '60px' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: '40px' }}>
                    Technical Implementation
                </Title>
                <Row gutter={[32, 32]}>
                    <Col xs={24} md={12}>
                        <Card title="Blockchain Technology" style={{ height: '100%' }}>
                            <ul style={{ paddingLeft: '20px', color: '#666' }}>
                                <li>Built on Filecoin network for decentralized storage and computation</li>
                                <li>Smart contracts written in Solidity for immutable business logic</li>
                                <li>IPFS integration for tamper-proof receipt storage</li>
                                <li>Cryptographic hash validation for document integrity</li>
                            </ul>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card title="Frontend & Integration" style={{ height: '100%' }}>
                            <ul style={{ paddingLeft: '20px', color: '#666' }}>
                                <li>Next.js React application with modern UI components</li>
                                <li>Wagmi hooks for seamless Web3 wallet integration</li>
                                <li>Ethers.js for blockchain interactions and transaction handling</li>
                                <li>Ant Design for professional, responsive user interface</li>
                            </ul>
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* Open Source Section */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <Card style={{ background: '#f8f9fa' }}>
                    <Title level={3}>Open Source & Community</Title>
                    <Paragraph style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                        {APP_NAME} is an open source project built for the hackathon community. 
                        The complete source code, smart contracts, and documentation are available on GitHub.
                    </Paragraph>
                    <Space size="middle">
                        <Button 
                            type="default" 
                            size="large"
                            href="https://github.com/cbonoz/modular25" 
                            target="_blank"
                            icon={<CodeOutlined />}
                        >
                            View Source Code
                        </Button>
                        <Button 
                            type="primary" 
                            size="large"
                            onClick={() => router.push('/create')}
                        >
                            Try the Demo
                        </Button>
                    </Space>
                </Card>
            </div>
        </div>
    );
}
