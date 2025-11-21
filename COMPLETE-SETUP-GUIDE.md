# 🚀 Complete Setup Guide - Get All OAuth Working

**Your credentials:**
- Email: justin@justinkratz.com
- Password: Justin123456
- Admin account is already created ✅

**Your services:**
- API: https://autorepost-api-l4oy.onrender.com
- Web Dashboard: https://autorepost-web.onrender.com

---

## 🎯 Quick Action Plan

Follow these steps IN ORDER to get everything connected:

### ✅ STEP 1: Test the TikTok Form (2 minutes)

The Web deployment just completed. The TikTok textarea should now be visible!

**Do this:**
1. **Hard refresh your browser:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Go to:** https://autorepost-web.onrender.com
3. **Login** with justin@justinkratz.com / Justin123456
4. **Click Connections → Connect TikTok**
5. **Look for the textarea box** that says "Browser Cookies (JSON)"

**If you STILL don't see the textarea:**
- Open in Incognito/Private mode
- Or use the backup tool: `connect-all-oauth.html` (see Step 5 below)

---

### 🔧 STEP 2: Configure Twitter OAuth (10 minutes)

**Status:** ❌ Missing credentials - OAuth will fail until you add these

1. **Get Twitter API credentials:**
   - Go to: https://developer.twitter.com/en/portal/dashboard
   - Select your app (or create one)
   - Go to "Keys and tokens" tab
   - Copy your **API Key** and **API Secret**

2. **Update Twitter app settings:**
   - In your Twitter app settings
   - Add callback URL:
     ```
     https://autorepost-api-l4oy.onrender.com/api/oauth/twitter/callback
     ```
   - Save settings

3. **Add environment variables to Render:**
   - Go to: https://dashboard.render.com/
   - Find your `autorepost-api` service
   - Click "Environment" in sidebar
   - Add these 3 variables:
     ```
     TWITTER_CONSUMER_KEY=<your API Key>
     TWITTER_CONSUMER_SECRET=<your API Secret>
     TWITTER_CALLBACK_URL=https://autorepost-api-l4oy.onrender.com/api/oauth/twitter/callback
     ```
   - Click "Save Changes" (this will redeploy, takes ~5 min)

📄 **Detailed guide:** `twitter-oauth-setup-instructions.md`

---

### 🔧 STEP 3: Configure Instagram OAuth (15 minutes)

**Status:** ❌ App not configured - showing "Invalid platform app" error

1. **Go to Facebook Developer Portal:**
   - URL: https://developers.facebook.com/apps/
   - Select your app (or create one)

2. **Add Instagram Basic Display product:**
   - Click "Add Product" in sidebar
   - Find "Instagram Basic Display"
   - Click "Set Up"

3. **Configure settings:**
   - Go to Instagram Basic Display → Settings
   - Add OAuth Redirect URI:
     ```
     https://autorepost-api-l4oy.onrender.com/api/oauth/instagram/callback
     ```
   - Add Deauthorize and Data Deletion URLs (same as above)
   - Save changes

4. **Get credentials:**
   - Copy **Instagram App ID** and **Instagram App Secret**

5. **Verify environment variables on Render:**
   - Your API service should have:
     ```
     INSTAGRAM_CLIENT_ID=<your App ID>
     INSTAGRAM_CLIENT_SECRET=<your App Secret>
     INSTAGRAM_CALLBACK_URL=https://autorepost-api-l4oy.onrender.com/api/oauth/instagram/callback
     ```
   - Add them if missing, then save (redeploys)

6. **Switch app to Live mode OR add test users:**
   - Option A: Switch toggle to "Live" (may require verification)
   - Option B: Add justin@justinkratz.com as test user in Roles

📄 **Detailed guide:** `instagram-oauth-setup-instructions.md`

---

### ✅ STEP 4: Verify YouTube OAuth (5 minutes)

**Status:** ✅ Working, but shows Google verification warning

YouTube OAuth is already configured and working! You'll just see a warning screen.

**To test:**
1. Click "Connect YouTube"
2. You'll see "This app hasn't been verified by Google"
3. Click "Advanced" → "Go to [App Name] (unsafe)"
4. Authorize → Success!

**Optional - Remove warning for yourself:**
- Go to: https://console.cloud.google.com/
- APIs & Services → OAuth consent screen
- Scroll to "Test users"
- Add: justin@justinkratz.com
- Save

📄 **Detailed guide:** `youtube-oauth-setup-instructions.md`

---

### 🎵 STEP 5: Connect TikTok (5 minutes)

**Two ways to connect TikTok:**

#### Method A: Use the Dashboard (if textarea is visible)

1. Go to https://www.tiktok.com and login
2. Install Cookie Editor: https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm
3. Click extension → Export → Copy JSON
4. Go to your dashboard → Connections → Connect TikTok
5. Paste JSON in textarea
6. Enter your TikTok handle: @rehmanuls
7. Click Connect

#### Method B: Use the Backup Tool (if textarea still not visible)

1. **Open this file in your browser:**
   ```
   C:\Users\HP\Desktop\tiktok-youtube-dashboard\connect-all-oauth.html
   ```
   (Just double-click it or drag into browser)

2. **Click "🔐 Login Now"** - auto-logs you in

3. **Get TikTok cookies** (same as Method A, steps 1-3)

4. **Paste in the textarea** and enter @rehmanuls

5. **Click "🎵 Connect TikTok"**

6. **Watch the output log** for success message

---

## 📋 Quick Status Checklist

After completing all steps, here's what should work:

- ✅ **YouTube OAuth:** Working (shows warning, but functional)
- ⚠️ **Twitter OAuth:** Needs credentials added (Step 2)
- ⚠️ **Instagram OAuth:** Needs app configured (Step 3)
- ⚠️ **TikTok:** Should work once textarea is visible (Step 1) or use backup tool (Step 5)

---

## 🛠️ Backup Tool: `connect-all-oauth.html`

If you have ANY issues with the dashboard UI, use this standalone tool:

**Location:** `C:\Users\HP\Desktop\tiktok-youtube-dashboard\connect-all-oauth.html`

**How to use:**
1. Double-click the file to open in browser
2. Click "🔐 Login Now"
3. Click each OAuth button (YouTube, Instagram, Twitter)
4. For TikTok: Paste cookies and click Connect
5. All connections happen via direct API calls
6. Watch logs for success/error messages

This bypasses the dashboard completely and works even if the UI has issues!

---

## 🆘 Need Help?

If something doesn't work:

1. **Check service logs on Render:**
   - Go to https://dashboard.render.com/
   - Click on your service
   - View "Logs" tab

2. **Check browser console:**
   - Press F12
   - Look for errors in Console tab

3. **Verify environment variables:**
   - All OAuth platforms need their credentials in Render
   - Check the detailed guides for each platform

4. **Use the backup tool:**
   - `connect-all-oauth.html` provides detailed error messages
   - Logs show exactly what's failing

---

## 🎉 Expected Timeline

- **Twitter:** 10 minutes (get keys, add to Render, wait for redeploy)
- **Instagram:** 15 minutes (configure Facebook app, add credentials)
- **YouTube:** Already working! ✅
- **TikTok:** 5 minutes (get cookies, connect via form or tool)

**Total time:** ~30 minutes to get all 4 platforms connected!

---

## 📚 Reference Files

All detailed setup guides are in your project folder:

- `twitter-oauth-setup-instructions.md` - Twitter API setup
- `instagram-oauth-setup-instructions.md` - Instagram/Facebook app setup
- `youtube-oauth-setup-instructions.md` - YouTube verification info
- `connect-all-oauth.html` - Backup connection tool

Start with Step 1 (test TikTok form) and work your way through! 🚀
