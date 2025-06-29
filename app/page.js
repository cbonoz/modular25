'use client'

import React, { useState, } from 'react'
import { Button, Spin, Row, Col } from 'antd';
import { APP_DESC, APP_NAME, siteConfig } from './constants';
import { CheckCircleTwoTone } from '@ant-design/icons';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// TODO: change
const CHECKLIST_ITEMS = [
  "Validate reimbursements against custom policy rules, on-chain",
  "Filecoin-backed proof, automated decisioning, instant events",
  "No accounts or vendor agreements required"
];


const HERO_IMAGE = 'https://cdn.dribbble.com/userupload/42353513/file/original-94c2a36d73ffb6352c3a84f73c9e3a4f.gif'


const Home = () => {
  const router = useRouter()

  return <div className='home-section'>
    <Row className='home-section'>
      <Col span={12}>
        <div className='prompt-section'>
          {/* <img src={logo} className='home-logo'/><br/> */}
          {APP_DESC}
        </div>
        {CHECKLIST_ITEMS.map((item, i) => {
          return (
            <p key={i}>
              <CheckCircleTwoTone twoToneColor="#00aa00" />
              &nbsp;
              {item}.
            </p>
          );
        })}
        <div>
        </div>
        <div>
          <Button className='standard-btn' size="large" type="primary" onClick={() => router.push('/create')}>
            {siteConfig.cta.primary}
          </Button>&nbsp;
        </div>
      </Col>
      <Col span={12}>
        <Image width={300} height={475} className='hero-image' src={HERO_IMAGE} alt={APP_NAME}/>
      </Col>
    </Row>

  </div>

}

export default Home
