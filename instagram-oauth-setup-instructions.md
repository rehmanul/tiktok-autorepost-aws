# Instagram OAuth Setup Instructions

## Current Issue

Instagram OAuth is showing: **"Invalid Request: Request parameters are invalid: Invalid platform app"**

This happens because your Facebook app is not properly configured for Instagram.

## Steps to Fix

### 1. Go to Facebook Developer Portal

URL: https://developers.facebook.com/apps/

### 2. Select Your App

Find and click on your app (or create one if you don't have it).

### 3. Add Instagram Basic Display Product

1. **In the left sidebar**, click **"Add Product"** or **"Products"**
2. **Find "Instagram Basic Display"**
3. **Click "Set Up"** or "Configure"
4. **Create an Instagram App** if prompted

### 4. Configure Instagram Basic Display Settings

1. **Go to Instagram Basic Display → Settings**
2. **Add OAuth Redirect URIs:**
   ```
   https://autorepost-api-l4oy.onrender.com/api/oauth/instagram/callback
   ```
3. **Add Deauthorize Callback URL:**
   ```
   https://autorepost-api-l4oy.onrender.com/api/oauth/instagram/deauth
   ```
4. **Add Data Deletion Request URL:**
   ```
   https://autorepost-api-l4oy.onrender.com/api/oauth/instagram/delete
   ```
5. **Click "Save Changes"**

### 5. Get Your Instagram App Credentials

1. **Stay on Instagram Basic Display → Settings**
2. **Copy these values:**
   - **Instagram App ID**
   - **Instagram App Secret**

### 6. Add Environment Variables to Render (if not already added)

Go to your API service on Render and add:

```
INSTAGRAM_CLIENT_ID=<paste Instagram App ID>
INSTAGRAM_CLIENT_SECRET=<paste Instagram App Secret>
INSTAGRAM_CALLBACK_URL=https://autorepost-api-l4oy.onrender.com/api/oauth/instagram/callback
```

### 7. Switch App to Live Mode (Important!)

1. **In your Facebook app dashboard**
2. **Look for the toggle switch** at the top that says "Development" or "Live"
3. **Switch it to "Live" mode**
4. **You may need to provide business verification** (this can take time, but you can test in Development mode first)

### 8. Add Test Users (for Development Mode)

If your app is still in Development mode:

1. **Go to Roles → Roles**
2. **Add yourself as a Test User**
3. **Connect your Instagram account to this test user**

## Alternative: Use Instagram Graph API (Recommended for Production)

Instagram Basic Display is being deprecated. For production, you should use **Instagram Graph API** instead:

1. **Add "Instagram" product** (not Basic Display)
2. **Configure as a Business account**
3. **Get user_media permission**

This requires:
- Instagram Business or Creator account
- Facebook Page linked to Instagram

## Current Status

❌ Instagram Basic Display configured: **NEEDED**
❌ App in Live mode: **NEEDED** (or add test users)
⚠️ Environment variables: **CHECK** (verify in Render)

Once configured, Instagram OAuth will work!
