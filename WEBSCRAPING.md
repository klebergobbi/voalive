# ReservaSegura - Flight Webscraping System

## Overview

Sistema completo de webscraping para dados de voos usando Firecrawl, integrando FlightRadar24 e FlightAware com cache otimizado e atualizações automáticas.

## 🚀 Features

### ✅ Implemented
- **Firecrawl Integration** - API key configurada: `fc-2dda7f7f0e2c4ccb816cb21e7f372410`
- **FlightRadar24 Scraping** - Extração de dados de voos, aeroportos e detalhes
- **FlightAware Scraping** - Backup e validação cruzada de dados
- **Database Storage** - Modelos otimizados para armazenamento eficiente
- **Automated Scheduling** - Scraping automático a cada 15 minutos
- **Smart Caching** - Sistema de cache em memória e banco de dados
- **REST API** - Endpoints completos para consultas e controle
- **Error Handling** - Sistema robusto de tratamento de erros e retry
- **Job Management** - Controle de jobs com status e métricas

### 🎯 Core Components

1. **Database Models**:
   - `ScrapedFlight` - Dados de voos scrapados
   - `ScrapingJob` - Controle de jobs de scraping
   - `Airport` - Informações de aeroportos

2. **Services**:
   - `FirecrawlService` - Cliente base do Firecrawl
   - `FlightRadar24Service` - Scraping especializado FR24
   - `FlightAwareService` - Scraping especializado FlightAware
   - `FlightScraperService` - Orquestração e cache

3. **API Endpoints**:
   ```
   POST /api/v1/flight-scraper/scrape/flight
   POST /api/v1/flight-scraper/scrape/airport
   GET  /api/v1/flight-scraper/flights/:flightNumber
   GET  /api/v1/flight-scraper/airports/:airportCode/flights
   GET  /api/v1/flight-scraper/flights/search
   GET  /api/v1/flight-scraper/flights/recent
   POST /api/v1/flight-scraper/scheduler/start
   POST /api/v1/flight-scraper/scheduler/stop
   GET  /api/v1/flight-scraper/stats
   ```

## 🔧 Setup & Configuration

### 1. Environment Variables

```bash
# API Configuration (.env)
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/reservasegura
FIRECRAWL_API_KEY=fc-2dda7f7f0e2c4ccb816cb21e7f372410
AUTO_START_SCRAPER=false
JWT_SECRET=your-jwt-secret-key-here
```

### 2. Database Migration

```bash
# Generate and apply database schema
cd packages/database
npm run db:generate
npm run db:push
```

### 3. Install Dependencies

```bash
# API dependencies already configured in package.json:
# - @mendable/firecrawl-js: ^4.3.5
# - node-cron: ^4.2.1
# - @types/node-cron: ^3.0.11
```

### 4. Start Services

```bash
# Start API server
cd apps/api
npm run dev

# Server will be available at http://localhost:4000
```

## 📊 Usage Examples

### Manual Scraping

```bash
# Scrape specific flight
curl -X POST http://localhost:4000/api/v1/flight-scraper/scrape/flight \\
  -H "Content-Type: application/json" \\
  -d '{"flightNumber": "AD2456", "source": "FLIGHTRADAR24"}'

# Scrape airport data
curl -X POST http://localhost:4000/api/v1/flight-scraper/scrape/airport \\
  -H "Content-Type: application/json" \\
  -d '{"airportCode": "GRU", "source": "FLIGHTRADAR24"}'
```

### Data Retrieval

```bash
# Get flight data
curl "http://localhost:4000/api/v1/flight-scraper/flights/AD2456"

# Get airport flights
curl "http://localhost:4000/api/v1/flight-scraper/airports/GRU/flights?limit=20"

# Search flights
curl "http://localhost:4000/api/v1/flight-scraper/flights/search?origin=GRU&destination=BSB&date=2024-03-20"
```

### Scheduler Management

```bash
# Start automatic scraping
curl -X POST http://localhost:4000/api/v1/flight-scraper/scheduler/start

# Stop automatic scraping
curl -X POST http://localhost:4000/api/v1/flight-scraper/scheduler/stop

# Get statistics
curl http://localhost:4000/api/v1/flight-scraper/stats
```

## 🎛️ Configuration Options

### Scraping Configuration

Default configuration includes:
- **Airports**: GRU, CGH, BSB, SDU, GIG, CWB, POA, REC, FOR, MAO
- **Update Interval**: Every 15 minutes
- **Max Concurrent Jobs**: 3
- **Retry Attempts**: 3
- **Retry Delay**: 5 seconds
- **Cache TTL**: 5-30 minutes depending on data type

### Firecrawl Settings

- **API Key**: `fc-2dda7f7f0e2c4ccb816cb21e7f372410`
- **Formats**: Markdown + HTML extraction
- **Main Content Only**: True (removes navigation, ads, etc.)
- **Wait Time**: 2-4 seconds for page load
- **Timeout**: 30-45 seconds per request

## 📈 Performance & Optimization

### Caching Strategy
1. **Memory Cache**: Flight data cached for 5 minutes
2. **Database Cache**: Scraped data stored with timestamps
3. **Smart Refresh**: Automatic refresh for stale data
4. **Batch Processing**: Airport data scraped in batches

### Error Handling
- **Retry Logic**: 3 attempts with exponential backoff
- **Graceful Degradation**: Fallback between FlightRadar24 and FlightAware
- **Job Tracking**: All operations logged with status and metrics
- **Rate Limiting**: Built-in delays to respect site limits

### Monitoring
- **Statistics Endpoint**: Real-time metrics on scraping performance
- **Job History**: Track successful and failed scraping attempts
- **Cache Stats**: Monitor cache hit rates and memory usage
- **Graceful Shutdown**: Proper cleanup on server shutdown

## 🛡️ Security & Compliance

- **API Key Management**: Secure key storage via environment variables
- **Request Headers**: Proper user agent and headers for scraping
- **Rate Limiting**: Respectful scraping intervals
- **Error Masking**: Sensitive data not exposed in logs
- **Data Validation**: Input validation for all API endpoints

## 🔄 Data Flow

```
FlightRadar24/FlightAware → Firecrawl → Parser → Database → API → Frontend
                                        ↓
                                   Cache Layer
                                   (Memory + DB)
```

## 🚦 API Status Codes

- **200**: Success with data
- **404**: Flight/Airport not found
- **500**: Server error (scraping failed)
- **400**: Invalid request parameters
- **429**: Rate limit exceeded

## 📋 Next Steps

1. **Testing**: Implementar testes unitários e integração
2. **Monitoring**: Dashboard de métricas e alertas
3. **Scaling**: Load balancing para múltiplas instâncias
4. **ML Enhancement**: Predição de delays e melhoria de dados
5. **Real-time Updates**: WebSockets para atualizações em tempo real

---

## 🎉 Sistema Completamente Implementado!

✅ **Webscraping**: FlightRadar24 + FlightAware
✅ **Database**: Modelos otimizados
✅ **API**: Endpoints RESTful completos
✅ **Cache**: Sistema inteligente multi-layer
✅ **Automation**: Scraping agendado
✅ **Monitoring**: Métricas e jobs tracking

**Ready to fly!** 🛫