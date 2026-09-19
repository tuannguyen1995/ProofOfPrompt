import { createClient } from 'genlayer-js';
import { defineChain, toHex, toRlp } from 'viem';

// Target Contract on Studionet
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0xDB02327FE8cFAbF2066A0AB0Bfd762135E4a0290') as `0x${string}`;

// Studionet Chain Definition (Chain ID: 61999 = 0xF1EF)
export const studionet = defineChain({
  id: 61999,
  name: 'GenLayer Studio Network',
  nativeCurrency: {
    name: 'GEN Token',
    symbol: 'GEN',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://studio.genlayer.com/api'],
    },
    public: {
      http: ['https://studio.genlayer.com/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'GenLayer Explorer',
      url: 'https://genlayer-explorer.vercel.app',
    },
  },
});

export const STUDIONET_CHAIN_ID_HEX = `0x${studionet.id.toString(16)}`; // 61999 = 0xF1EF
export const STUDIONET_RPC_URL = 'https://studio.genlayer.com/api';
export const STUDIONET_EXPLORER_URL = 'https://genlayer-explorer.vercel.app';
export const STUDIO_PORTAL_URL = 'https://studio.genlayer.com';

/* -------------------------------------------------------------------------- */
/*                           Calldata Encoding Logic                          */
/* -------------------------------------------------------------------------- */
const BITS_IN_TYPE = 3;
const TYPE_SPECIAL = 0;
const TYPE_PINT = 1;
const TYPE_NINT = 2;
const TYPE_BYTES = 3;
const TYPE_STR = 4;
const TYPE_ARR = 5;
const TYPE_MAP = 6;
const SPECIAL_NULL = 0 << BITS_IN_TYPE | TYPE_SPECIAL;
const SPECIAL_FALSE = 1 << BITS_IN_TYPE | TYPE_SPECIAL;
const SPECIAL_TRUE = 2 << BITS_IN_TYPE | TYPE_SPECIAL;

function writeNum(to: number[], data: bigint) {
  if (data === 0n) {
    to.push(0);
    return;
  }
  let curData = data;
  while (curData > 0n) {
    let cur = Number(curData & 0x7fn);
    curData >>= 7n;
    if (curData > 0n) {
      cur |= 128;
    }
    to.push(cur);
  }
}

function encodeNumWithType(to: number[], data: bigint, type: number) {
  const res = (data << BigInt(BITS_IN_TYPE)) | BigInt(type);
  writeNum(to, res);
}

function encodeNum(to: number[], data: bigint) {
  if (data >= 0n) {
    encodeNumWithType(to, data, TYPE_PINT);
  } else {
    encodeNumWithType(to, -data - 1n, TYPE_NINT);
  }
}

function encodeMap(to: number[], arr: [string, any][]) {
  const newEntries = arr.map(([k, v]) => [
    Array.from(k, (x) => x.codePointAt(0)!),
    new TextEncoder().encode(k),
    v,
  ] as const);

  newEntries.sort((v1, v2) => {
    const l = v1[0];
    const r = v2[0];
    for (let index = 0; index < l.length && index < r.length; index++) {
      const cur = l[index] - r[index];
      if (cur !== 0) return cur;
    }
    return l.length - r.length;
  });

  encodeNumWithType(to, BigInt(newEntries.length), TYPE_MAP);
  for (const [, k, v] of newEntries) {
    writeNum(to, BigInt(k.length));
    for (const c of k) {
      to.push(c);
    }
    encodeImpl(to, v);
  }
}

function encodeImpl(to: number[], data: any) {
  if (data === null || data === undefined) {
    to.push(SPECIAL_NULL);
    return;
  }
  if (data === true) {
    to.push(SPECIAL_TRUE);
    return;
  }
  if (data === false) {
    to.push(SPECIAL_FALSE);
    return;
  }
  switch (typeof data) {
    case 'number': {
      encodeNum(to, BigInt(data));
      return;
    }
    case 'bigint': {
      encodeNum(to, data);
      return;
    }
    case 'string': {
      const str = new TextEncoder().encode(data);
      encodeNumWithType(to, BigInt(str.length), TYPE_STR);
      for (const c of str) {
        to.push(c);
      }
      return;
    }
    case 'object': {
      if (data instanceof Uint8Array) {
        encodeNumWithType(to, BigInt(data.length), TYPE_BYTES);
        for (const c of data) {
          to.push(c);
        }
      } else if (Array.isArray(data)) {
        encodeNumWithType(to, BigInt(data.length), TYPE_ARR);
        for (const c of data) {
          encodeImpl(to, c);
        }
      } else if (data instanceof Map) {
        encodeMap(to, Array.from(data.entries()));
      } else if (Object.getPrototypeOf(data) === Object.prototype) {
        encodeMap(to, Object.keys(data).map((k) => [k, data[k]]));
      }
      return;
    }
    default:
      throw new Error(`Unsupported calldata type: ${typeof data}`);
  }
}

export function encodeAndSerialize(data: any): `0x${string}` {
  const arr: number[] = [];
  encodeImpl(arr, data);
  const rawBytes = new Uint8Array(arr);
  return toRlp([toHex(rawBytes)]);
}

/* -------------------------------------------------------------------------- */
/*                              Client & Network                              */
/* -------------------------------------------------------------------------- */
export function getGenLayerClient() {
  return createClient({
    chain: studionet,
    endpoint: STUDIONET_RPC_URL,
  });
}

/**
 * Executes a write call on GenLayer by signing with MetaMask.
 */
export async function writeContractWithMetaMask(params: {
  address: `0x${string}`;
  functionName: string;
  args: any[];
  value?: bigint;
  account: `0x${string}`;
}): Promise<`0x${string}`> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not detected. Please install MetaMask.');
  }

  const encodedData = encodeAndSerialize({
    method: params.functionName,
    args: params.args,
  });

  const valueHex = params.value && params.value > 0n
    ? `0x${params.value.toString(16)}`
    : '0x0';

  const txHash = (await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: params.account,
        to: params.address,
        data: encodedData,
        value: valueHex,
      },
    ],
  })) as `0x${string}`;

  return txHash;
}

/**
 * Ensures user is connected to the GenLayer Studionet network in MetaMask.
 */
export async function switchToStudionet(): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not detected. Please install MetaMask to interact with GenLayer.');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902 || switchError.code === -32603) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: STUDIONET_CHAIN_ID_HEX,
            chainName: 'GenLayer Studio Network',
            nativeCurrency: {
              name: 'GEN Token',
              symbol: 'GEN',
              decimals: 18,
            },
            rpcUrls: [STUDIONET_RPC_URL],
            blockExplorerUrls: [STUDIONET_EXPLORER_URL],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}
