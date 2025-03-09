// // test-round-manager.ts
// import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
// import { privateKeyToAccount } from 'viem/accounts';
// import { celoAlfajores } from 'viem/chains';
// import { abi as SaccoManagerABI } from './artifacts/SaccoManager.json';
// import { abi as RoundManagerABI } from './artifacts/RoundManager.json';
// import { abi as MockcUSDTokenABI } from './artifacts/MockcUSDToken.json';
// import fs from 'fs';
// import assert from 'assert';

// // Load deployed contract addresses
// const addresses = JSON.parse(fs.readFileSync('./deployed-addresses.json', 'utf8'));

// // Set up accounts
// const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
// const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2 as `0x${string}`;
// const PRIVATE_KEY_3 = process.env.PRIVATE_KEY_3 as `0x${string}`;
// const PRIVATE_KEY_4 = process.env.PRIVATE_KEY_4 as `0x${string}`;
// const PRIVATE_KEY_5 = process.env.PRIVATE_KEY_5 as `0x${string}`;

// const account1 = privateKeyToAccount(PRIVATE_KEY);
// const account2 = privateKeyToAccount(PRIVATE_KEY_2);
// const account3 = privateKeyToAccount(PRIVATE_KEY_3);
// const account4 = privateKeyToAccount(PRIVATE_KEY_4);
// const account5 = privateKeyToAccount(PRIVATE_KEY_5);

// // Set up clients
// const publicClient = createPublicClient({
//   chain: celoAlfajores,
//   transport: http(),
// });

// const walletClient1 = createWalletClient({
//   account: account1,
//   chain: celoAlfajores,
//   transport: http(),
// });

// const walletClient2 = createWalletClient({
//   account: account2,
//   chain: celoAlfajores,
//   transport: http(),
// });

// const walletClient3 = createWalletClient({
//   account: account3,
//   chain: celoAlfajores,
//   transport: http(),
// });

// const walletClient4 = createWalletClient({
//   account: account4,
//   chain: celoAlfajores,
//   transport: http(),
// });

// const walletClient5 = createWalletClient({
//   account: account5,
//   chain: celoAlfajores,
//   transport: http(),
// });

// async function testRoundManager() {
//   console.log('Testing RoundManager contract...');
//   console.log('Using accounts:');
//   console.log('Account 1 (Owner):', account1.address);
//   console.log('Account 2 (Admin):', account2.address);
//   console.log('Account 3 (Member):', account3.address);
//   console.log('Account 4 (Member):', account4.address);
//   console.log('Account 5 (Member):', account5.address);

//   const { mockCUSDAddress, saccoManagerAddress, roundManagerAddress } = addresses;

//   // 1. Transfer some mock cUSD to other accounts for testing
//   console.log('\n1. Transferring mock cUSD to test accounts...');
  
//   await walletClient1.writeContract({
//     address: mockCUSDAddress,
//     abi: MockcUSDTokenABI,
//     functionName: 'transfer',
//     args: [account4.address, parseEther('1000')],
//   });
  
//   await walletClient1.writeContract({
//     address: mockCUSDAddress,
//     abi: MockcUSDTokenABI,
//     functionName: 'transfer',
//     args: [account5.address, parseEther('1000')],
//   });
  
//   // 2. Approve contracts to spend tokens
//   console.log('\n2. Approving contracts to spend tokens...');
  
//   for (const client of [walletClient1, walletClient2, walletClient3, walletClient4, walletClient5]) {
//     await client.writeContract({
//       address: mockCUSDAddress,
//       abi: MockcUSDTokenABI,
//       functionName: 'approve',
//       args: [saccoManagerAddress, parseEther('500')],
//     });
    
//     await client.writeContract({
//       address: mockCUSDAddress,
//       abi: MockcUSDTokenABI,
//       functionName: 'approve',
//       args: [roundManagerAddress, parseEther('500')],
//     });
//   }
  
//   // 3. Create a new SACCO for testing rounds
//   console.log('\n3. Creating a new SACCO for testing rounds...');
  
//   const createSaccoTx = await walletClient1.writeContract({
//     address: saccoManagerAddress,
//     abi: SaccoManagerABI,
//     functionName: 'createSacco',
//     args: [
//       'Rounds Test SACCO',
//       'A SACCO for testing round functionality',
//       'https://example.com/image.png',
//       parseEther('10'),
//       parseEther('5'),
//       10,
//       parseEther('1'),
//       parseEther('2'),
//       parseEther('1'),
//       7,
//     ],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: createSaccoTx });
//   console.log('SACCO created with transaction:', createSaccoTx);
  
//   // 4. Add members to the SACCO
//   console.log('\n4. Adding members to the SACCO...');
  
//   // Add account2 as admin
//   await walletClient1.writeContract({
//     address: saccoManagerAddress,
//     abi: SaccoManagerABI,
//     functionName: 'addAdmin',
//     args: [1n, account2.address],
//   });
  
//   // Join SACCO as members
//   for (const client of [walletClient3, walletClient4, walletClient5]) {
//     await client.writeContract({
//       address: saccoManagerAddress,
//       abi: SaccoManagerABI,
//       functionName: 'joinSacco',
//       args: [1n],
//     });
//   }
  
//   // 5. Create a new round
//   console.log('\n5. Creating a new round...');
  
//   const createRoundTx = await walletClient1.writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'createRound',
//     args: [
//       1n, // saccoId
//       parseEther('5'), // requiredContribution
//       parseEther('20'), // targetAmount
//       7n, // durationInDays
//     ],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: createRoundTx });
//   console.log('Round created with transaction:', createRoundTx);
  
//   // 6. Set up the beneficiary queue
//   console.log('\n6. Setting up the beneficiary queue...');
  
//   const setupQueueTx = await walletClient1.writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'setupBeneficiaryQueue',
//     args: [1n],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: setupQueueTx });
//   console.log('Beneficiary queue set up with transaction:', setupQueueTx);
  
//   // 7. Check beneficiary queue
//   console.log('\n7. Checking beneficiary queue...');
  
//   const beneficiaryQueue = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getBeneficiaryQueue',
//     args: [1n],
//   });
  
//   console.log('Beneficiary queue:', beneficiaryQueue);
//   assert(beneficiaryQueue.length === 5, 'Beneficiary queue should have 5 members');
  
//   // 8. Get the next beneficiary
//   console.log('\n8. Getting the next beneficiary...');
  
//   const nextBeneficiary = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getNextBeneficiary',
//     args: [1n],
//   });
  
//   console.log('Next beneficiary:', nextBeneficiary);
  
//   // 9. Start the round with the next beneficiary
//   console.log('\n9. Starting the round with the next beneficiary...');
  
//   const assignBeneficiaryTx = await walletClient1.writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'assignNextBeneficiary',
//     args: [1n], // roundId
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: assignBeneficiaryTx });
//   console.log('Beneficiary assigned with transaction:', assignBeneficiaryTx);
  
//   const startRoundTx = await walletClient1.writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'startRound',
//     args: [
//       1n, // roundId
//       nextBeneficiary, // beneficiary
//       7n, // durationInDays
//     ],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: startRoundTx });
//   console.log('Round started with transaction:', startRoundTx);
  
//   // 10. Join the round as members
//   console.log('\n10. Members joining the round...');
  
//   for (const client of [walletClient1, walletClient2, walletClient3, walletClient4, walletClient5]) {
//     const joinRoundTx = await client.writeContract({
//       address: roundManagerAddress,
//       abi: RoundManagerABI,
//       functionName: 'joinRound',
//       args: [1n], // roundId
//     });
    
//     await publicClient.waitForTransactionReceipt({ hash: joinRoundTx });
//     console.log(`${client.account.address} joined the round with transaction:`, joinRoundTx);
//   }
  
//   // 11. Make contributions to the round
//   console.log('\n11. Making contributions to the round...');
  
//   for (const client of [walletClient1, walletClient2, walletClient3, walletClient4]) {
//     const contributeTx = await client.writeContract({
//       address: roundManagerAddress,
//       abi: RoundManagerABI,
//       functionName: 'contribute',
//       args: [1n], // roundId
//     });
    
//     await publicClient.waitForTransactionReceipt({ hash: contributeTx });
//     console.log(`${client.account.address} contributed with transaction:`, contributeTx);
//   }
  
//   // 12. Check round progress
//   console.log('\n12. Checking round progress...');
  
//   const roundProgress = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getRoundProgress',
//     args: [1n],
//   });
  
//   console.log('Round progress:', roundProgress.toString(), '%');
  
//   // 13. Get round details
//   console.log('\n13. Getting round details...');
  
//   const roundDetails = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getRoundDetails',
//     args: [1n],
//   });
  
//   console.log('Round details:', roundDetails);
  
//   // 14. Check if target is reached
//   console.log('\n14. Checking if target is reached...');
  
//   const isTargetReached = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'isTargetReached',
//     args: [1n],
//   });
  
//   console.log('Is target reached?', isTargetReached);
  
//   // 15. Make the final contribution to reach the target
//   console.log('\n15. Making the final contribution to reach the target...');
  
//   const finalContributeTx = await walletClient5.writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'contribute',
//     args: [1n], // roundId
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: finalContributeTx });
//   console.log('Final contribution made with transaction:', finalContributeTx);
  
//   // 16. Check again if target is now reached
//   console.log('\n16. Checking again if target is now reached...');
  
//   const targetReachedAfter = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'isTargetReached',
//     args: [1n],
//   });
  
//   console.log('Is target reached now?', targetReachedAfter);
//   assert(targetReachedAfter === true, 'Target should be reached after all contributions');
  
//   // 17. Get participant details
//   console.log('\n17. Getting participant details...');
  
//   const participantDetails = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getParticipantDetails',
//     args: [1n, nextBeneficiary],
//   });
  
//   console.log('Participant details for beneficiary:', participantDetails);
  
//   // 18. Beneficiary claims payout
//   console.log('\n18. Beneficiary claims payout...');
  
//   // Determine which wallet client to use for the beneficiary
//   let beneficiaryClient;
//   if (nextBeneficiary === account1.address) beneficiaryClient = walletClient1;
//   else if (nextBeneficiary === account2.address) beneficiaryClient = walletClient2;
//   else if (nextBeneficiary === account3.address) beneficiaryClient = walletClient3;
//   else if (nextBeneficiary === account4.address) beneficiaryClient = walletClient4;
//   else if (nextBeneficiary === account5.address) beneficiaryClient = walletClient5;
  
//   const claimPayoutTx = await beneficiaryClient.writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'claimPayout',
//     args: [1n], // roundId
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: claimPayoutTx });
//   console.log('Payout claimed with transaction:', claimPayoutTx);
  
//   // 19. Check round status after payout
//   console.log('\n19. Checking round status after payout...');
  
//   const roundDetailsAfter = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getRoundDetails',
//     args: [1n],
//   });
  
//   console.log('Round details after payout:', roundDetailsAfter);
//   assert(roundDetailsAfter[8] === 2n, 'Round status should be Completed (2) after payout');
  
//   // 20. Create and auto-start a new round
//   console.log('\n20. Creating and auto-starting a new round...');
  
//   const autoStartTx = await walletClient1.writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'autoStartNextRound',
//     args: [
//       1n, // saccoId
//       parseEther('5'), // requiredContribution
//       parseEther('20'), // targetAmount
//       7n, // durationInDays
//     ],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: autoStartTx });
//   console.log('New round auto-started with transaction:', autoStartTx);
  
//   // 21. Check the new round details
//   console.log('\n21. Checking the new round details...');
  
//   const newRoundDetails = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getRoundDetails',
//     args: [2n],
//   });
  
//   console.log('New round details:', newRoundDetails);
  
//   // 22. Get the updated beneficiary queue after advance
//   console.log('\n22. Getting the updated beneficiary queue after advance...');
  
//   const updatedQueue = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getBeneficiaryQueue',
//     args: [1n],
//   });
  
//   console.log('Updated beneficiary queue:', updatedQueue);
//   assert(updatedQueue[0] !== nextBeneficiary, 'The next beneficiary should have been moved to the end of the queue');
  
//   // 23. Shuffle the queue
//   console.log('\n23. Shuffling the queue...');
  
//   const shuffleTx = await walletClient1.writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'shuffleQueue',
//     args: [1n],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: shuffleTx });
//   console.log('Queue shuffled with transaction:', shuffleTx);
  
//   // 24. Get the shuffled queue
//   console.log('\n24. Getting the shuffled queue...');
  
//   const shuffledQueue = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getBeneficiaryQueue',
//     args: [1n],
//   });
  
//   console.log('Shuffled queue:', shuffledQueue);
  
//   // 25. Apply late fines for round 1
//   console.log('\n25. Applying late fines...');
  
//   // Need to wait for the round to expire - mocking this by just applying the fines
//   const applyFinesTx = await walletClient1.writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'applyLateFines',
//     args: [1n], // roundId
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: applyFinesTx });
//   console.log('Late fines applied with transaction:', applyFinesTx);
  
//   // 26. Extend the duration of round 2
//   console.log('\n26. Extending the duration of round 2...');
  
//   const extendDurationTx = await walletClient1.writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'extendRoundDuration',
//     args: [2n, 3n], // roundId, additionalDays
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: extendDurationTx });
//   console.log('Round duration extended with transaction:', extendDurationTx);
  
//   // 27. Check updated round 2 details
//   console.log('\n27. Checking updated round 2 details...');
  
//   const updatedRound2Details = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getRoundDetails',
//     args: [2n],
//   });
  
//   console.log('Updated round 2 details:', updatedRound2Details);
  
//   // 28. Get SACCO rounds
//   console.log('\n28. Getting all rounds for the SACCO...');
  
//   const saccoRounds = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getSaccoRounds',
//     args: [1n],
//   });
  
//   console.log('SACCO rounds:', saccoRounds);
//   assert(saccoRounds.length === 2, 'SACCO should have 2 rounds');
  
//   // 29. Get active rounds count
//   console.log('\n29. Getting active rounds count...');
  
//   const activeRoundsCount = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getActiveRoundsCount',
//     args: [1n],
//   });
  
//   console.log('Active rounds count:', activeRoundsCount.toString());

//   console.log('\nAll RoundManager tests completed successfully!');
// }

// // Execute the tests
// testRoundManager()
//   .then(() => {
//     console.log('RoundManager tests completed successfully');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('RoundManager tests failed:', error);
//     process.exit(1);
//   });