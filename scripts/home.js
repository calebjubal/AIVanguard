// ========== GROQ CLIENT UI ==========
let groqApiKey = null;
let currentImageFile = null;

const GROQ_STORAGE_KEY = 'groq_api_key';
const ANALYZE_PROMPT = 'Analyze this image and describe the visual design in plain English. Cover layout, colors, typography, spacing, components, and overall style. If it looks like a UI or website, explain what would be useful for recreating it with Tailwind CSS.';

function updateTokenStatus(message, status) {
    const statusEl = document.querySelector('.token-status');
    if (!statusEl) {
        return;
    }

    statusEl.textContent = message;

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

function updateResultsStatus(status, type = '') {
    const statusEl = document.querySelector('.results-status');
    if (!statusEl) {
        return;
    }

    statusEl.textContent = status;

    if (type === 'success') {
        statusEl.style.color = '#00ffff';
    } else if (type === 'error') {
        statusEl.style.color = '#ff006e';
    } else if (type === 'loading') {
        statusEl.style.color = '#ffbe0b';
    }
}

function displayResults(text) {
    const codeBlock = document.querySelector('.code-block') || document.getElementById('resultCode');
    if (codeBlock) {
        codeBlock.textContent = text;
    }
}

function loadGroqKey() {
    const savedKey = localStorage.getItem(GROQ_STORAGE_KEY);
    if (savedKey && tokenInput?.value === '') {
        tokenInput.value = savedKey;
    }
    groqApiKey = savedKey || null;
}

function saveGroqKey(key) {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
        localStorage.removeItem(GROQ_STORAGE_KEY);
        groqApiKey = null;
        updateTokenStatus('Using server Groq key', 'info');
        return false;
    }

    if (!trimmedKey.startsWith('gsk_')) {
        updateTokenStatus('Invalid format. Groq keys usually start with "gsk_"', 'error');
        return false;
    }

    groqApiKey = trimmedKey;
    localStorage.setItem(GROQ_STORAGE_KEY, trimmedKey);
    updateTokenStatus('Groq API key saved locally', 'success');
    return true;
}

// ========== FILE HANDLING ==========
async function compressImage(file) {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size <= MAX_SIZE) {
        return file;
    }

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
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
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

// ========== API KEY MANAGEMENT ==========
const tokenInput = document.getElementById('tokenInput');
const saveTokenBtn = document.getElementById('saveTokenBtn');

if (tokenInput) {
    tokenInput.addEventListener('focus', loadGroqKey);
}

if (saveTokenBtn) {
    saveTokenBtn.addEventListener('click', () => {
        const key = tokenInput?.value.trim() || '';
        saveGroqKey(key);
    });
}

function buildGroqKeyOverride() {
    const typedKey = tokenInput?.value.trim() || '';
    if (typedKey) {
        return typedKey;
    }

    return localStorage.getItem(GROQ_STORAGE_KEY) || '';
}

// ========== IMAGE ANALYSIS ==========
async function generateImageDescription(file) {
    try {
        updateResultsStatus('Sending image to Groq...', 'loading');

        const compressedFile = await compressImage(file);
        const formData = new FormData();
        formData.append('image', compressedFile, compressedFile.name || 'upload.jpg');
        formData.append('prompt', ANALYZE_PROMPT);

        const apiKeyOverride = buildGroqKeyOverride();
        if (apiKeyOverride) {
            formData.append('api_key', apiKeyOverride);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || `Request failed (${response.status})`);
        }

        const description = (data.description || '').trim();
        if (!description) {
            throw new Error('Empty response from Groq');
        }

        displayResults(description);
        updateResultsStatus('Analysis Complete', 'success');
    } catch (error) {
        console.error('Analysis error details:', error);

        let errorMsg = 'Analysis Failed:\n\n';

        if (error.name === 'AbortError') {
            errorMsg = 'Request timed out.\n\n-> Groq may be busy\n-> Try again in a minute';
        } else if (error.message?.includes('GROQ_API_KEY') || error.message?.includes('api key') || error.message?.includes('key')) {
            errorMsg = 'Invalid Groq API Key\n\n-> Check that it starts with gsk_\n-> Or set GROQ_API_KEY in .env';
        } else if (error.message?.includes('image type') || error.message?.includes('Unsupported image')) {
            errorMsg = 'Invalid Image Format\n\n-> Use PNG, JPG, or WebP\n-> Keep the file under 5MB if possible';
        } else if (error.message?.includes('busy') || error.message?.includes('rate') || error.message?.includes('503')) {
            errorMsg = 'Groq is Busy\n\n-> Wait a moment and try again\n-> Large requests can take longer';
        } else if (error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
            errorMsg = 'Network Error\n\n-> Check your internet connection\n-> Try refreshing the page';
        } else if (error.message?.includes('Empty response')) {
            errorMsg = 'Groq returned an empty response\n\n-> Try a different image\n-> Or run the request again';
        } else {
            errorMsg += error.message || 'Unknown error occurred';
        }

        displayResults(errorMsg);
        updateResultsStatus('Failed', 'error');
    }
}

// ========== OPTIONS PANEL ==========
const initializeBtn = document.getElementById('initializeBtn');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const optionsPanel = document.querySelector('.options-panel');

if (initializeBtn) {
    initializeBtn.addEventListener('click', () => {
        const key = tokenInput?.value.trim() || '';

        if (key) {
            const success = saveGroqKey(key);
            if (!success) {
                return;
            }
        } else if (groqApiKey) {
            updateTokenStatus('Groq API key loaded from local storage', 'success');
        } else {
            updateTokenStatus('Using server Groq key', 'info');
        }

        optionsPanel?.classList.add('active');
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
                copyBtn.textContent = 'Copied!';
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
    loadGroqKey();
    animateFeatureCards();

    const titleText = document.querySelector('.hero-title');
    if (titleText) {
        const text = titleText.textContent;
        titleText.innerHTML = '';
        [...text].forEach((char) => {
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
    backBtn.href = './index.html';
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

if (helpModal) {
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.remove('active');
        }
    });
}
