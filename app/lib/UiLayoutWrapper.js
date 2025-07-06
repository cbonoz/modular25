'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { abbreviate, isAdminAddress } from '../util';
import { ACTIVE_CHAIN, APP_NAME } from '../constants';
import StyledComponentsRegistry from './AntdRegistry';
import { Button, ConfigProvider, Layout, Menu } from 'antd';
import { Content, Footer, Header } from 'antd/es/layout/layout';
import Image from 'next/image';
import ConnectButton from './ConnectButton';
import { Theme } from '@ant-design/cssinjs';

const isUploadUrl = (pathname) => {
	return pathname?.startsWith('/upload');
};

function UiLayoutWrapper({ children }) {
	const pathname = usePathname();
	let menuItems = [];
	if (!isUploadUrl(pathname)) {
		menuItems = [
			{
				key: '/create',
				label: <Link href="/create">Create Policy</Link>,
				href: '/create'
			},
			{
				// about
				key: '/about',
				label: <Link href="/about">About</Link>,
				href: '/about'
			}
		];
	}

	return (
		<StyledComponentsRegistry>
			<ConfigProvider
				theme={{
					token: {
						colorPrimary: '#2596be',
						colorPrimaryHover: '#40a9d1',
						colorPrimaryActive: '#1e7ba0',
						colorLink: '#2596be',
						colorLinkHover: '#40a9d1',
						colorLinkActive: '#1e7ba0'
					}
				}}
			>
				<Layout>
					<Header style={{ background: '#fff', display: 'flex', alignItems: 'center' }}>
						<Image
							src="/logo.png"
							alt="Cleared Logo"
							className="header-logo"
							onClick={() => {
								window.location.href = '/';
							}}
							width={180}
							height={48}
							style={{
								cursor: 'pointer',
								objectFit: 'contain',
								maxHeight: '40px',
								width: 'auto'
							}}
						/>

						<Menu
							style={{ minWidth: '800px' }}
							mode="horizontal"
							defaultSelectedKeys={pathname}
							items={menuItems}
						/>

						<span
							style={{
								float: 'right',
								right: 20,
								position: 'absolute'
							}}
						>
							<ConnectButton size="middle" />
							{/* {!wallet?.address && <Button href="#" type="primary" onClick={connect}>Connect</Button>} */}
							{/* {wallet?.address && <span>{abbreviate(wallet?.address)}&nbsp;(<a href="#" onClick={logout}>logout</a>)</span>} */}
						</span>
					</Header>
					<span className="float-right bold active-network" style={{ color: '#8c8c8c' }}>
						Use network: {ACTIVE_CHAIN.name}&nbsp;
					</span>
					<Content className="container">
						{/* Pass children to the content area */}
						<div className="container">{children}</div>
					</Content>

					<Footer style={{ textAlign: 'center' }}>
						<hr />
						<br />
						{APP_NAME} ©2025. Filecoin Testnet demo. <a href="/about">About</a>
					</Footer>
				</Layout>
			</ConfigProvider>
		</StyledComponentsRegistry>
	);
}

export default UiLayoutWrapper;
