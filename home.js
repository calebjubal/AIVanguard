// ========== HUGGING FACE INITIALIZATION ==========
let apiToken = null;
let currentImageFile = null;

function validateAndSaveToken(token) {
    try {
        // Validate token format
        if (!token || token.trim().length === 0) {
            updateTokenStatus('✗ Token is empty. Please paste your token', 'error');
            console.error('Token is empty');
            return false;
        }

        if (!token.startsWith('hf_')) {
            updateTokenStatus('✗ Invalid format. Token must start with "hf_"', 'error');
            console.error('Token format invalid. Must start with hf_');
            return false;
        }

        apiToken = token.trim();
        updateTokenStatus('✓ Connected to Hugging Face', 'success');
        console.log('✓ Token validated and saved');
        return true;
    } catch (error) {
        console.error('Validation error:', error);
        updateTokenStatus('✗ Token validation failed', 'error');
        return false;
    }
}

// ========== FILE HANDLING ==========
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
    });
}

async function compressImage(file) {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size <= MAX_SIZE) return file;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const maxDimension = 1200;
                if (width > height && width > maxDimension) {
                    height = Math.round(height * (maxDimension / width));
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width = Math.round(width * (maxDimension / height));
                    height = maxDimension;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', 0.8);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ========== IMAGE UPLOAD ==========
const uploadZone = document.querySelector('.upload-drop-zone');
const fileInput = document.getElementById('fileInput');

if (uploadZone) {
    uploadZone.addEventListener('click', () => fileInput?.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.background = 'rgba(0, 255, 255, 0.15)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.background = '';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.background = '';
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileSelect(files[0]);
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
    });
}

function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    currentImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.querySelector('.upload-preview');
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}

// ========== TOKEN MANAGEMENT ==========
const tokenInput = document.getElementById('tokenInput');
const saveTokenBtn = document.getElementById('saveTokenBtn');

if (tokenInput) {
    tokenInput.addEventListener('focus', loadToken);
}

if (saveTokenBtn) {
    saveTokenBtn.addEventListener('click', () => {
        const token = tokenInput?.value.trim();
        if (token) {
            localStorage.setItem('hf_api_token', token);
            updateTokenStatus('✓ Token Saved Successfully!', 'success');
            setTimeout(() => {
                updateTokenStatus('', '');
            }, 2000);
        } else {
            updateTokenStatus('✗ Please enter a token first', 'error');
        }
    });
}

function loadToken() {
    const token = localStorage.getItem('hf_api_token');
    if (token && tokenInput?.value === '') {
        tokenInput.value = token;
    }
}

function updateTokenStatus(message, status) {
    const statusEl = document.querySelector('.token-status');
    if (statusEl) {
        statusEl.textContent = message;
        // Apply different colors for different statuses
        if (status === 'success') {
            statusEl.style.color = '#00ffff';
        } else if (status === 'error') {
            statusEl.style.color = '#ff006e';
        } else if (status === 'info') {
            statusEl.style.color = '#ffbe0b';
        } else {
            statusEl.style.color = '#b0b0ff';
        }
    }
}

// ========== IMAGE ANALYSIS ==========
async function generateImageDescription(file) {
    if (!apiToken) {
        alert('❌ Please SAVE your token first!');
        return;
    }

    try {
        updateResultsStatus('🔄 Connecting to AI...', 'loading');

        // Compress image if needed
        const compressedFile = await compressImage(file);
        const base64Data = await fileToBase64(compressedFile);

        updateResultsStatus('🔄 Analyzing with AI Vision...', 'loading');
        console.log('Sending request to Hugging Face API...');

        // Set a timeout of 60 seconds
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        // Try primary model first (faster)
        let modelEndpoint = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large';
        
        let response = await fetch(modelEndpoint, {
            headers: { Authorization: `Bearer ${apiToken}` },
            method: 'POST',
            body: JSON.stringify({ 
                inputs: base64Data
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', errorData);
            
            if (response.status === 401) {
                throw new Error('❌ Invalid Token - Check if token is correct');
            } else if (response.status === 503) {
                throw new Error('⏳ Model is loading (first time use takes 1-5 mins). Please wait and try again in 2 minutes');
            } else if (response.status === 429) {
                throw new Error('⏳ API is busy. Please wait 1 minute and try again');
            } else if (response.status === 400) {
                throw new Error('❌ Invalid image format. Try PNG, JPG, or WebP');
            } else {
                throw new Error(`API Error ${response.status}`);
            }
        }

        const result = await response.json();
        console.log('API Response:', result);

        let description = '';
        
        // Handle different response formats
        if (Array.isArray(result) && result.length > 0) {
            if (result[0]?.generated_text) {
                description = result[0].generated_text;
            } else if (typeof result[0] === 'string') {
                description = result[0];
            } else if (result[0].error) {
                throw new Error(result[0].error);
            }
        } else if (result.generated_text) {
            description = result.generated_text;
        } else if (result[0]?.error) {
            throw new Error(result[0].error);
        } else if (typeof result === 'string') {
            description = result;
        } else {
            description = JSON.stringify(result);
        }

        if (!description || description.trim().length === 0) {
            throw new Error('❌ Empty response from API. Please try with different image');
        }

        // Clean up the response
        if (description.startsWith('<|image_1|>')) {
            description = description.replace('<|image_1|>', '').trim();
        }

        displayResults(description);
        updateResultsStatus('✓ Analysis Complete', 'success');
    } catch (error) {
        console.error('Analysis error details:', error);
        
        let errorMsg = '❌ Analysis Failed:\n\n';

        if (error.name === 'AbortError') {
            errorMsg = '⏱️ Request Timeout (over 60 seconds)\n\n→ Model might be loading\n→ This can take 1-5 mins on first use\n→ Try again in 2 minutes';
        } else if (error.message?.includes('Invalid Token')) {
            errorMsg = '❌ Invalid API Token\n\n→ Token check karke naya token generate karo\n→ https://huggingface.co/settings/tokens';
        } else if (error.message?.includes('Invalid image')) {
            errorMsg = '❌ Invalid Image Format\n\n→ PNG, JPG, ya WebP use karo\n→ Size 5MB se kam hona chahiye';
        } else if (error.message?.includes('loading') || error.message?.includes('503')) {
            errorMsg = '⏳ Model Loading Ho Raha Hai\n\n→ Pehli baar use karte time models load hote hain\n→ 2-5 minutes wait karo\n→ Phir dobara try karo\n\nYe ek-ek baar load hote hain, baad mein fast hoga!';
        } else if (error.message?.includes('busy') || error.message?.includes('429')) {
            errorMsg = '🚦 API Overloaded\n\n→ Bahut log use kar rahe hain\n→ 1 minute wait karo\n→ Dobara try karo';
        } else if (error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
            errorMsg = '🌐 Network Error\n\n→ Internet connection check karo\n→ VPN on hai to band karo\n→ Page refresh karo (F5)';
        } else {
            errorMsg += error.message || 'Unknown error occurred';
        }

        displayResults(errorMsg);
        updateResultsStatus('✗ Failed', 'error');
    }
}

function updateResultsStatus(status, type = '') {
    const statusEl = document.querySelector('.results-status');
    if (statusEl) {
        statusEl.textContent = status;
        if (type === 'success') {
            statusEl.style.color = '#00ffff';
        } else if (type === 'error') {
            statusEl.style.color = '#ff006e';
        } else if (type === 'loading') {
            statusEl.style.color = '#ffbe0b';
        }
    }
}

function displayResults(text) {
    const codeBlock = document.querySelector('.code-block') || document.getElementById('resultCode');
    if (codeBlock) {
        codeBlock.textContent = text;
    }
}

// ========== OPTIONS PANEL ==========
const initializeBtn = document.getElementById('initializeBtn');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const optionsPanel = document.querySelector('.options-panel');

if (initializeBtn) {
    initializeBtn.addEventListener('click', async () => {
        const token = tokenInput?.value.trim();
        if (!token) {
            alert('Please enter a Hugging Face API token');
            return;
        }

        const success = validateAndSaveToken(token);
        if (success) {
            optionsPanel?.classList.add('active');
        }
    });
}

if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
        if (!currentImageFile) {
            alert('Please upload an image first');
            return;
        }

        optionsPanel?.classList.remove('active');
        await generateImageDescription(currentImageFile);
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        optionsPanel?.classList.remove('active');
    });
}

// ========== COPY RESULTS ==========
const copyBtn = document.getElementById('copyBtn');

if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
        const codeBlock = document.querySelector('.code-block') || document.getElementById('resultCode');
        if (codeBlock?.textContent) {
            try {
                await navigator.clipboard.writeText(codeBlock.textContent);
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✓ Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            } catch {
                alert('Failed to copy to clipboard');
            }
        }
    });
}

// ========== FEATURE CARDS ANIMATION ==========
function animateFeatureCards() {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.animation = 'fadeInUp 0.6s ease-out forwards';
        }, index * 100);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadToken();
    animateFeatureCards();

    // Animate title characters
    const titleText = document.querySelector('.hero-title');
    if (titleText) {
        const text = titleText.textContent;
        titleText.innerHTML = '';
        [...text].forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'title-char';
            span.textContent = char;
            titleText.appendChild(span);
        });
    }
});

// ========== BACK BUTTON ==========
const backBtn = document.querySelector('.back-btn');
if (backBtn) {
    backBtn.href = 'index.html';
}

// ========== HELP MODAL ==========
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpCloseBtn = document.getElementById('helpCloseBtn');
const helpOkBtn = document.getElementById('helpOkBtn');

if (helpBtn) {
    helpBtn.addEventListener('click', () => {
        helpModal?.classList.add('active');
    });
}

if (helpCloseBtn) {
    helpCloseBtn.addEventListener('click', () => {
        helpModal?.classList.remove('active');
    });
}

if (helpOkBtn) {
    helpOkBtn.addEventListener('click', () => {
        helpModal?.classList.remove('active');
    });
}

// Close help modal when clicking outside
if (helpModal) {
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('active');
        }
    });
}
