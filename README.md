# Veres Rounds Smart Contracts

## Overview
Veres Rounds is a blockchain-powered SACCO (Savings and Credit Cooperative Organization) system designed to facilitate group savings and lending in a structured, circular manner. The system operates on smart contracts deployed on the Celo blockchain, ensuring transparency, automation, and security.

## Smart Contract Architecture
The system consists of two main contracts:

1. **SaccoManager** - Handles SACCO creation, administration, and fee management.
2. **RoundManager** - Manages the cyclical savings and loan rounds.

## Contract Details

### 1. SaccoManager Contract
This contract is responsible for managing SACCOs, including their creation, administration, and fee policies.

#### **State Variables:**
- **saccoId** (uint256) - Unique identifier for each SACCO.
- **creationFee** (uint256) - Fee required to create a SACCO.
- **title** (string) - Name of the SACCO.
- **description** (string) - SACCO details.
- **imageLink** (string) - Link to the SACCO image/logo.
- **roundFee** (uint256) - Fee to participate in each round.
- **totalRounds** (uint256) - Total rounds in the SACCO cycle.
- **adminAddresses** (mapping(address => bool)) - Addresses of SACCO admins.
- **createdBy** (address) - Address of the SACCO creator.
- **createdOn** (uint256) - Timestamp of SACCO creation.
- **roundStart** (uint256) - Start timestamp of the first round.
- **roundsDone** (uint256) - Number of rounds completed.
- **lateFine** (uint256) - Penalty fee for late contributions.
- **superAdmin** (address) - The system owner with ultimate control.
- **saccoFunds** (mapping(uint256 => uint256)) - Tracks SACCO funds.

#### **Functions:**
- `createSacco(...)` - Creates a new SACCO with specified parameters.
- `addAdmin(address admin)` - Assigns admin privileges to a user.
- `removeAdmin(address admin)` - Removes an admin.
- `updateFees(uint256 newCreationFee, uint256 newRoundFee, uint256 newLateFine)` - Updates SACCO fees.
- `withdrawFunds(uint256 saccoId, uint256 amount)` - Allows admins or superAdmin to withdraw funds.
- `getSaccoDetails(uint256 saccoId)` - Fetches SACCO information.

---

### 2. RoundManager Contract
This contract governs the round-based savings and lending activities.

#### **State Variables:**
- **roundId** (uint256) - Unique identifier for each round.
- **saccoId** (uint256) - ID of the associated SACCO.
- **userId** (address) - User participating in the round.
- **amount** (uint256) - Amount contributed or borrowed.
- **fine** (uint256) - Fine imposed for late payments.
- **currentRound** (uint256) - Tracks the ongoing round.
- **roundOrder** (mapping(uint256 => address)) - Determines user sequence for contributions and payouts.
- **roundStatus** (enum) - OPEN, CLOSED, or ONGOING.

#### **Functions:**
- `startRound(uint256 saccoId)` - Initiates a new round for a SACCO.
- `joinRound(uint256 saccoId, uint256 amount)` - Allows a user to join a round.
- `contribute(uint256 roundId, uint256 amount)` - Processes user contributions.
- `withdrawPayout(uint256 roundId)` - Allows eligible users to withdraw their payouts.
- `applyFine(address user, uint256 fineAmount)` - Imposes a late fine.
- `getRoundDetails(uint256 roundId)` - Fetches round information.
- `closeRound(uint256 roundId)` - Marks a round as completed.

## Access Control
- **Super Admin**: Has full control over all SACCOs, including fund management.
- **Sacco Admins**: Manage individual SACCOs but cannot access other SACCOs.
- **Sacco Users**: Participate in rounds and contribute funds.

## Future Enhancements
- Implement reputation-based lending.
- Introduce staking rewards for timely contributions.
- Enable cross-SACCO lending pools.

## Deployment
The contracts will be deployed on the Celo blockchain using Solidity, Hardhat, and Viem.

---

This README provides a high-level technical overview. Let me know if you'd like additional refinements or extra features!

