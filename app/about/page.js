'use client';

import { APP_DESC, APP_NAME, EXAMPLE_DATASETS, siteConfig } from '../constants';
import Logo from '../lib/Logo';
import Button from 'antd/es/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, Divider } from 'antd';

export default function About() {
    const router = useRouter();
    return (
        <div className="about-page">
            <br />
            <br />

            <p>
                <Logo />
                <br />
                <br />
                {APP_NAME} | {APP_DESC}
            </p>

            {/* github */}
            <p>
                {APP_NAME} is an open source project and a hackathon prototype
                (hosted as-is). You can find the code on GitHub&nbsp;
                <a href="https://github.com/cbonoz/modular25" target="_blank">
                    here
                </a>
                .
            </p>
            <p>
                {/* Create upload */}
                <Button
                    type="primary"
                    onClick={() => {
                        router.push('/create');
                    }}
                >
            {siteConfig.cta.primary}
                </Button>
                &nbsp;
            </p>
        </div>
    );
}
