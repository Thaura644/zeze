# ZEZE Backend Development Guide

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 15+ with TimescaleDB extension
- Redis 7+
- Docker & Docker Compose (optional, for containerized development)

## Getting Started

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd zeze/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 2. Database Setup

```bash
# Install PostgreSQL with TimescaleDB
# On macOS with Homebrew:
brew install timescaledb

# On Ubuntu:
sudo apt-get install timescaledb-2-postgresql-15

# Create database
createdb zeze_guitar

# Run migrations
npm run migrate

# (Optional) Seed with sample data
npm run seed
```

### 3. Redis Setup

```bash
# Install Redis
# On macOS with Homebrew:
brew install redis

# On Ubuntu:
sudo apt-get install redis-server

# Start Redis
redis-server
```

## Development

### Running the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

### Available Scripts

- `npm start` - Start server in production mode
- `npm run dev` - Start server in development mode with nodemon
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:integration` - Run integration tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data

## API Documentation

The API is available at `http://localhost:3001/api`

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/progress` - Get user progress

#### Audio Processing
- `POST /api/process-youtube` - Process YouTube URL
- `GET /api/process-status/:jobId` - Get processing status
- `GET /api/song-results/:jobId` - Get processed results
- `POST /api/transpose` - Transpose song

#### Practice
- `POST /api/practice/start` - Start practice session
- `POST /api/practice/end/:sessionId` - End practice session
- `POST /api/practice/analyze` - Analyze practice performance
- `GET /api/practice/stats` - Get practice statistics

#### Songs
- `GET /api/songs/search` - Search songs
- `GET /api/songs/:songId` - Get song details
- `POST /api/songs/:songId/save` - Save song to library
- `GET /api/songs/saved/list` - Get saved songs

## WebSocket

Real-time features are available via WebSocket at `ws://localhost:3001`

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3001?token=<your-jwt-token>');
```

### Events

- `subscribe_job` - Subscribe to job processing updates
- `join_session` - Join practice session for real-time feedback
- `practice_data` - Send real-time practice data

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run only integration tests
npm run test:integration
```

### Test Structure

```
tests/
├── setup.js              # Test setup and global utilities
├── api.test.js           # API endpoint tests
├── integration/          # Integration tests
└── services/             # Unit tests for services
    ├── userService.test.js
    ├── songService.test.js
    └── practiceService.test.js
```

## Docker Development

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables for Docker

Copy `.env.docker` to `.env` and update with your actual values before running with Docker.

## Database

### Schema

The database schema is defined in `database/schema.sql`. It includes:

- Users and authentication
- Songs and metadata
- Practice sessions and analysis
- Techniques and chords
- User progress tracking

### Migrations

```bash
# Run migrations
npm run migrate

# Check migration status
node scripts/migrate.js status

# Rollback last migration
node scripts/migrate.js rollback

# Reset database (migrate + seed)
npm run reset
```

## Logging

Logs are configured with Winston and output to:

- Console (development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

Log levels: `error`, `warn`, `info`, `debug`

## Monitoring

### Health Checks

- `GET /health` - Overall health status
- `GET /ready` - Readiness probe
- `GET /metrics` - Prometheus metrics

### Monitoring Stack

The Docker setup includes:

- Prometheus for metrics collection
- Grafana for visualization
- TimescaleDB for time-series data

## Security

### Authentication

- JWT-based authentication
- Token blacklisting on logout
- Password hashing with bcrypt

### Rate Limiting

- 100 requests per 15 minutes per IP
- Configurable per endpoint

### CORS

Configured for frontend origin in development.

## Environment Variables

See `.env.example` for all available environment variables.

### Required Variables

- `DB_*` - Database connection
- `REDIS_*` - Redis connection  
- `JWT_SECRET` - JWT signing secret
- `AWS_*` - S3 file storage (if using)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Troubleshooting

### Common Issues

**Database Connection Error**
- Check PostgreSQL is running
- Verify connection details in `.env`
- Ensure TimescaleDB extension is installed

**Redis Connection Error**
- Check Redis server is running
- Verify Redis connection details

**Migration Errors**
- Check database permissions
- Ensure TimescaleDB extension is enabled
- Review migration SQL for syntax errors

### Debug Mode

Set `NODE_ENV=development` and `LOG_LEVEL=debug` for verbose logging.

## Production Deployment

### Environment Setup

1. Set production environment variables
2. Configure SSL certificates
3. Set up proper database and Redis instances
4. Configure monitoring and alerting

### Docker Deployment

```bash
# Build production image
docker build -t zeze-backend .

# Run with production settings
docker run -d --env-file .env.production -p 3001:3001 zeze-backend
```

### Kubernetes

Kubernetes configurations are available in `k8s/` directory.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review logs for error details
3. Check GitHub Issues
4. Contact the development team