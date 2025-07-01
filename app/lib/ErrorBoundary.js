'use client';

import React from 'react';
import { Button, Alert } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const isNetworkError = this.state.error?.message?.includes('network') ||
                                 this.state.error?.message?.includes('Network') ||
                                 this.state.error?.message?.includes('chain');

            return (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <Alert
                        message={isNetworkError ? "Network Error" : "Something went wrong"}
                        description={
                            isNetworkError
                                ? "The network configuration has changed. Please refresh the page to continue."
                                : "An unexpected error occurred. Please refresh the page and try again."
                        }
                        type="error"
                        showIcon
                        style={{ marginBottom: '20px' }}
                    />
                    <Button
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={() => window.location.reload()}
                    >
                        Refresh Page
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
