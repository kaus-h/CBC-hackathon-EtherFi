# Railway.app Deployment Guide - EtherFi Anomaly Detection System

**Complete End-to-End Deployment Guide**

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] GitHub account (free)
- [ ] Railway.app account (sign up at https://railway.app)
- [ ] This project pushed to GitHub
- [ ] All API keys ready:
  - ANTHROPIC_API_KEY
  - ALCHEMY_API_KEY
  - ETHERSCAN_API_KEY (optional)
  - TWITTER_API_KEY (optional)

---

## 🚀 Part 1: Prepare Your GitHub Repository

### Step 1: Push Your Code to GitHub

If you haven't already:

```bash
cd /home/user/CBC-hackathon-EtherFi

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Railway deployment"

# Create GitHub repo and push
# (Follow GitHub's instructions to create a new repo)
git remote add origin https://github.com/YOUR_USERNAME/CBC-hackathon-EtherFi.git
git branch -M main
git push -u origin main
```

### Step 2: Verify Repository Contents

Make sure your repo has these files:
- ✅ `railway.json` (root)
- ✅ `nixpacks.toml` (root)
- ✅ `backend/package.json`
- ✅ `backend/src/api/server.js`
- ✅ `backend/src/database/schema.sql`
- ✅ `backend/scripts/railway-db-init.js`
- ✅ `frontend/package.json`
- ✅ `frontend/dist/` (will be built by Railway)

---

## 🎯 Part 2: Deploy to Railway

### Step 1: Create New Project

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your `CBC-hackathon-EtherFi` repository

### Step 2: Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Railway will provision a PostgreSQL database (takes ~30 seconds)
5. Click on the PostgreSQL service
6. Go to **"Variables"** tab
7. Copy the `DATABASE_URL` value (you'll need this)

### Step 3: Configure Your Application Service

1. Click on your application service (should be auto-created from GitHub)
2. Go to **"Settings"** tab

#### Configure Root Directory (IMPORTANT!)
- Set **Root Directory**: Leave as `/` (root)
- Railway will use `nixpacks.toml` for build configuration

#### Configure Build Command
- Railway will auto-detect based on `nixpacks.toml`
- No manual configuration needed

#### Configure Start Command
- Railway will use: `cd backend && NODE_ENV=production npm start`
- This is defined in `railway.json`

### Step 4: Add Environment Variables

1. Still in your app service, go to **"Variables"** tab
2. Click **"+ New Variable"**
3. Add each variable one by one:

**Required Variables:**
```
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
ANTHROPIC_API_KEY=your_anthropic_key_here
ALCHEMY_API_KEY=your_alchemy_key_here
```

**Optional Variables:**
```
ETHERSCAN_API_KEY=your_etherscan_key_here
TWITTER_API_KEY=your_twitter_key_here
```

**Important Notes:**
- For `DATABASE_URL`, Railway has a special syntax
- Click **"+ New Variable"**, select **"Reference"**, choose your Postgres service, select `DATABASE_URL`
- This ensures your app always uses the correct database URL

### Step 5: Generate Domain

1. Go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. Railway will give you a URL like: `your-app.up.railway.app`
5. **Save this URL** - this is your production URL!

---

## 🗄️ Part 3: Initialize Database

### Option A: Automatic Initialization (Recommended)

The database will be automatically initialized on first deployment because of our setup script.

To verify:
1. Go to your app service in Railway
2. Click **"Deployments"** tab
3. Click on the latest deployment
4. Click **"View Logs"**
5. Look for messages like:
   ```
   🚀 Railway Database Initialization Starting...
   ✅ Connected to Railway PostgreSQL
   📋 Creating database tables...
   ✅ Database schema created successfully
   ```

### Option B: Manual Initialization

If automatic initialization fails:

1. Go to your PostgreSQL service in Railway
2. Click **"Data"** tab
3. Click **"Query"**
4. Copy the entire contents of `backend/src/database/schema.sql`
5. Paste into the query editor
6. Click **"Execute"**

---

## 🔄 Part 4: Deploy and Monitor

### Trigger Deployment

Railway automatically deploys when you push to GitHub. To manually trigger:

1. Go to **"Deployments"** tab
2. Click **"Deploy"**
3. Wait for build to complete (~2-5 minutes)

### Monitor Deployment Status

**Build Phase** (2-3 minutes):
```
→ Installing dependencies
→ Building frontend
→ Preparing backend
```

**Deploy Phase** (30 seconds):
```
→ Starting application
→ Initializing database
→ Server running on port 3001
```

**Check Logs:**
1. Click on your deployment
2. Click **"View Logs"**
3. Look for:
   ```
   ========================================
   EtherFi Anomaly Detection API Server
   ========================================
   Server running on port 3001
   Environment: production
   ```

---

## ✅ Part 5: Verify Deployment

### Test 1: Check Health Endpoint

Open your browser or use curl:
```bash
curl https://your-app.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T...",
  "collectors": {...}
}
```

### Test 2: Check Frontend

Visit: `https://your-app.up.railway.app`

You should see:
- ✅ EtherFi Anomaly Detection dashboard
- ✅ Live metrics panel
- ✅ "Connected" indicator (green dot)
- ✅ System status banner

### Test 3: Check API Endpoints

```bash
# Current metrics
curl https://your-app.up.railway.app/api/metrics/current

# Recent anomalies
curl https://your-app.up.railway.app/api/anomalies

# System status
curl https://your-app.up.railway.app/api/system/status
```

### Test 4: Check WebSocket Connection

1. Open browser DevTools (F12)
2. Go to Console tab
3. You should see:
   ```
   WebSocket connected: <socket-id>
   API Request: GET /metrics/current
   ```

---

## 🔧 Part 6: Post-Deployment Configuration

### Set Up Custom Domain (Optional)

1. Go to **"Settings"** → **"Networking"**
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `etherfi-monitor.yourdomain.com`)
4. Add the CNAME record to your DNS:
   ```
   CNAME: etherfi-monitor → your-app.up.railway.app
   ```
5. Railway will auto-provision SSL certificate

### Enable Auto-Deploy from GitHub

Already enabled by default! Every push to `main` branch triggers deployment.

To change:
1. Go to **"Settings"** → **"Service"**
2. Under **"Deploy Triggers"**, configure branches

### Set Up Health Checks

1. Go to **"Settings"** → **"Health Checks"**
2. Enable health checks
3. Set path: `/api/health`
4. Set interval: 60 seconds

---

## 📊 Part 7: Monitor Your Application

### View Logs in Real-Time

1. Go to **"Deployments"** tab
2. Click latest deployment
3. Click **"View Logs"**
4. You'll see live logs:
   ```
   [INFO] Data collection cycle started
   [INFO] Collected blockchain metrics successfully
   [INFO] Anomaly detection completed
   ```

### Check Resource Usage

1. Go to **"Metrics"** tab
2. View:
   - CPU usage
   - Memory usage
   - Network traffic
   - Request count

### Set Up Alerts (Optional)

Railway doesn't have built-in alerting, but you can:
- Use external monitoring (e.g., UptimeRobot, Pingdom)
- Set up webhooks for deployment notifications
- Monitor logs for errors

---

## 🐛 Part 8: Troubleshooting Common Issues

### Issue 1: "Application Failed to Start"

**Symptoms:** Deployment shows "crashed" status

**Solutions:**
1. Check logs for errors:
   ```
   Go to Deployments → View Logs
   ```

2. Common causes:
   - Missing environment variables
   - Database connection failure
   - Port binding issues

3. Verify environment variables are set:
   ```
   Go to Variables tab
   Check DATABASE_URL is referenced correctly
   Check all API keys are present
   ```

### Issue 2: "Database Connection Refused"

**Symptoms:** Logs show `ECONNREFUSED` or `connection timeout`

**Solutions:**
1. Verify DATABASE_URL is correctly referenced:
   ```
   Should be: ${{Postgres.DATABASE_URL}}
   Not: postgres://user:pass@host...
   ```

2. Check PostgreSQL service is running:
   ```
   Go to Postgres service
   Should show "Active" status
   ```

3. Re-link database:
   ```
   Delete DATABASE_URL variable
   Add new variable → Reference → Postgres.DATABASE_URL
   ```

### Issue 3: "Frontend Shows 404 or Blank Page"

**Symptoms:** Visiting the URL shows "Not Found" or white screen

**Solutions:**
1. Verify frontend was built:
   ```
   Check build logs for:
   "✓ built in X.XXs"
   ```

2. Check `frontend/dist/` directory exists:
   ```
   Should be created during Railway build
   ```

3. Verify server.js serves static files:
   ```javascript
   // backend/src/api/server.js should have:
   if (process.env.NODE_ENV === 'production') {
     app.use(express.static(path.join(__dirname, '../../../frontend/dist')));
   }
   ```

4. Rebuild and redeploy:
   ```
   Push a new commit to GitHub
   Or manually trigger redeploy in Railway
   ```

### Issue 4: "WebSocket Connection Failed"

**Symptoms:** Dashboard shows "Disconnected", no real-time updates

**Solutions:**
1. Check browser console for errors
2. Verify WebSocket server is initialized:
   ```
   Check logs for: "WebSocket server initialized"
   ```

3. Railway supports WebSockets by default, but check:
   ```
   Go to Settings → ensure no custom HTTP settings
   ```

4. Update frontend WebSocket URL:
   ```javascript
   // frontend/src/services/websocket.js
   const WS_URL = window.location.origin;
   ```

### Issue 5: "Data Not Collecting"

**Symptoms:** Metrics show stale data, no updates

**Solutions:**
1. Check collector logs:
   ```
   Look for: "Data collection cycle started"
   ```

2. Verify API keys are valid:
   ```
   Test ALCHEMY_API_KEY
   Test ANTHROPIC_API_KEY
   ```

3. Check collector is scheduled:
   ```
   blockchain-collector.js should run every 5 minutes
   ```

4. Manually trigger collection:
   ```
   Can add a manual trigger endpoint for testing
   ```

### Issue 6: "Build Takes Too Long / Fails"

**Symptoms:** Build times out or fails during dependency installation

**Solutions:**
1. Check `nixpacks.toml` configuration
2. Ensure `package-lock.json` is committed
3. Use `npm ci` instead of `npm install`
4. Railway has a 10-minute build limit

### Issue 7: "Out of Memory"

**Symptoms:** App crashes with "JavaScript heap out of memory"

**Solutions:**
1. Upgrade Railway plan (free tier: 512MB → paid: 8GB)
2. Optimize data fetching:
   ```javascript
   // Limit historical data queries
   // Use pagination
   // Implement data archival
   ```

3. Add memory limits to Node:
   ```json
   // package.json
   "start": "node --max-old-space-size=512 src/api/server.js"
   ```

---

## 🔐 Part 9: Security Best Practices

### Protect Your API Keys

✅ **DO:**
- Store all keys in Railway environment variables
- Use Railway's variable references for DATABASE_URL
- Rotate keys regularly

❌ **DON'T:**
- Commit `.env` file to GitHub
- Hardcode keys in source code
- Share deployment logs publicly (they may contain keys)

### Enable CORS Properly

Already configured in `backend/src/api/server.js`:
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false  // Only allow same-origin in production
    : ['http://localhost:5173', 'http://localhost:3000']
}));
```

### Set Up Rate Limiting

Consider adding rate limiting to API endpoints:
```bash
npm install express-rate-limit
```

---

## 📈 Part 10: Performance Optimization

### Enable Database Connection Pooling

Already implemented in `backend/src/database/db-connection.js`:
```javascript
const pool = new Pool({
  max: 20,  // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Optimize Frontend Bundle

Frontend is already optimized with Vite:
- Tree-shaking enabled
- Code splitting
- Asset optimization
- Gzip compression

Current bundle size: **221KB gzipped** ✅

### Add Caching Headers

Consider adding:
```javascript
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache');
  next();
});
```

---

## 🔄 Part 11: Continuous Deployment

### Automatic Deployments

Already enabled! When you push to GitHub:

```bash
git add .
git commit -m "Update anomaly detection threshold"
git push origin main
```

Railway will:
1. Detect commit
2. Trigger build
3. Run tests (if configured)
4. Deploy new version
5. Zero-downtime rollout

### Rollback to Previous Version

If something goes wrong:

1. Go to **"Deployments"** tab
2. Find previous successful deployment
3. Click **"⋮"** (three dots)
4. Click **"Redeploy"**
5. Confirm rollback

---

## 📱 Part 12: Monitoring & Notifications

### Set Up External Monitoring

1. **UptimeRobot** (Free):
   - Create account at https://uptimerobot.com
   - Add monitor: `https://your-app.up.railway.app/api/health`
   - Set check interval: 5 minutes
   - Get email alerts on downtime

2. **Better Uptime** (Free tier):
   - More detailed monitoring
   - Incident management
   - Status page

### Railway Webhooks

Set up deployment notifications:

1. Go to **"Settings"** → **"Webhooks"**
2. Add webhook URL (e.g., Slack, Discord)
3. Get notified on:
   - Deployment started
   - Deployment succeeded
   - Deployment failed

---

## 💰 Part 13: Cost Management

### Railway Free Tier Limits

- **$5 free credits per month**
- **512MB RAM**
- **1 GB disk**
- **100 GB network**

**Your app usage estimate:**
- Backend: ~300MB RAM
- PostgreSQL: ~150MB RAM
- Network: ~10 GB/month
- **Total cost**: ~$0-5/month (likely free)

### Upgrade to Pro (if needed)

If you exceed free tier:
- **$20/month** (includes $20 credits)
- No usage limits
- Priority support
- More compute resources

---

## 🎓 Part 14: Next Steps After Deployment

### Immediate Actions

1. ✅ Test all endpoints
2. ✅ Verify data collection is working
3. ✅ Check anomaly detection triggers
4. ✅ Monitor logs for errors
5. ✅ Share your deployed URL!

### Enhancements to Consider

1. **Add User Authentication**
   - Implement login system
   - Protect admin endpoints
   - Role-based access

2. **Set Up Custom Domain**
   - Buy domain (e.g., Namecheap, Google Domains)
   - Configure DNS
   - Enable HTTPS (automatic on Railway)

3. **Add Analytics**
   - Google Analytics
   - Mixpanel
   - Custom event tracking

4. **Implement Caching**
   - Redis for session storage
   - Cache API responses
   - Reduce database load

5. **Add Tests**
   - Unit tests
   - Integration tests
   - E2E tests with Playwright

---

## 📞 Getting Help

### Railway Support

- **Discord**: https://discord.gg/railway
- **Docs**: https://docs.railway.app
- **Status**: https://status.railway.app

### This Project

- **GitHub Issues**: Your repo issues page
- **Logs**: Railway deployment logs
- **Documentation**: README.md in this repo

---

## ✅ Deployment Checklist

Use this checklist to verify your deployment:

### Pre-Deployment
- [ ] Code pushed to GitHub
- [ ] All API keys ready
- [ ] `.env` not committed (in `.gitignore`)
- [ ] `railway.json` configured
- [ ] `nixpacks.toml` configured

### Railway Setup
- [ ] Railway account created
- [ ] New project created from GitHub
- [ ] PostgreSQL database added
- [ ] Environment variables configured
- [ ] Domain generated

### Post-Deployment
- [ ] Health check returns 200 OK
- [ ] Frontend loads correctly
- [ ] WebSocket connects (green indicator)
- [ ] API endpoints respond
- [ ] Database has schema
- [ ] Collectors are running
- [ ] Logs show no errors

### Testing
- [ ] Real-time updates work
- [ ] Anomaly detection triggers
- [ ] Charts display historical data
- [ ] System status shows "Online"
- [ ] No console errors in browser

---

## 🎉 Success!

If you've completed all steps, your EtherFi Anomaly Detection System is now live on Railway!

**Your production URL:** `https://your-app.up.railway.app`

Share it with your hackathon judges and showcase your work! 🚀

---

**Need help?** Check the troubleshooting section or reach out in the Railway Discord.

**Good luck with your hackathon!** 💪
