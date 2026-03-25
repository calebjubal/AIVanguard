# WINDIFY - Gemini API Setup Guide

## ✅ Features Implemented

Your Tailwind CSS generator now has:
- ✓ **Image Upload** - Click, drag & drop, or paste from clipboard
- ✓ **Gemini API Integration** - AI-powered CSS generation from images
- ✓ **Generate Options**:
  - Responsive design
  - Dark mode support
  - Animations
  - Code optimization
- ✓ **Real-time Feedback** - Loading states and notifications
- ✓ **Copy to Clipboard** - Instant code copying
- ✓ **Smooth Animations** - Professional UI feedback

---

## 🔑 Setting Up Your API Key

### Option 1: First Time Use (Recommended)
1. Click "START GENERATING" button
2. Upload your design image
3. Click "Confirm & Generate"
4. When prompted, paste your **Gemini API Key**
5. The key will be saved securely in your browser

### Option 2: Enter API Key in Code
In `scripts/home.js`, replace this line:
```javascript
const GEMINI_API_KEY = localStorage.getItem('gemini_api_key') || window.GEMINI_API_KEY;
```

With:
```javascript
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
```

### Option 3: Environment Variable
Set it in your deployment environment:
```bash
GEMINI_API_KEY=your_key_here
```

---

## 🎯 How to Use

1. **Upload an Image**
   - Click the upload area
   - Drag & drop a screenshot
   - Or paste (Ctrl+V or Cmd+V)

2. **Select Options**
   - Click "START GENERATING"
   - Choose your preferences
   - Click "Confirm & Generate"

3. **Get Your CSS**
   - Wait for AI to generate
   - Click "Copy CSS" to copy code
   - Paste into your project

---

## ⚙️ Getting Your Gemini API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the generated key
4. Use it in WINDIFY

---

## 🐛 Troubleshooting

**"API key is not set"**
- Make sure you entered your key correctly
- Check it doesn't have extra spaces
- Generate a new key from Google AI Studio

**"Not generating code"**
- Try a clearer, simpler image
- Ensure image is not too complex
- Wait longer (can take 30+ seconds)

**"Generation failed"**
- Check console (F12) for error details
- Verify API key is valid
- Try a different image

---

## 📝 Notes

- API keys are stored in browser localStorage (local device only)
- Never share your API key publicly
- Each generation uses API credits
- Check Google's pricing: https://ai.google.dev/pricing

---

**✨ Ready to generate? Upload an image and see the magic!**
