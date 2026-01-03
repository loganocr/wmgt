# Project Structure

## Root Directory Organization

```
wmgt/
├── apex/                    # Oracle APEX application exports
├── bots/                    # Discord bot Node.js application
├── data/                    # Seed data and test data scripts
├── dba/                     # Database administration scripts
├── docs/                    # Documentation and diagrams
├── install/                 # Database schema installation scripts
├── ords/                    # Oracle REST Data Services endpoints
├── packages/                # PL/SQL package specifications and bodies
├── release/                 # Release management scripts
├── reports/                 # Tournament reporting and analysis
├── scripts/                 # Utility scripts
├── sql/                     # Ad-hoc SQL scripts and utilities
├── tests/                   # Database unit tests
├── tmp/                     # Temporary files and development scripts
├── unit_tests/              # Formal unit test suites
├── views/                   # Database view definitions
└── www/                     # Static web assets (CSS, JS, images)
```

## Key Directories

### Database Components
- **install/**: Core table creation scripts (run via `_ins.sql`)
- **packages/**: PL/SQL business logic (`.pks` specs, `.pkb` bodies)
- **views/**: Database views (especially `wmg_*_v` pattern)
- **data/**: Seed data for lookup tables and test scenarios

### Application Components
- **apex/**: APEX app exports (f200.sql is main app)
- **bots/**: Complete Node.js Discord bot with src/ structure
- **ords/**: REST API endpoint definitions
- **www/**: Static assets for web interface

### Development & Operations
- **tests/**: Database testing scripts
- **reports/**: Tournament analysis and reporting tools
- **release/**: Deployment and release management
- **dba/**: Database maintenance and migration scripts

## Naming Conventions

### Database Objects
- Tables: `wmg_*` (e.g., `wmg_players`, `wmg_tournaments`)
- Views: `wmg_*_v` (e.g., `wmg_rounds_v`, `wmg_players_v`)
- Packages: `wmg_*` (e.g., `wmg_util`, `wmg_rest_api`)
- Columns: Snake_case with prefixes:
  - `S[1-18]`: Strokes per hole
  - `PAR[1-18]`: Under par score per hole
  - `CS[1-18]` or `H[1-18]`: Course par per hole

### File Organization
- Installation scripts use `_ins.sql` pattern for main installers
- APEX exports follow `f[app_id].sql` pattern
- Package files use `.pks` (spec) and `.pkb` (body) extensions
- Test files use `test_*.sql` pattern

### Discord Bot Structure
```
bots/src/
├── commands/          # Slash command handlers
├── services/          # Business logic services
├── config/           # Configuration management
├── utils/            # Utility classes (Logger, ErrorHandler, etc.)
└── tests/            # Test suites
```

## Development Workflow

1. Database changes go in `install/` for new objects, `sql/` for modifications
2. PL/SQL logic goes in `packages/` with proper spec/body separation
3. APEX changes exported to `apex/` directory
4. REST endpoints defined in `ords/` with installation scripts
5. Bot changes in `bots/src/` with proper service layer separation