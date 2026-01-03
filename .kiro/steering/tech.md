# Technology Stack

## Core Technologies

- **Oracle Database**: Primary data storage with PL/SQL packages for business logic
- **Oracle APEX**: Web application framework (Application ID 200)
- **Oracle REST Data Services (ORDS)**: REST API layer
- **Node.js**: Discord bot runtime (v18.0.0+)
- **Discord.js**: Discord bot framework (v14.22.0)

## Development Tools

- **SQLcl**: Oracle command-line interface for database operations
- **Vitest**: Testing framework for Node.js components
- **Docker**: Containerization for bot deployment

## Key Libraries & Dependencies

### Discord Bot
- `axios`: HTTP client for API calls
- `moment-timezone`: Timezone handling
- `dotenv`: Environment configuration

## Common Commands

### Database Operations
```bash
# Connect to database (requires SQLcl)
sql username/password@connection_string

# Install database schema
@install/_ins.sql

# Install APEX application
@apex/f200.sql

# Install ORDS endpoints
@ords/install_discord_api.sql
```

### Discord Bot
```bash
# Development
cd bots/
npm install
npm run dev          # Start with file watching
npm start           # Production start
npm test            # Run tests
npm run test:vitest # Run Vitest tests

# Deployment
npm run deploy      # Deploy to production
npm run status      # Check deployment status
npm run logs        # View logs
```

### Testing
```bash
# Database testing
@tests/test_wmg_verification_engine.sql

# Bot testing
cd bots/
npm test
```

## Build Process

- **Database**: No build step - direct SQL execution
- **APEX**: Export/import via SQL files. YAML exports used to detect application diff changes.
- **Discord Bot**: No build step required for Node.js
- **ORDS**: Direct SQL installation of REST endpoints

## Environment Configuration

- Database connections via SQLcl or SQL Developer
- Bot configuration via `.env` files
- APEX configuration via application properties
- ORDS configuration via database installation scripts