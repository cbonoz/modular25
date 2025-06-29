'use client';

import React, { useEffect, useMemo } from 'react';
import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs';
import { useServerInsertedHTML } from 'next/navigation';


const StyledComponentsRegistry = ({ children }) => {
  const [ready, setReady] = React.useState(false);

  const cache = useMemo(() => createCache(), []);

  useServerInsertedHTML(() => {
    return <style id="antd" dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }} />
  });

  useEffect(() => {
    console.log('useEffect');
    setReady(true);
  }, []);

  if (!ready) {
    // FOUC (flash of unstyled content fix, wait for page to be ready)
    console.log('returning null')
    return <div><header><img/></header><body/></div>
    // return children;
  }

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
};

export default StyledComponentsRegistry;