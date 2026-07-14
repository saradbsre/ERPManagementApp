# PDF Search & Extract with Claude AI

## Setup Instructions

### 1. Get Claude API Key (FREE)

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Sign up or login
3. Go to **API Keys** section
4. Click **Create Key**
5. Copy the API key

### 2. Add to .env.local

Edit `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:5000/api/itasset
VITE_CLAUDE_API_KEY=sk-ant-your_actual_api_key_here
```

Replace `sk-ant-your_actual_api_key_here` with your actual Claude API key.

### 3. Features

✅ **PDF Upload**
- Drag and drop or click to select PDF files
- Validates PDF format

✅ **Dual Processing Methods**
- **Method 1:** Text extraction from PDF using PDF.js
- **Method 2:** Direct PDF to Claude (base64) - works for image-based PDFs

✅ **AI Data Extraction (Claude 3.5 Haiku)**
- Automatically extracts:
  - **Product Name** - Name of product/service
  - **Billing Address** - Complete billing address
  - **Cost** - Total amount/cost
  - **Currency** - Currency code (USD, AED, etc.)

✅ **Display Results**
- Color-coded information cards
- Summary statement
- Process another PDF option

## How to Use

1. Click **"Upload"** button on Payment Transactions page
2. Select or drag-drop a PDF invoice/receipt
3. Click **"Extract Data"**
4. Wait for Claude AI to process
5. View extracted information below

## Model Used

- **Model:** Claude 3.5 Haiku (Latest, Fast & Affordable)
- **Rate Limit:** 50,000 requests/day (free tier)
- **Cost:** FREE (with free tier credits)
- **Response Time:** ~1-2 seconds per PDF

## Supported PDF Types

- Invoices
- Receipts
- Billing documents
- Purchase orders
- Text-based PDFs
- Image-based PDFs (scanned documents)

## Processing Logic

1. **Tries text extraction first** (faster for text PDFs)
2. **Falls back to base64 method** (works for image PDFs)
3. **Sends to Claude 3.5 Haiku** for AI extraction
4. **Returns structured data** in JSON format

## API Key Formats

**Claude API Keys:**
- Start with: `sk-ant-`
- Example: `sk-ant-abc123...`

**Get your key:**
1. Visit: https://console.anthropic.com/account/keys
2. Create new API key
3. Copy and paste to `.env.local`

## Troubleshooting

**"Claude API key not configured"**
- Add `VITE_CLAUDE_API_KEY` to `.env.local`
- Key should start with `sk-ant-`
- Restart dev server: `npm run dev`

**"Invalid API key" error**
- Verify key is copied correctly
- Check key starts with `sk-ant-`
- Visit console to regenerate key if needed

**"Failed to extract data from PDF"**
- Ensure PDF is not corrupted
- Try with a smaller/cleaner PDF
- Check API key is valid and has credits

**Empty extracted fields**
- Claude couldn't find the field in PDF
- Try with different PDF format
- Ensure PDF has readable content

**"Rate limit exceeded"**
- Free tier: 50,000 requests/day
- Wait a moment and try again
- Consider upgrading if hitting limits

## Environment Variables

```env
VITE_API_URL=http://localhost:5000/api/itasset
VITE_CLAUDE_API_KEY=your_claude_api_key_here
```

Both are required for the app to function properly.

## Why Claude Over Others?

| Feature | Claude | Gemini | OpenAI |
|---------|--------|--------|--------|
| Free Tier | ✅ $5 credit/month | ❌ Limited | ✅ $5 credit/month |
| Rate Limit | ✅ 50k/day | ❌ 60/min | ✅ 100k/min (paid) |
| Document Support | ✅ Native PDF | ❌ Indirect | ✅ Yes |
| Cost | 💰 Affordable | 💰 Budget | 💰 Expensive |
| Accuracy | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

Claude is recommended for best balance of features, cost, and reliability.
