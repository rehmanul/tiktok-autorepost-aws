# Twitter OAuth Setup Instructions

## What You Need

Your Twitter API credentials are missing from the API service. Follow these steps:

### 1. Get Twitter API Credentials

Go to: https://developer.twitter.com/en/portal/dashboard

1. **Select your app** (or create one if you don't have it)
2. **Go to "Keys and tokens" tab**
3. **Copy these values:**
   - **API Key** (also called Consumer Key)
   - **API Secret** (also called Consumer Secret)

### 2. Add Environment Variables to Render

Go to your API service on Render: https://dashboard.render.com/

1. **Find your service:** `autorepost-api` (or similar name)
2. **Click "Environment" in left sidebar**
3. **Add these 3 environment variables:**

```
TWITTER_CONSUMER_KEY=<paste your API Key here>
TWITTER_CONSUMER_SECRET=<paste your API Secret here>
TWITTER_CALLBACK_URL=https://autorepost-api-l4oy.onrender.com/api/oauth/twitter/callback
```

4. **Click "Save Changes"** - This will trigger a redeploy (takes ~5 minutes)

### 3. Update Twitter Developer Portal

Make sure your Twitter app has the correct callback URL:

1. Go to your app settings
2. **Find "Callback URLs" or "Redirect URIs"**
3. **Add this URL:**
   ```
   https://autorepost-api-l4oy.onrender.com/api/oauth/twitter/callback
   ```
4. **Save settings**

### 4. Test Twitter Connection

After the API redeploys:
- Use the OAuth helper tool: `connect-all-oauth.html`
- Or go to your dashboard → Connections → Connect Twitter
- You should be redirected to Twitter to authorize
- After authorizing, you'll be redirected back with success

---

## Current Status

✅ API Key and Secret: **NEEDED** (get from Twitter Developer Portal)
✅ Callback URL configured: **NEEDED** (add to Twitter app settings)
✅ Environment variables: **NEEDED** (add to Render)

Once these are added, Twitter OAuth will work seamlessly!
