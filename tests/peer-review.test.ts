import { describe, it, expect, beforeEach } from 'vitest';

// Mock blockchain state
interface BlockchainState {
  packages: Map<number, SoftwarePackage>;
  reviews: Map<number, Review>;
  reviewerStakes: Map<string, number>;
  currentBlock: number;
  balances: Map<string, number>;
}

interface SoftwarePackage {
  developer: string;
  name: string;
  version: string;
  reputation: number;
}

interface Review {
  packageId: number;
  reviewer: string;
  score: number;
  comment: string;
}

describe('Peer Review System Smart Contract', () => {
  let state: BlockchainState;
  const wallet1 = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const wallet2 = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const contractAddress = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  
  beforeEach(() => {
    // Reset blockchain state before each test
    state = {
      packages: new Map(),
      reviews: new Map(),
      reviewerStakes: new Map(),
      currentBlock: 1,
      balances: new Map([
        [wallet1, 1000],
        [wallet2, 1000],
        [contractAddress, 10000]
      ])
    };
  });
  
  // Mock contract functions
  const submitPackage = (sender: string, name: string, version: string): number => {
    const packageId = state.packages.size + 1;
    const newPackage: SoftwarePackage = {
      developer: sender,
      name,
      version,
      reputation: 0
    };
    state.packages.set(packageId, newPackage);
    return packageId;
  };
  
  const stakeForReview = (sender: string, amount: number): boolean => {
    const balance = state.balances.get(sender) || 0;
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }
    state.balances.set(sender, balance - amount);
    state.balances.set(contractAddress, (state.balances.get(contractAddress) || 0) + amount);
    const currentStake = state.reviewerStakes.get(sender) || 0;
    state.reviewerStakes.set(sender, currentStake + amount);
    return true;
  };
  
  const submitReview = (sender: string, packageId: number, score: number, comment: string): boolean => {
    const reviewerStake = state.reviewerStakes.get(sender) || 0;
    if (reviewerStake < 100) {
      throw new Error('Insufficient stake');
    }
    if (score < 0 || score > 5) {
      throw new Error('Invalid score');
    }
    const reviewId = state.reviews.size + 1;
    const review: Review = {
      packageId,
      reviewer: sender,
      score,
      comment
    };
    state.reviews.set(reviewId, review);
    const pkg = state.packages.get(packageId);
    if (pkg) {
      pkg.reputation += score;
      state.packages.set(packageId, pkg);
    }
    return true;
  };
  
  // Tests
  it('allows submitting a new package', () => {
    const packageId = submitPackage(wallet1, 'TestPackage', '1.0.0');
    const pkg = state.packages.get(packageId);
    
    expect(packageId).toBe(1);
    expect(pkg).toBeDefined();
    expect(pkg?.name).toBe('TestPackage');
    expect(pkg?.version).toBe('1.0.0');
    expect(pkg?.developer).toBe(wallet1);
  });
  
  it('allows staking for review', () => {
    const result = stakeForReview(wallet1, 200);
    
    expect(result).toBe(true);
    expect(state.reviewerStakes.get(wallet1)).toBe(200);
    expect(state.balances.get(wallet1)).toBe(800);
    expect(state.balances.get(contractAddress)).toBe(10200);
  });
  
  it('allows submitting a review', () => {
    const packageId = submitPackage(wallet1, 'TestPackage', '1.0.0');
    stakeForReview(wallet2, 200);
    const result = submitReview(wallet2, packageId, 4, 'Great package!');
    
    expect(result).toBe(true);
    expect(state.reviews.size).toBe(1);
    const review = state.reviews.get(1);
    expect(review?.score).toBe(4);
    expect(review?.comment).toBe('Great package!');
    expect(state.packages.get(packageId)?.reputation).toBe(4);
  });
  
  it('prevents submitting a review without sufficient stake', () => {
    const packageId = submitPackage(wallet1, 'TestPackage', '1.0.0');
    stakeForReview(wallet2, 50);
    
    expect(() => submitReview(wallet2, packageId, 4, 'Great package!')).toThrow('Insufficient stake');
  });
  
  it('prevents submitting a review with invalid score', () => {
    const packageId = submitPackage(wallet1, 'TestPackage', '1.0.0');
    stakeForReview(wallet2, 200);
    
    expect(() => submitReview(wallet2, packageId, 6, 'Invalid score')).toThrow('Invalid score');
  });
});
