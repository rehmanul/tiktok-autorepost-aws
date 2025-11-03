# OAuth Setup Guide

## Overview
The auto-posting system uses OAuth 2.0 for Instagram/YouTube and OAuth 1.0a for Twitter to securely connect user accounts.

## 1. Instagram/Facebook OAuth Setup

### Create Facebook App
1. Go to https://developers.facebook.com/apps
2. Click "Create App" → Choose "Business" type
3. Add "Instagram Basic Display" and "Instagram Content Publishing" products
4. Configure OAuth settings:
   - **Valid OAuth Redirect URIs**: `http://localhost:4000/oauth/instagram/callback`
   - **Deauthorize Callback URL**: `http://localhost:4000/oauth/instagram/deauth`

### Required Permissions
- `instagram_basic` - Read profile info
- `instagram_content_publish` - Post content
- `pages_read_engagement` - Access Facebook Pages (for business accounts)

### Environment Variables
```bash
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_REDIRECT_URI=http://localhost:4000/oauth/instagram/callback
```

### Testing
```bash
# Start OAuth flow
curl "http://localhost:4000/oauth/instagram/start?tenantId=test-tenant&userId=test-user"
# Returns: { "authUrl": "https://api.instagram.com/oauth/authorize?...", "state": "..." }

# User clicks authUrl, authorizes, redirected to callback
# Connection automatically created
```

---

## 2. YouTube/Google OAuth Setup

### Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable "YouTube Data API v3"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:4000/oauth/youtube/callback`

### Required Scopes
- `https://www.googleapis.com/auth/youtube.upload` - Upload videos
- `https://www.googleapis.com/auth/youtube.readonly` - Read channel info
- `https://www.googleapis.com/auth/youtube.force-ssl` - Manage YouTube account

### Environment Variables
```bash
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:4000/oauth/youtube/callback
```

### Testing
```bash
# Start OAuth flow
curl "http://localhost:4000/oauth/youtube/start?tenantId=test-tenant&userId=test-user"
# User authorizes → redirected → connection created with refresh token
```

---

## 3. Twitter OAuth 1.0a Setup

### Create Twitter App
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create new project and app
3. Enable OAuth 1.0a in app settings
4. Configure:
   - **Callback URL**: `http://localhost:4000/oauth/twitter/callback`
   - **App permissions**: Read and Write

### Required Permissions
- `tweet.read` - Read tweets
- `tweet.write` - Create tweets
- `users.read` - Read user profile

### Environment Variables
```bash
TWITTER_CONSUMER_KEY=your_consumer_key_here
TWITTER_CONSUMER_SECRET=your_consumer_secret_here
TWITTER_CALLBACK_URL=http://localhost:4000/oauth/twitter/callback
```

### Testing
```bash
# Start OAuth flow
curl "http://localhost:4000/oauth/twitter/start?tenantId=test-tenant&userId=test-user"
# 3-legged flow: request token → user authorizes → access token
```

---

## 4. TikTok Cookie-Based Authentication

### Why Cookies?
TikTok doesn't provide OAuth API for content creators. We use browser cookies for API access.

### How to Get Cookies
1. Login to TikTok in Chrome/Firefox
2. Install "Cookie Editor" extension
3. Export cookies as JSON
4. Copy the JSON array

### Connect TikTok Account
```bash
POST http://localhost:4000/oauth/tiktok/connect
Content-Type: application/json

{
  "tenantId": "test-tenant",
  "userId": "test-user",
  "accountHandle": "@yourhandle",
  "cookies": "[{\"name\":\"sessionid\",\"value\":\"...\"}]"
}
```

---

## Security Notes

1. **Token Encryption**: All access/refresh tokens encrypted with AES-256-GCM before storage
2. **State Validation**: OAuth state tokens stored in Redis with 10-minute expiry
3. **HTTPS Required**: In production, use HTTPS for all callback URLs
4. **Scope Minimization**: Only request necessary permissions

---

## Production Deployment

### Update Redirect URIs
```bash
# Instagram
FACEBOOK_REDIRECT_URI=https://your-domain.com/oauth/instagram/callback

# YouTube
GOOGLE_REDIRECT_URI=https://your-domain.com/oauth/youtube/callback

# Twitter
TWITTER_CALLBACK_URL=https://your-domain.com/oauth/twitter/callback

# Web app URL
WEB_APP_URL=https://your-domain.com
```

### Verify OAuth Apps
- Instagram: Add production domain to Facebook App settings
- YouTube: Add to Google Cloud Console authorized URIs
- Twitter: Update Twitter Developer Portal callback URLs
