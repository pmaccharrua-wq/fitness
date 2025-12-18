# AI Fitness Planner

## Overview

AI Fitness Planner is a personalized fitness and nutrition application powered by Azure OpenAI. The app generates customized 30-day fitness plans and nutrition guidelines based on user profiles, including body metrics, fitness goals, available equipment, and physical limitations. The system uses scientific models (Mifflin-St Jeor equation, ACSM guidelines, ISSN/DGA nutrition standards) to create evidence-based workout and meal plans.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with CSS custom properties for theming
- **UI Components**: shadcn/ui component library (New York style) with Radix UI primitives
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Build Tool**: Vite with custom plugins for meta image handling

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES Modules
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Development**: tsx for TypeScript execution, Vite middleware for HMR

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Tables**: 
  - `user_profiles` - User demographics, goals, equipment, impediments
  - `fitness_plans` - AI-generated 30-day plans stored as JSONB
  - `exercise_progress` - Daily workout completion and difficulty feedback

### AI Integration
- **Provider**: Azure OpenAI Service
- **Purpose**: Generates personalized fitness and nutrition plans
- **Configuration**: Environment variables for API key, endpoint, deployment name, and version
- **Output Format**: Structured JSON following a defined schema for parsing
- **CRITICAL RULE - GPT-5 Parameters**:
  - Use `max_completion_tokens` (NOT `max_tokens`)
  - Use `temperature: 1` (required for GPT-5)
  - API version: `2025-01-01-preview`

### Incremental Plan Generation (7-day chunks)
- **Initial Generation**: Creates 7 days of workout + 7 days of nutrition in 3 steps
  - Step 1: Workout days 1-4
  - Step 2: Workout days 5-7
  - Step 3: Nutrition plan (7 days)
- **Extension Generation**: User can request +7 more days on-demand
  - API: `POST /api/plans/:id/extend` to start, `POST /api/plans/:id/extend-chunk` for each step
  - Same 3-step pattern for extensions
- **Plan Schema Fields**:
  - `generatedWorkoutDays` - Number of workout days generated so far
  - `generatedNutritionDays` - Number of nutrition days generated so far
  - `generationStatus` - "idle", "extending", "error"
- **Frontend Trigger**: "Gerar +7 Dias" button appears when user is within 2 days of generated limit

### Key Design Patterns
- **Monorepo Structure**: `client/`, `server/`, `shared/` directories
- **Path Aliases**: `@/` for client source, `@shared/` for shared code
- **Type Safety**: Zod schemas derived from Drizzle tables using `drizzle-zod`
- **Validation**: Request validation with Zod, error formatting with `zod-validation-error`

## External Dependencies

### AI Services
- **Azure OpenAI**: Primary AI provider for generating fitness/nutrition plans
  - Required env vars: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`

### Database
- **PostgreSQL**: Primary data store
  - Required env var: `DATABASE_URL`
  - ORM: Drizzle with `drizzle-kit` for migrations

### UI Libraries
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **Recharts**: Chart visualization (via shadcn chart component)

### Development Tools
- **Replit Plugins**: Cartographer, dev banner, runtime error overlay (dev only)
- **PostCSS/Autoprefixer**: CSS processing