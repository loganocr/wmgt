# WMGT Product Overview

WMGT (Walkabout Mini Golf Tournament) is a comprehensive tournament management system for the VR game Walkabout Mini Golf. The system manages weekly tournaments with player registration, scoring, and leaderboards.

## Core Components

- **Oracle APEX Web Application**: Main tournament management interface (App ID 200)
- **Discord Bot**: Player registration and tournament interaction via Discord slash commands
- **Oracle Database**: Core data storage with comprehensive tournament, player, and scoring data
- **ORDS REST APIs**: Backend services for Discord bot and external integrations

## Key Features

- Tournament session management with timezone-aware scheduling
- Player registration and room assignments
- Course voting and leaderboard tracking
- Automated scoring verification and rank calculations
- Discord integration for player interactions
- Comprehensive reporting and analytics

## Data Model

The system centers around tournaments containing sessions, with players registered for specific time slots. Each session includes two courses, commonly one easy and one hard mode, but it's possible to have sessions with two hard courses. Players submit rounds (18-hole scores). The system tracks detailed stroke-by-stroke data and calculates under-par scores automatically. Player skill level is also tracked via ranks. A player starts as NEW and then progresses from Amateurs, Semi-Pro, Pro, and Elite.

## Target Users

- Tournament administrators managing weekly events
- VR golf players participating in tournaments
- Discord community members interacting via bot commands and participate in dedicated discussion channels.