// generate-wallets.ts
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';

interface Wallet {
  index: number;
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

// Function to generate wallets
function generateWallets(numWallets: number): Wallet[] {
  console.log(`Generating ${numWallets} wallets...`);
  
  const wallets: Wallet[] = [];
  
  for (let i = 0; i < numWallets; i++) {
    // Generate a random private key
    const privateKey = generatePrivateKey();
    
    // Create an account from the private key
    const account = privateKeyToAccount(privateKey);
    
    wallets.push({
      index: i + 1,
      privateKey: privateKey,
      address: account.address
    });
    
    console.log(`Wallet ${i + 1} generated: ${account.address}`);
  }
  
  return wallets;
}

// Function to save wallets to a file
function saveWalletsToFile(wallets: Wallet[], fileName: string): void {
  console.log(`Saving wallets to ${fileName}...`);
  
  let fileContent = "# Development Wallets\n\n";
  fileContent += "DO NOT USE THESE WALLETS FOR PRODUCTION OR REAL FUNDS\n\n";
  
  // Format for .env file
  let envContent = "# Wallet Private Keys for Development\n\n";
  
  for (const wallet of wallets) {
    fileContent += `## Wallet ${wallet.index}\n`;
    fileContent += `Address: ${wallet.address}\n`;
    fileContent += `Private Key: ${wallet.privateKey}\n\n`;
    
    envContent += `PRIVATE_KEY_${wallet.index}=${wallet.privateKey}\n`;
  }
  
  // Save to text file
  fs.writeFileSync(fileName, fileContent);
  
  // Save to .env file format
  fs.writeFileSync('.env.wallets', envContent);
  
  console.log(`Wallets saved to ${fileName} and .env.wallets`);
}

// Main function
function main(): void {
  try {
    const numWallets = 5;
    const fileName = 'dev-wallets.txt';
    
    const wallets = generateWallets(numWallets);
    saveWalletsToFile(wallets, fileName);
    
    console.log('Wallet generation completed successfully!');
    console.log('Remember: DO NOT use these wallets for production or store real funds in them!');
  } catch (error) {
    console.error('Error generating wallets:', error);
  }
}

// Execute the main function
main();