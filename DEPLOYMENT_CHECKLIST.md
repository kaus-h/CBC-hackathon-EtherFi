# 📋 Railway Deployment Checklist

**Use this checklist to ensure a smooth deployment**

---

## Pre-Deployment

- [ ] All code committed to Git
- [ ] Code pushed to GitHub main branch
- [ ] `.env` file is in `.gitignore` (not committed)
- [ ] API keys ready:
  - [ ] ANTHROPIC_API_KEY
  - [ ] ALCHEMY_API_KEY
  - [ ] ETHERSCAN_API_KEY (optional)
  - [ ] TWITTER_API_KEY (optional)

---

## Railway Account Setup

- [ ] Railway account created (https://railway.app)
- [ ] GitHub connected to Railway
- [ ] Payment method added (even for free tier)

---

## Project Creation

- [ ] New project created on Railway
- [ ] Deployed from GitHub repository
- [ ] PostgreSQL database added to project
- [ ] Database is showing "Active" status

---

## Environment Variables

- [ ] `NODE_ENV` set to `production`
- [ ] `DATABASE_URL` set as Reference to `${{Postgres.DATABASE_URL}}`
- [ ] `ANTHROPIC_API_KEY` added
- [ ] `ALCHEMY_API_KEY` added
- [ ] Optional keys added (if using):
  - [ ] `ETHERSCAN_API_KEY`
  - [ ] `TWITTER_API_KEY`

---

## Networking

- [ ] Domain generated
- [ ] Domain URL saved: `https://_______________.up.railway.app`
- [ ] Health checks enabled (optional)
- [ ] Custom domain configured (optional)

---

## Build & Deploy

- [ ] First deployment triggered
- [ ] Build logs show no errors
- [ ] Build phase completed:
  - [ ] Dependencies installed
  - [ ] Frontend built successfully
  - [ ] Database initialized
- [ ] Deploy phase completed:
  - [ ] Server started
  - [ ] No crash logs

---

## Verification

### API Tests

- [ ] Health endpoint responds: `/api/health`
  ```bash
  curl https://your-app.up.railway.app/api/health
  ```

- [ ] Current metrics endpoint: `/api/metrics/current`
  ```bash
  curl https://your-app.up.railway.app/api/metrics/current
  ```

- [ ] Anomalies endpoint: `/api/anomalies`
  ```bash
  curl https://your-app.up.railway.app/api/anomalies
  ```

- [ ] System status endpoint: `/api/system/status`
  ```bash
  curl https://your-app.up.railway.app/api/system/status
  ```

### Frontend Tests

- [ ] Dashboard loads at root URL
- [ ] No 404 errors
- [ ] No blank/white page
- [ ] Header displays correctly
- [ ] Metrics panel visible
- [ ] Connection indicator shows "Connected" (green)

### WebSocket Tests

- [ ] Browser DevTools console shows WebSocket connected
- [ ] No WebSocket errors in console
- [ ] Real-time updates work (wait 5 minutes for data collection)

### Database Tests

- [ ] Railway Postgres Data tab accessible
- [ ] Tables created:
  - [ ] `time_series_data`
  - [ ] `anomalies`
  - [ ] `anomaly_triggers`
  - [ ] `twitter_sentiment`
  - [ ] `whale_wallets`

---

## Monitoring

- [ ] Deployment logs checked for errors
- [ ] Application metrics reviewed:
  - [ ] CPU usage reasonable (<80%)
  - [ ] Memory usage reasonable (<400MB)
  - [ ] No crash loops
- [ ] External monitoring set up (optional):
  - [ ] UptimeRobot configured
  - [ ] Status page created

---

## Post-Deployment

- [ ] Shared deployment URL with team
- [ ] Added URL to GitHub README
- [ ] Tested on mobile device (optional)
- [ ] Tested on different browsers (optional)
- [ ] Created backup of environment variables

---

## 24-Hour Check

Come back after 24 hours and verify:

- [ ] Data is being collected (check metrics)
- [ ] Historical data accumulating
- [ ] No application crashes
- [ ] Memory usage stable
- [ ] Anomaly detection running (check logs)

---

## Troubleshooting Reference

If you encounter issues, check:

1. **Deployment Logs**: Railway → Deployments → View Logs
2. **Environment Variables**: Variables tab → verify all set
3. **Database Connection**: Postgres service → should be "Active"
4. **Build Logs**: Look for `✓ built in X.XXs` message
5. **Full Guide**: `RAILWAY_DEPLOYMENT_GUIDE.md` Part 8

---

## Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| 404 on frontend | Redeploy, check build logs |
| Database error | Verify DATABASE_URL is Reference |
| WebSocket disconnected | Check CORS settings, verify logs |
| Blank dashboard | Open DevTools console for errors |
| No data collecting | Verify API keys are correct |

---

## Success Criteria

✅ **Your deployment is successful when:**

1. Health check returns 200 OK
2. Frontend loads without errors
3. WebSocket shows "Connected"
4. Metrics display on dashboard
5. No errors in Railway logs
6. System status shows all collectors "Online"

---

## 🎉 Deployment Complete!

Once all items are checked, your deployment is live and ready!

**Production URL**: `https://_______________.up.railway.app`

**Share it and celebrate!** 🚀

---

**Need help?** See `RAILWAY_DEPLOYMENT_GUIDE.md` for detailed troubleshooting.
