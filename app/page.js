'use client'

import React, { useState, } from 'react'
import Image from 'next/image';
import { Button, Spin, Row, Col, Space } from 'antd';
import { APP_DESC, APP_NAME, siteConfig } from './constants';
import { CheckCircleTwoTone } from '@ant-design/icons';
import Logo from './lib/Logo';
import { useRouter } from 'next/navigation';

// TODO: change
const CHECKLIST_ITEMS = [
  "Generate shareable one-click reimbursement URLs for employees",
  "Validate reimbursements against custom policy rules, on-chain",
  "Filecoin-backed proof, automated decisioning, instant events",
  "No accounts or vendor agreements required"
];


const HERO_IMAGE = 'https://cdn.dribbble.com/userupload/42353513/file/original-94c2a36d73ffb6352c3a84f73c9e3a4f.gif'


const Home = () => {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)' }}>
      {/* Hero Section */}
      <div style={{ padding: '80px 24px' }}>
        <Row gutter={[48, 48]} align="middle" style={{ minHeight: '70vh', maxWidth: '1200px', margin: '0 auto' }}>
          <Col xs={24} lg={12}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Logo/Brand */}
              <div style={{ marginBottom: '32px' }}>
                <Logo />
              </div>

              {/* Hero Title */}
              <div>
                <h1 style={{ 
                  fontSize: '48px', 
                  fontWeight: 'bold', 
                  color: '#1f2937', 
                  lineHeight: '1.2', 
                  marginBottom: '24px',
                  margin: 0
                }}>
                  Smart Contract
                  <span style={{ color: '#1890ff' }}> Reimbursements</span>
                </h1>
                <p style={{ 
                  fontSize: '20px', 
                  color: '#6b7280', 
                  lineHeight: '1.6',
                  marginBottom: '32px'
                }}>
                  {APP_DESC}
                </p>
              </div>

              {/* Feature List */}
              <Space direction="vertical" size="middle">
                {CHECKLIST_ITEMS.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <CheckCircleTwoTone 
                      twoToneColor="#1890ff" 
                      style={{ fontSize: '20px', marginTop: '4px', marginRight: '12px' }}
                    />
                    <span style={{ 
                      color: '#4b5563', 
                      fontSize: '18px', 
                      lineHeight: '1.6'
                    }}>
                      {item}
                    </span>
                  </div>
                ))}
              </Space>
              <br/>

              {/* CTA Buttons */}
              <Space size="middle" style={{ marginTop: '64px' }}>
                <Button 
                  size="large" 
                  type="primary" 
                  onClick={() => router.push('/create')}
                  style={{ 
                    height: '48px', 
                    padding: '0 32px', 
                    fontSize: '18px', 
                    fontWeight: '600',
                    borderRadius: '8px'
                  }}
                >
                  {siteConfig.cta.primary}
                </Button>
                <Button 
                  size="large" 
                  onClick={() => router.push('/about')}
                  style={{ 
                    height: '48px', 
                    padding: '0 32px', 
                    fontSize: '18px', 
                    fontWeight: '600',
                    borderRadius: '8px'
                  }}
                >
                  Learn More
                </Button>
              </Space>
            </Space>
          </Col>

          <Col xs={24} lg={12}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Image 
                  width={400} 
                  height={500} 
                  style={{ 
                    borderRadius: '24px', 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                  }} 
                  src={HERO_IMAGE} 
                  alt={APP_NAME}
                />
              </div>
            </div>
          </Col>
        </Row>

        {/* Features Section */}
        <div style={{ padding: '80px 0', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              color: '#1f2937', 
              marginBottom: '16px'
            }}>
              Why Choose {APP_NAME}?
            </h2>
            <p style={{ 
              fontSize: '20px', 
              color: '#6b7280', 
              maxWidth: '768px', 
              margin: '0 auto'
            }}>
              Streamline your reimbursement process with blockchain technology and smart contracts
            </p>
          </div>

          <Row gutter={[32, 32]}>
            <Col xs={24} md={8}>
              <div style={{ 
                textAlign: 'center', 
                padding: '32px', 
                background: 'white', 
                borderRadius: '16px', 
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                height: '100%'
              }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: '#e6f7ff', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 24px'
                }}>
                  <CheckCircleTwoTone twoToneColor="#1890ff" style={{ fontSize: '24px' }} />
                </div>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  marginBottom: '16px'
                }}>
                  Automated Validation
                </h3>
                <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                  Smart contracts automatically validate reimbursements against your custom policy rules
                </p>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div style={{ 
                textAlign: 'center', 
                padding: '32px', 
                background: 'white', 
                borderRadius: '16px', 
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                height: '100%'
              }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: '#f6ffed', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 24px'
                }}>
                  <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: '24px' }} />
                </div>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  marginBottom: '16px'
                }}>
                  Instant Processing
                </h3>
                <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                  Filecoin-backed proof enables automated decisioning with instant events and notifications
                </p>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div style={{ 
                textAlign: 'center', 
                padding: '32px', 
                background: 'white', 
                borderRadius: '16px', 
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                height: '100%'
              }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: '#f9f0ff', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 24px'
                }}>
                  <CheckCircleTwoTone twoToneColor="#722ed1" style={{ fontSize: '24px' }} />
                </div>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  marginBottom: '16px'
                }}>
                  No Setup Required
                </h3>
                <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                  Get started immediately without accounts or vendor agreements - just connect your wallet
                </p>
              </div>
            </Col>
          </Row>
        </div>

        {/* CTA Section */}
        <div style={{ textAlign: 'center', padding: '80px 0', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)', 
            borderRadius: '24px', 
            padding: '48px', 
            color: 'white'
          }}>
            <h2 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              marginBottom: '16px',
              color: 'white'
            }}>
              Ready to Transform Your Reimbursements?
            </h2>
            <p style={{ 
              fontSize: '20px', 
              marginBottom: '32px', 
              opacity: 0.9,
              color: 'white'
            }}>
              Create your first smart contract policy in minutes
            </p>
            <Button 
              size="large" 
              style={{ 
                height: '48px', 
                padding: '0 32px', 
                fontSize: '18px', 
                fontWeight: '600',
                background: 'white', 
                color: '#1890ff', 
                border: 'none', 
                borderRadius: '8px'
              }}
              onClick={() => router.push('/create')}
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
