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
const walletAddress = document.getElementById('walletAddress')!;
const mainContent = document.getElementById('mainContent')!;
const birthdateInput = document.getElementById('birthdateInput') as HTMLInputElement;
const generateProofBtn = document.getElementById('generateProofBtn')!;
const proofResult = document.getElementById('proofResult')!;
const verificationResult = document.getElementById('verificationResult')!;
const scannerContainer = document.getElementById('scanner')!;

// --- UTILITY FUNCTIONS FOR ENHANCED UI ---

// Create floating particles for ambient effect
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 4) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Enhanced button animations
function setupButtonAnimations() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            if (!btn.disabled) {
                btn.style.transform = 'translateY(-2px) scale(1.02)';
            }
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Create enhanced status messages
function createStatusMessage(type: 'success' | 'error' | 'info', message: string, icon?: string): string {
    const iconMap = {
        success: icon || '✅',
        error: icon || '❌',
        info: icon || 'ℹ️'
    };
    
    return `
        <div class="status-message ${type}">
            ${iconMap[type]} ${message}
        </div>
    `;
}

// Loading state helper
function setButtonLoading(button: HTMLElement, isLoading: boolean, loadingText: string, originalText: string) {
    if (isLoading) {
        button.innerHTML = `<span class="loading"><span class="spinner"></span> ${loadingText}</span>`;
        (button as HTMLButtonElement).disabled = true;
    } else {
        button.innerHTML = originalText;
        (button as HTMLButtonElement).disabled = false;
    }
}

// --- 1. CONNECT TO LACE WALLET ---
connectWalletBtn.addEventListener('click', async () => {
  if (!window.midnight) {
    proofResult.innerHTML = createStatusMessage('error', 'Lace Wallet not found. Please install the browser extension.');
    proofResult.classList.remove('hidden');
    return;
  }

  setButtonLoading(connectWalletBtn, true, 'Connecting...', '🔗 Connect Lace Wallet');

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
    
    // Enhanced wallet display
    walletAddress.textContent = address.slice(0, 20) + '...';
    walletInfo.classList.remove('hidden');
    connectWalletBtn.classList.add('hidden');
    mainContent.classList.remove('hidden');
    
    startScanner();

  } catch (error) {
    console.error(error);
    setButtonLoading(connectWalletBtn, false, '', '🔗 Connect Lace Wallet');
    proofResult.innerHTML = createStatusMessage('error', 'Wallet connection denied or failed.');
    proofResult.classList.remove('hidden');
  }
});

// --- 2. ATTENDEE: GENERATE PROOF ---
generateProofBtn.addEventListener('click', async () => {
  if (!contract || !walletApi || !birthdateInput.value) {
    proofResult.innerHTML = createStatusMessage('error', 'Please connect your wallet and select a birthdate.');
    proofResult.classList.remove('hidden');
    return;
  }

  const birthdate = new Date(birthdateInput.value);
  const birthdateTimestamp = BigInt(Math.floor(birthdate.getTime() / 1000));
  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

  setButtonLoading(generateProofBtn, true, 'Generating...', 'Generate & Submit Proof');
  
  proofResult.innerHTML = createStatusMessage('info', 'Preparing zero-knowledge proof transaction...', '<span class="spinner"></span>');
  proofResult.classList.remove('hidden');

  try {
    // This logic is now correct because `contract` is properly instantiated
    const unsignedTx = await contract.buildTx.verifyAge(birthdateTimestamp, currentTimestamp);

    // Update status
    proofResult.innerHTML = createStatusMessage('info', 'Please check your Lace wallet to sign the transaction...', '<span class="spinner"></span>');

    // This wallet interaction logic remains correct from the first round of fixes
    const balancedAndProvenTx = await walletApi.balanceAndProveTransaction(unsignedTx);
    const txId = await walletApi.submitTransaction(balancedAndProvenTx);

    // Success with QR code
    proofResult.innerHTML = `
      ${createStatusMessage('success', 'Proof generated successfully!')}
      <div style="text-align: center; margin-top: 1rem;">
        <div style="margin-bottom: 1rem; color: var(--text-secondary);">
          Transaction ID: ${txId.slice(0, 20)}...
        </div>
        <div class="qr-display">
          <div style="margin-bottom: 0.5rem; color: var(--text-primary);">Show this QR code to the venue:</div>
          <canvas id="qrCanvas"></canvas>
        </div>
      </div>
    `;
    
    const canvas = document.getElementById('qrCanvas') as HTMLCanvasElement;
    QRCode.toCanvas(canvas, txId);

  } catch (error: any) {
    console.error(error);
    proofResult.innerHTML = createStatusMessage('error', `Transaction failed: ${error.info || 'User rejected transaction'}`);
  } finally {
    setButtonLoading(generateProofBtn, false, '', 'Generate & Submit Proof');
  }
});

// --- 3. VENUE: VERIFY PROOF ---
// This function remains correct. NetworkProvider exposes the publicDataProvider.
function startScanner() {
    const html5QrCode = new Html5Qrcode("scanner");
    
    const qrCodeSuccessCallback = async (decodedText: string, decodedResult: any) => {
        html5QrCode.stop().catch(err => console.error("Failed to stop scanner", err));

        const txId = decodedText;
        verificationResult.innerHTML = createStatusMessage('info', `Scanned TX ID: ${txId.slice(0, 20)}...<br>Checking status on the blockchain...`, '<span class="spinner"></span>');

        if (!provider) {
            verificationResult.innerHTML = createStatusMessage('error', 'Provider not initialized.');
            return;
        }

        try {
            const txStatus = await provider.publicDataProvider.queryTransaction(txId);

            if (txStatus && txStatus.status === 'confirmed') {
                verificationResult.innerHTML = createStatusMessage('success', 'VERIFIED! Age proof confirmed. Access granted.');
            } else {
                verificationResult.innerHTML = createStatusMessage('error', 'VERIFICATION FAILED. Invalid or expired proof.');
            }
        } catch (error) {
            console.error('Verification error:', error);
            verificationResult.innerHTML = createStatusMessage('error', 'Failed to verify proof on blockchain.');
        }
    };
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined).catch(err => {
        console.error("Unable to start scanning.", err);
        scannerContainer.innerHTML = `
            <div style="
                width: 300px; 
                height: 300px; 
                background: linear-gradient(45deg, #1a1a2e, #16213e); 
                display: flex; 
                align-items: center; 
                justify-content: center;
                color: var(--text-secondary);
                font-size: 1.1rem;
                text-align: center;
                line-height: 1.6;
                border-radius: 15px;
            ">
                📱<br>Unable to access camera<br>
                <small style="opacity: 0.7;">Please enable camera permissions</small>
            </div>
        `;
    });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    setupButtonAnimations();
    
    // Set today as max date for birthdate input
    const today = new Date().toISOString().split('T')[0];
    birthdateInput.setAttribute('max', today);
    
    // Set a reasonable min date (100 years ago)
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 100);
    birthdateInput.setAttribute('min', minDate.toISOString().split('T')[0]);
});