# YouTube OAuth Setup Instructions

## Current Issue

YouTube OAuth is working BUT showing: **"This app hasn't been verified by Google"** warning screen.

This is normal for apps in development/testing mode. Users can still authorize by clicking "Advanced" → "Go to [App Name] (unsafe)".

## How to Remove the Warning (Optional)

You have two options:

### Option 1: Add Test Users (Quick - Recommended for Development)

1. **Go to Google Cloud Console**
   - URL: https://console.cloud.google.com/

2. **Select your project**

3. **Go to "APIs & Services" → "OAuth consent screen"**

4. **Scroll down to "Test users"**

5. **Click "Add Users"**

6. **Add your email:**
   ```
   justin@justinkratz.com
   ```

7. **Click "Save"**

Now when YOU authorize, you won't see the warning. Other users will still see it until you verify the app.

### Option 2: Verify Your App (Production - Takes Time)

This requires Google's approval and can take weeks:

1. **Go to OAuth consent screen**
2. **Fill out all required information:**
   - App name
   - User support email
   - Developer contact email
   - App logo
   - App homepage
   - Privacy policy URL
   - Terms of service URL
3. **Submit for verification**
4. **Wait for Google to review** (can take 1-4 weeks)

**Note:** Only do this when you're ready for production!

## Verify YouTube OAuth is Configured Correctly

Make sure you have these settings in Google Cloud Console:

### 1. OAuth 2.0 Client ID Settings

**Go to:** APIs & Services → Credentials → Your OAuth 2.0 Client ID

**Authorized redirect URIs** should include:
```
https://autorepost-api-l4oy.onrender.com/api/oauth/youtube/callback
```

### 2. Enable YouTube Data API v3

**Go to:** APIs & Services → Library

**Search for:** "YouTube Data API v3"

**Status:** Should be **ENABLED**

If not enabled:
1. Click on it
2. Click "Enable"

### 3. Verify Environment Variables on Render

Your API service should have these set:

```
YOUTUBE_CLIENT_ID=<your Google OAuth client ID>
YOUTUBE_CLIENT_SECRET=<your Google OAuth client secret>
YOUTUBE_CALLBACK_URL=https://autorepost-api-l4oy.onrender.com/api/oauth/youtube/callback
```

## Test YouTube OAuth

YouTube OAuth should already be working! Even with the warning:

1. **Use the OAuth helper tool** or go to dashboard
2. **Click "Connect YouTube"**
3. **You'll see the Google warning screen**
4. **Click "Advanced"** (at bottom)
5. **Click "Go to [App Name] (unsafe)"**
6. **Authorize the permissions**
7. **You'll be redirected back with success!**

## Current Status

✅ YouTube OAuth configured: **WORKING** (with warning)
⚠️ Google verification warning: **NORMAL** (can be hidden for test users)
✅ API enabled: **CHECK** (verify YouTube Data API v3 is enabled)

YouTube OAuth is functional! The warning is cosmetic and only affects user experience, not functionality.
