import { describe, it, expect } from 'vitest';
import { buildApproveRawTx } from '../../src/tx/buildApprovalRawTx.js';
import { ADDR_TOKEN, ADDR_FACTORY } from '../helpers/fixtures.js';
import { encodeFunctionData } from 'viem';
import { ERC20Abi } from '../../src/abi/ERC20Abi.js';
import { APPROVE_TOKEN } from '../../src/constants/contractmethods.js';
import { ethers } from 'ethers';

describe('buildApproveRawTx', () => {
  it('returns tx targeting the token address', () => {
    const tx = buildApproveRawTx({ tokenAddress: ADDR_TOKEN, spender: ADDR_FACTORY });
    expect(tx.to).toBe(ADDR_TOKEN);
  });

  it('defaults amount to MaxUint256', () => {
    const tx = buildApproveRawTx({ tokenAddress: ADDR_TOKEN, spender: ADDR_FACTORY });
    const expected = encodeFunctionData({
      abi: ERC20Abi,
      functionName: APPROVE_TOKEN,
      args: [ADDR_FACTORY, ethers.MaxUint256],
    });
    expect(tx.data).toBe(expected);
  });

  it('uses custom amount when provided', () => {
    const customAmount = 42n;
    const tx = buildApproveRawTx({
      tokenAddress: ADDR_TOKEN,
      spender: ADDR_FACTORY,
      amount: customAmount,
    });
    const expected = encodeFunctionData({
      abi: ERC20Abi,
      functionName: APPROVE_TOKEN,
      args: [ADDR_FACTORY, customAmount],
    });
    expect(tx.data).toBe(expected);
  });

  it('sets value to 0n', () => {
    const tx = buildApproveRawTx({ tokenAddress: ADDR_TOKEN, spender: ADDR_FACTORY });
    expect(tx.value).toBe(0n);
  });

  it('throws when tokenAddress is missing', () => {
    expect(() =>
      buildApproveRawTx({ tokenAddress: '' as any, spender: ADDR_FACTORY })
    ).toThrow('token address is required');
  });

  it('throws when spender is missing', () => {
    expect(() =>
      buildApproveRawTx({ tokenAddress: ADDR_TOKEN, spender: '' as any })
    ).toThrow('spender address is required');
  });
});
