// src/main.ts

// --- IMPORTS ---
// Correctly import the DApp connector API types
import type { DAppConnectorAPI, DAppConnectorWalletAPI } from '@midnight-ntwrk/dapp-connector-api';
// CORRECTION: Use NetworkProvider from the official wallet-api package
import { NetworkProvider } from '@midnight-ntwrk/wallet-api';
// CORRECTION: Import BaseContract for context, as the generated class extends it
import { BaseContract } from '@midnight-ntwrk/midnight-js-contracts';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';

// Import the generated contract API from Phase 2
import { Contract as VerifyAgeContract, witnesses } from './managed/verify-age/contract';

// --- TYPE DECLARATIONS ---
declare global {
  interface Window {
    midnight?: DAppConnectorAPI;
  }
}

// --- CONSTANTS AND STATE ---
const CONTRACT_ADDRESS = 'mn_contract_addr_test1qqv5ase3hdszmesw6grad6demz0k80aeq9pxequx2pc7h8klq420uz';
let walletApi: DAppConnectorWalletAPI | null = null;
// CORRECTION: Use the correct NetworkProvider type
let provider: NetworkProvider | null = null;
// Use the specific, generated contract type for better type safety
let contract: VerifyAgeContract | null = null;

// --- DOM ELEMENTS ---
const connectWalletBtn = document.getElementById('connectWalletBtn')!;
const walletInfo = document.getElementById('walletInfo')!;
const mainContent = document.getElementById('mainContent')!;
const birthdateInput = document.getElementById('birthdateInput') as HTMLInputElement;
const generateProofBtn = document.getElementById('generateProofBtn')!;
const proofResult = document.getElementById('proofResult')!;
const verificationResult = document.getElementById('verificationResult')!;
const scannerContainer = document.getElementById('scanner')!;

// --- 1. CONNECT TO LACE WALLET ---
connectWalletBtn.addEventListener('click', async () => {
  if (!window.midnight) {
    alert('Lace Wallet not found. Please install the browser extension.');
    return;
  }

  try {
    walletApi = await window.midnight.enable();
    
    // CORRECTION: Instantiate the correct NetworkProvider
    provider = new NetworkProvider({ wallet: walletApi });

    // CORRECTION: Use the '.at()' pattern to connect to the deployed contract
    // 1. Create a local instance of the contract definition
    const contractInstance = new VerifyAgeContract(witnesses);
    // 2. Connect that instance to a specific address and provider on the network
    contract = contractInstance.at(CONTRACT_ADDRESS, provider);

    const state = await walletApi.state();
    const address = state.addresses[0];
    
    walletInfo.innerHTML = `Connected: ${address.slice(0, 15)}...`;
    walletInfo.classList.remove('hidden');
    connectWalletBtn.classList.add('hidden');
    mainContent.classList.remove('hidden');
    
    startScanner();

  } catch (error) {
    console.error(error);
    alert('Wallet connection denied or failed.');
  }
});

// --- 2. ATTENDEE: GENERATE PROOF ---
generateProofBtn.addEventListener('click', async () => {
  if (!contract || !walletApi || !birthdateInput.value) {
    alert('Please connect your wallet and select a birthdate.');
    return;
  }

  const birthdate = new Date(birthdateInput.value);
  const birthdateTimestamp = BigInt(Math.floor(birthdate.getTime() / 1000));
  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

  proofResult.innerHTML = `<div class="info">Preparing transaction... Please check your Lace wallet.</div>`;
  proofResult.classList.remove('hidden');

  try {
    // This logic is now correct because `contract` is properly instantiated
    const unsignedTx = await contract.buildTx.verifyAge(birthdateTimestamp, currentTimestamp);

    // This wallet interaction logic remains correct from the first round of fixes
    const balancedAndProvenTx = await walletApi.balanceAndProveTransaction(unsignedTx);
    const txId = await walletApi.submitTransaction(balancedAndProvenTx);

    proofResult.innerHTML = `
      <div class="success">Proof submitted! Transaction ID: ${txId.slice(0, 20)}...</div>
      <p>Show this QR code to the venue:</p>
      <canvas id="qrCanvas"></canvas>
    `;
    const canvas = document.getElementById('qrCanvas') as HTMLCanvasElement;
    QRCode.toCanvas(canvas, txId);

  } catch (error: any) {
    console.error(error);
    proofResult.innerHTML = `<div class="denied">Transaction failed: ${error.info || 'User rejected.'}</div>`;
  }
});


// --- 3. VENUE: VERIFY PROOF ---
// This function remains correct. NetworkProvider exposes the publicDataProvider.
function startScanner() {
    const html5QrCode = new Html5Qrcode("scanner");
    const qrCodeSuccessCallback = async (decodedText: string, decodedResult: any) => {
        html5QrCode.stop().catch(err => console.error("Failed to stop scanner", err));

        const txId = decodedText;
        verificationResult.innerHTML = `<div class="info">Scanned TX ID: ${txId.slice(0, 20)}...<br>Checking status on the blockchain...</div>`;

        if (!provider) {
            verificationResult.innerHTML = `<div class="denied">Provider not initialized.</div>`;
            return;
        }

        const txStatus = await provider.publicDataProvider.queryTransaction(txId);

        if (txStatus && txStatus.status === 'confirmed') {
             verificationResult.innerHTML = `<div class="success">✅ VERIFIED! Access Granted.</div>`;
        } else {
             verificationResult.innerHTML = `<div class="denied">❌ NOT VERIFIED. Access Denied.</div>`;
        }
    };
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined).catch(err => {
        console.error("Unable to start scanning.", err)
        scannerContainer.innerHTML = "Could not start camera."
    });
}