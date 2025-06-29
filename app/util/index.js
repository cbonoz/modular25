import { IPFS_BASE_URL, ACTIVE_CHAIN, } from '../constants'
import { ethers } from 'ethers'

export const abbreviate = s => s ? `${s.substr(0, 6)}**` : ''

export const formatDate = (d) => {
  if (!(d instanceof Date)) {
    d = d ? new Date(d) : new Date()
  }
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

export const formatCurrency = (amount, symbol) => {
  if (amount === 0) {
    return 'Free'
  } else if (!amount) {
    return ''
  }
  return `${amount} ${symbol || ACTIVE_CHAIN.symbol}`
}

export const ipfsUrl = (cid, fileName) => {
  // let url = `https://ipfs.io/ipfs/${cid}`;
  let url = `${IPFS_BASE_URL}/${cid}`
  if (fileName) {
    return `${url}/${fileName}`;
  }
  return url;
};

export const uploadUrl = (uploadId) => `${window.location.origin}/upload/${uploadId}`;

export const convertCamelToHuman = (str) => {
  // Check if likely datetime timestamp ms
  if (str.length === 13) {
    return new Date(str).toLocaleDateString();
  }

  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, function (str) {
      return str.toUpperCase();
    }).replace(/_/g, ' ');
}

export function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const getBlockExplorerFromChain = (chain) => chain?.blockExplorers?.default?.url || chain?.blockExplorerUrls?.[0]

export const getExplorerUrl = (chain, hash, useTx) =>
  `${getBlockExplorerFromChain(chain)}/${useTx ? "tx/" : "address/"}${hash}${ACTIVE_CHAIN.id === 31415 ? '?network=wallaby' : ''}`;

export const createJsonFile = (signload, fileName) => {
  const st = JSON.stringify(signload);
  const blob = new Blob([st], { type: "application/json" });
  const fileData = new File([blob], fileName);
  return fileData;
};

export const col = (k, render) => ({
  title: capitalize(k).replaceAll('_', ' '),
  dataIndex: k,
  key: k,
  render,
});

export const getKeccak256 = (str) => {
  const bytes = ethers.utils.toUtf8Bytes(str);
  const hash = ethers.utils.keccak256(bytes);
  return hash;
}

export const isEmpty = (r) => {
  return !r || r.length === 0
}

const getError = (error) => {
  if (error?.data?.message) {
    return error.data.message;
  } else if (error?.reason) {
    return error.reason;
  } else if (error?.message) {
    return error.message;
  }
  return error;
};

export const humanError = err => {
  let message = getError(err);
  if (message.indexOf('404') !== -1) {
    message = 'Entry not found. Do you have the correct url?';
  } else if (message.indexOf('network changed') !== -1) {
    message = 'Network changed since page loaded, please refresh.';
  }
  return message
}

export function bytesToSize(bytes) {
  var sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}
