# EtherFi Anomaly Detection System

A production-quality system that monitors EtherFi protocol on-chain data in real-time, detects anomalies using Claude AI for pattern recognition, and displays findings on a React dashboard.

## Project Overview

This system autonomously monitors the EtherFi protocol, tracking:
- Total Value Locked (TVL)
- Whale wallet movements (top 20 holders)
- Withdrawal queue metrics
- eETH/ETH price peg health
- Transaction volumes
- Validator performance
- Gas prices
- Twitter sentiment

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Frontend**: React with WebSocket
- **Blockchain**: ethers.js with Alchemy API
- **AI**: Anthropic Claude API (Sonnet 4.5)
- **Data Collection**: Every 5 minutes
- **AI Analysis**: Every 30 minutes

## Prerequisites

### Install Node.js and npm (if not already installed)

Your system has Node.js v12.22.9, but npm is missing. You need to install npm:

```bash
# On WSL/Ubuntu, install npm
sudo apt update
sudo apt install npm

# Or upgrade to Node.js 18+ (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Install PostgreSQL

```bash
# On WSL/Ubuntu
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Create database and user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE etherfi_anomaly_db;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE etherfi_anomaly_db TO postgres;
\q
```

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

This will install:
- `@anthropic-ai/sdk` - Claude AI integration
- `ethers` - Blockchain interaction
- `pg` - PostgreSQL client
- `express` - Web server
- `ws` - WebSocket server
- `axios` - HTTP client
- `dotenv` - Environment variables
- `cors` - CORS middleware

### 2. Configure Environment

The `.env` file is already created with your API keys. Verify the database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=etherfi_anomaly_db
DB_USER=postgres
DB_PASSWORD=postgres
```

Update these if your PostgreSQL setup is different.

### 3. Initialize Database

```bash
cd backend
npm run init-db
```

This will:
- Connect to PostgreSQL
- Create all required tables
- Set up views and functions
- Insert a test row

### 4. Test Database

```bash
npm run test-db
```

This will:
- Test database connection
- Insert sample data
- Verify all operations work
- Display health check results

## Phase 1 Status

### ✅ Completed

1. **Project Structure** - All directories created
2. **Database Schema** - PostgreSQL schema with 4 tables:
   - `time_series_data` - Tracks all metrics over time
   - `whale_wallets` - Top 20 wallet holdings
   - `anomalies` - Detected anomalies
   - `twitter_sentiment` - Social sentiment data
3. **Database Module** - Connection pooling and queries
4. **Configuration** - Contract addresses and ABIs
5. **Utilities** - Logger and error handler
6. **Test Scripts** - Database initialization and testing

### 📋 Phase 1 Testing Checklist

Before proceeding to Phase 2, verify:

- [ ] npm is installed (`npm --version`)
- [ ] PostgreSQL is running (`sudo service postgresql status`)
- [ ] Database exists (`sudo -u postgres psql -l | grep etherfi_anomaly_db`)
- [ ] Backend dependencies installed (`npm install` in backend/)
- [ ] Database initialized (`npm run init-db`)
- [ ] Database tests pass (`npm run test-db`)

## Next Steps

Once Phase 1 testing is complete, proceed to:

**Phase 2: Historical Data Loader**
- Fetch 30 days of EtherFi historical data
- Populate baseline metrics
- Establish "normal" patterns

## Project Structure

```
etherfi-anomaly-detector/
├── backend/
│   ├── src/
│   │   ├── collectors/          # Data collection modules
│   │   ├── analysis/            # AI analysis engine
│   │   ├── database/            # Database layer
│   │   │   ├── schema.sql       # PostgreSQL schema
│   │   │   ├── db-connection.js # Connection pool
│   │   │   └── queries.js       # SQL queries
│   │   ├── api/                 # Express API routes
│   │   ├── utils/               # Utilities
│   │   │   ├── logger.js        # Logging
│   │   │   └── error-handler.js # Error handling
│   │   └── server.js            # Main entry point
│   ├── config/
│   │   └── contracts.js         # Contract ABIs & addresses
│   ├── scripts/
│   │   ├── init-database.js     # DB initialization
│   │   └── test-database.js     # DB testing
│   └── package.json
├── frontend/                    # (Phase 8)
├── .env                         # Environment variables
├── .gitignore
└── README.md
```

## API Keys (Already Configured)

- ✅ Etherscan API
- ✅ Anthropic Claude API
- ✅ Alchemy API
- ✅ Twitter API (optional)

## Troubleshooting

### npm not found
```bash
sudo apt update
sudo apt install npm
```

### PostgreSQL not running
```bash
sudo service postgresql start
```

### Database connection failed
Check PostgreSQL is running and credentials in `.env` are correct:
```bash
sudo -u postgres psql
\l  # List databases
```

### Port already in use
Change `PORT` in `.env` to a different port (default: 3000)

## Support

For issues, check the logs in `backend/logs/app.log`

---

**Phase 1: Database & Configuration - READY FOR TESTING**

To proceed, install npm and run the test commands above.
