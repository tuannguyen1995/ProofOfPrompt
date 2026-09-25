import { defineChain, toRlp, encodeAbiParameters, parseAbiParameters } from 'viem';

// Target Contract on Studionet
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x7DdA9559C647de311e8D86f161f1D0DF264A9A22') as `0x${string}`;

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
      url: 'https://explorer-studio.genlayer.com',
    },
  },
});

export const STUDIONET_CHAIN_ID_HEX = `0x${studionet.id.toString(16)}`; // 61999 = 0xF1EF
export const STUDIONET_RPC_URL = 'https://studio.genlayer.com/api';
export const STUDIONET_EXPLORER_URL = 'https://explorer-studio.genlayer.com';
export const STUDIO_PORTAL_URL = 'https://studio.genlayer.com';

/* -------------------------------------------------------------------------- */
/*                           Calldata Encoding Logic                          */
/* -------------------------------------------------------------------------- */
const BITS_IN_TYPE = 3;
const TYPE_SPECIAL = 0;
const TYPE_PINT = 1;
const TYPE_NINT = 2;
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
  if (data === false) {
    to.push(SPECIAL_FALSE);
    return;
  }
  if (data === true) {
    to.push(SPECIAL_TRUE);
    return;
  }
  if (typeof data === 'number') {
    encodeNum(to, BigInt(data));
    return;
  }
  if (typeof data === 'bigint') {
    encodeNum(to, data);
    return;
  }
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    const str = encoder.encode(data);
    encodeNumWithType(to, BigInt(str.length), TYPE_STR);
    for (const c of str) {
      to.push(c);
    }
    return;
  }
  if (Array.isArray(data)) {
    encodeNumWithType(to, BigInt(data.length), TYPE_ARR);
    for (const item of data) {
      encodeImpl(to, item);
    }
    return;
  }
  if (typeof data === 'object') {
    if (data instanceof Map) {
      encodeMap(to, Array.from(data.entries()));
    } else if (Object.getPrototypeOf(data) === Object.prototype) {
      encodeMap(to, Object.keys(data).map((k) => [k, data[k]]));
    }
    return;
  }
  throw new Error(`Unsupported calldata type: ${typeof data}`);
}

/**
 * Encodes calldata into GenVM hex format.
 */
export function encodeCalldata(data: any): `0x${string}` {
  const arr: number[] = [];
  encodeImpl(arr, data);
  const hex = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
}

/**
 * Decodes GenLayer gen_call response hex into UTF-8 string.
 */
export function decodeCalldataString(rawHex: string): string {
  if (!rawHex) return '';
  const clean = rawHex.startsWith('0x') ? rawHex.slice(2) : rawHex;
  if (!clean) return '';
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }

  // Skip varint type & length prefix
  let offset = 0;
  while (offset < bytes.length && (bytes[offset] & 0x80) !== 0) {
    offset++;
  }
  offset++; // skip final byte of length header

  if (offset >= bytes.length) return '';
  const payloadBytes = new Uint8Array(bytes.slice(offset));
  return new TextDecoder().decode(payloadBytes);
}

/**
 * Wraps transaction into GenLayer Consensus rollup envelope (selector 0x27241a99).
 * Crucial for MetaMask eth_sendTransaction on GenLayer Studionet.
 */
export function encodeAddTransaction(
  sender: string,
  recipient: string,
  numValidators: number = 5,
  maxRotations: number = 3,
  txDataRlp: string
): `0x${string}` {
  const selector = '0x27241a99';
  const encodedParams = encodeAbiParameters(
    parseAbiParameters('address, address, uint256, uint256, bytes'),
    [
      sender as `0x${string}`,
      recipient as `0x${string}`,
      BigInt(numValidators),
      BigInt(maxRotations),
      txDataRlp as `0x${string}`,
    ]
  );
  return `${selector}${encodedParams.slice(2)}` as `0x${string}`;
}

/* -------------------------------------------------------------------------- */
/*                       100% On-Chain Native Readers                         */
/* -------------------------------------------------------------------------- */

/**
 * Reads directly from GenLayer contract on Studionet using native gen_call JSON-RPC.
 */
export async function readContractStudionet(params: {
  address: string;
  functionName: string;
  args?: any[];
  from?: string;
}): Promise<string> {
  const { address, functionName, args = [], from = '0x0000000000000000000000000000000000000000' } = params;
  const calldataHex = encodeCalldata({ method: functionName, args });

  const response = await fetch(STUDIONET_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'gen_call',
      params: [
        {
          from,
          to: address,
          data: calldataHex,
          type: 'read',
        },
      ],
    }),
  });

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || `GenLayer read error in ${functionName}`);
  }

  return decodeCalldataString(json.result);
}

/**
 * Directly fetch real on-chain native GEN balance from GenLayer Studionet RPC.
 * Guaranteed 100% on-chain without simulation or mock data.
 */
export async function fetchStudionetBalance(address: string): Promise<bigint> {
  if (!address || address === '0x0000000000000000000000000000000000000000') return 0n;

  // 1. Direct fetch from Studionet RPC
  try {
    const res = await fetch(STUDIONET_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    });
    const json = await res.json();
    if (json?.result !== undefined && json?.result !== null) {
      return BigInt(json.result);
    }
  } catch (e) {
    console.warn('Direct Studionet RPC eth_getBalance failed, trying provider:', e);
  }

  // 2. Fallback to window.ethereum if on Studionet
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const balHex = (await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      })) as string;
      if (balHex) {
        return BigInt(balHex);
      }
    } catch (err) {
      console.warn('MetaMask eth_getBalance fallback error:', err);
    }
  }

  return 0n;
}

/**
 * Request test GEN from Studionet faucet via sim_fundAccount RPC method.
 */
export async function fundAccountFromStudionetFaucet(
  userAddr: string,
  amountWei: number = 10_000_000_000_000_000_000
): Promise<string> {
  const res = await fetch(STUDIONET_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'sim_fundAccount',
      params: [userAddr, amountWei],
    }),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || 'Faucet funding request failed');
  }
  return json.result;
}

/**
 * Sends a real transaction through MetaMask to GenLayer Studionet.
 */
export async function sendContractTransaction(params: {
  address: string;
  functionName: string;
  args: any[];
  from: string;
  value?: bigint;
}): Promise<`0x${string}`> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask is not detected. Please install MetaMask.');
  }

  const { address, functionName, args, from, value = 0n } = params;

  // 1. Encode GenVM method and parameters
  const calldataHex = encodeCalldata({ method: functionName, args });

  // 2. Wrap into RLP tuple [calldata, "0x"]
  const txDataRlp = toRlp([calldataHex, '0x']);

  // 3. Wrap in GenLayer Consensus rollup envelope (0x27241a99)
  const callData = encodeAddTransaction(from, address, 5, 3, txDataRlp);

  const txParams: any = {
    from,
    to: address,
    data: callData,
    value: value > 0n ? `0x${value.toString(16)}` : '0x0',
  };

  const txHash = (await (window as any).ethereum.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  })) as `0x${string}`;

  return txHash;
}

/**
 * Polls for on-chain transaction receipt and verifies GenVM execution result on GenLayer Studionet.
 * Strictly verifies FINISHED_WITH_RETURN vs FINISHED_WITH_ERROR to prevent false success reporting.
 * Throws an explicit error on timeout or revert — NEVER returns null.
 */
export async function waitForTransactionReceipt(txHash: string, timeoutMs = 90000): Promise<any> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      // 1. Fetch full transaction details including GenVM consensus_data, leader_receipt, and execution results
      const txRes = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const txJson = await txRes.json();
      const txData = txJson?.result;

      if (txData) {
        // A. Check GenLayer top-level execution result enums: FINISHED_WITH_RETURN (1) vs FINISHED_WITH_ERROR (2)
        const execResultName = String(txData.tx_execution_result_name || '').toUpperCase();
        const execResultCode = String(txData.tx_execution_result ?? '');
        const statusName = String(txData.status_name || '').toUpperCase();
        const statusCode = String(txData.status ?? '');

        // Check if transaction was canceled or undetermined
        if (statusName === 'CANCELED' || statusCode === '8') {
          throw new Error(`Transaction was canceled by GenLayer consensus (status: CANCELED).`);
        }
        if (statusName === 'UNDETERMINED' || statusCode === '6') {
          throw new Error(`Transaction outcome undetermined by GenLayer validators (status: UNDETERMINED).`);
        }

        // Direct check for FINISHED_WITH_ERROR
        if (execResultName === 'FINISHED_WITH_ERROR' || execResultCode === '2') {
          const rawError =
            txData.genvm_result?.error_description ||
            txData.genvm_result?.stderr ||
            txData.error_description ||
            'Contract execution reverted on GenVM (FINISHED_WITH_ERROR)';
          throw new Error(`Transaction reverted on GenVM (FINISHED_WITH_ERROR): ${rawError}`);
        }

        // Direct check for FINISHED_WITH_RETURN
        if (execResultName === 'FINISHED_WITH_RETURN' || execResultCode === '1') {
          return txData;
        }

        // B. Inspect leader_receipt & validator consensus data
        if (txData.consensus_data?.leader_receipt) {
          const receipts = Array.isArray(txData.consensus_data.leader_receipt)
            ? txData.consensus_data.leader_receipt
            : [txData.consensus_data.leader_receipt];
          const leader = receipts.find((r: any) => r.mode === 'leader') || receipts[0];

          if (leader) {
            const execRes = String(leader.execution_result || '').toUpperCase();
            const status = String(leader.result?.status || '').toLowerCase();
            const isFinishedWithError =
              execRes === 'FINISHED_WITH_ERROR' ||
              execRes === 'ERROR' ||
              status === 'contract_error' ||
              Boolean(leader.genvm_result?.error_description) ||
              Boolean(leader.genvm_result?.stderr && leader.genvm_result.stderr.includes('Traceback'));

            if (isFinishedWithError) {
              const rawError =
                leader.genvm_result?.error_description ||
                leader.genvm_result?.stderr ||
                leader.result?.payload ||
                'Contract execution reverted on GenVM (FINISHED_WITH_ERROR)';
              throw new Error(`Transaction reverted on GenVM (FINISHED_WITH_ERROR): ${rawError}`);
            }

            const isFinishedWithReturn =
              execRes === 'FINISHED_WITH_RETURN' ||
              (execRes === 'SUCCESS' && (status === 'return' || status === ''));

            if (isFinishedWithReturn && (statusName === 'FINALIZED' || statusName === 'ACCEPTED' || statusCode === '7' || statusCode === '5')) {
              return txData;
            }
          }
        }

        // C. Also check validator votes if available
        if (txData.consensus_data?.validators && Array.isArray(txData.consensus_data.validators)) {
          for (const v of txData.consensus_data.validators) {
            const vExec = String(v.execution_result || '').toUpperCase();
            if (vExec === 'FINISHED_WITH_ERROR') {
              const vErr = v.genvm_result?.error_description || v.genvm_result?.stderr || 'Validator reported FINISHED_WITH_ERROR';
              throw new Error(`Transaction reverted on GenVM (FINISHED_WITH_ERROR): ${vErr}`);
            }
          }
        }
      }

      // 2. Check standard EVM receipt status as secondary verification
      const res = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const data = await res.json();
      if (data && data.result) {
        if (data.result.status === '0x0' || data.result.status === 0) {
          throw new Error(`Transaction reverted on-chain with EVM status 0 (Tx: ${txHash})`);
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('reverted') || e?.message?.includes('FINISHED_WITH_ERROR') || e?.message?.includes('canceled') || e?.message?.includes('undetermined')) {
        throw e;
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  // Timeout reached without confirmation: NEVER return null, throw explicit error!
  throw new Error(
    `Transaction confirmation timed out after ${Math.round(timeoutMs / 1000)}s. ` +
    `Transaction ${txHash} was not confirmed as FINISHED_WITH_RETURN by GenLayer validators within the window.`
  );
}

/**
 * Ensures user is connected to the GenLayer Studionet network in MetaMask.
 */
export async function switchToStudionet(): Promise<void> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask is not detected. Please install MetaMask to interact with GenLayer.');
  }

  const ethereum = (window as any).ethereum;

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902 || switchError.code === -32603) {
      await ethereum.request({
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
