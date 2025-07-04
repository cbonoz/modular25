'use client';

import React from 'react';
import Image from 'next/image';
import { APP_NAME } from '../constants';

const Logo = ({ 
    width = 180, 
    height = 30, 
    className = '',
    style = {},
    ...props 
}) => {
    return (
        <Image
            src="/logo.png"
            alt={APP_NAME}
            width={width}
            height={height}
            className={className}
            style={style}
            {...props}
        />
    );
};

export default Logo;