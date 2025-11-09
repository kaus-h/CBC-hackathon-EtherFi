# 🚀 Railway Quick Start - 5 Minute Deploy

**Deploy EtherFi Anomaly Detection System in 5 minutes!**

---

## Step 1: Push to GitHub (2 min)

```bash
cd /home/user/CBC-hackathon-EtherFi
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

---

## Step 2: Deploy on Railway (3 min)

### A. Create Project
1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `CBC-hackathon-EtherFi`

### B. Add PostgreSQL
1. Click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**

### C. Add Environment Variables
Click your app service → **"Variables"** tab → Add:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}  ← Use Reference!
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
ALCHEMY_API_KEY=your-alchemy-key-here
```

### D. Generate Domain
1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Get your URL: `https://your-app.up.railway.app`

---

## Step 3: Verify (30 sec)

### ✅ Check Health
```bash
curl https://your-app.up.railway.app/api/health
```

### ✅ Open Dashboard
Visit: `https://your-app.up.railway.app`

You should see:
- Green "Connected" indicator
- Live metrics panel
- System status banner

---

## 🎉 Done!

Your app is live on Railway!

**Share your URL** and showcase your project! 🚀

---

## Need Help?

- 📖 Full guide: `RAILWAY_DEPLOYMENT_GUIDE.md`
- 🐛 Troubleshooting: See Part 8 in full guide
- 💬 Railway Discord: https://discord.gg/railway

---

## Common Issues

**❌ Database connection failed?**
→ Use `${{Postgres.DATABASE_URL}}` as Reference, not hardcoded string

**❌ Frontend shows 404?**
→ Check build logs for `✓ built in X.XXs`

**❌ WebSocket disconnected?**
→ Check browser console for errors, verify server logs

**❌ No data collecting?**
→ Verify ALCHEMY_API_KEY and ANTHROPIC_API_KEY are set

---

## Quick Commands

```bash
# View logs
Railway Dashboard → Deployments → View Logs

# Redeploy
git push origin main

# Rollback
Deployments → Previous version → Redeploy

# Check database
Postgres service → Data → Query
```

---

**That's it!** You're deployed! 🎊
