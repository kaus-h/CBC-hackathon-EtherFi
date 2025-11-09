# EtherFi Anomaly Detection Dashboard

React-based real-time monitoring dashboard for the EtherFi protocol anomaly detection system.

## Features

- **Real-time Metrics**: Live TVL, peg health, gas prices, and staker count
- **WebSocket Updates**: Instant anomaly alerts and metric updates
- **Historical Charts**: Interactive time-series visualization with Recharts
- **Anomaly Feed**: Severity-based filtering and detailed anomaly cards
- **System Status**: Live collector health monitoring
- **Cyberpunk Theme**: Custom terminal/dark aesthetic with animations

## Tech Stack

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling with custom theme
- **Framer Motion**: Smooth animations and transitions
- **Recharts**: Time-series data visualization
- **Socket.io Client**: Real-time WebSocket communication
- **Axios**: HTTP client for REST API calls

## Development

### Prerequisites

- Node.js 18+ and npm
- Backend API server running on port 3001

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be output to `dist/` directory.

## Configuration

Edit `.env` file to configure API and WebSocket endpoints:

```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

## Project Structure

```
frontend/
├── src/
│   ├── components/           # React components
│   │   ├── Dashboard.jsx     # Main container with data management
│   │   ├── Header.jsx        # Top bar with connection status
│   │   ├── MetricsPanel.jsx  # Live metrics cards
│   │   ├── AnomalyFeed.jsx   # Anomaly list container
│   │   ├── AnomalyCard.jsx   # Individual anomaly display
│   │   ├── Charts.jsx        # Historical data visualization
│   │   └── SystemStatus.jsx  # Collector health banner
│   ├── services/             # API and WebSocket services
│   │   ├── api.js            # Axios REST client
│   │   └── websocket.js      # Socket.io client wrapper
│   ├── App.jsx               # Root component
│   ├── main.jsx              # Application entry point
│   └── index.css             # Global styles and Tailwind
├── public/                   # Static assets
├── index.html                # HTML template
├── vite.config.js            # Vite configuration
└── tailwind.config.js        # Tailwind theme customization
```

## WebSocket Events

The dashboard listens for these WebSocket events:

- `connection:success` - Initial connection established
- `metrics:update` - New blockchain metrics (every 5 minutes)
- `anomaly:detected` - New anomaly alert (real-time)
- `system:update` - System health status update

## API Endpoints Used

- `GET /api/metrics/current` - Latest blockchain metrics
- `GET /api/metrics/historical` - Historical time-series data
- `GET /api/anomalies` - Recent anomaly alerts
- `GET /api/system/health` - Collector health status

## Design Philosophy

The dashboard features a distinctive cyberpunk/terminal aesthetic:

- Dark navy background (#0a0e27) with cyan accents (#00ffff)
- JetBrains Mono for data, Rubik for headings
- Scanline effects and glow shadows
- Chrome effects and animated borders
- Terminal-inspired card designs

This design deliberately avoids generic Material UI/Chakra patterns to create a unique monitoring experience.

## Performance

- Lazy loading for optimal initial load
- WebSocket-driven updates (no polling)
- 5-minute historical data refresh
- Optimized animations with Framer Motion
- Production build: ~220KB gzipped

## License

Part of the EtherFi Anomaly Detection System
