# AI Productivity Planner

Personal productivity web application for managing goals, tasks and focused work sessions.

The application combines traditional productivity tools with AI-generated reports to help users review their progress and plan what to work on next.

## Features

* **Goals** — Create and manage weekly and monthly goals.
* **Tasks** — Break goals down into smaller tasks and track their status.
* **Pomodoro** — Track focused work sessions and associate them with tasks.
* **Dashboard** — View current goals, pending tasks, completed work and productivity statistics.
* **Daily planning** — Review what has been completed, what remains pending and what should be prioritized during the day.
* **Weekly reports** — Summarize the work completed during the week and identify unfinished goals.
* **Monthly reports** — Review monthly progress and define priorities for the following month.
* **AI reports** — Use an LLM to analyze productivity data and generate structured recommendations.

## AI Integration

The AI is not implemented as a chatbot.

Instead, the backend collects relevant application data and builds a structured context containing information such as:

* Current goals
* Tasks and their status
* Completed work
* Pomodoro sessions
* Previous activity
* Weekly and monthly progress

This information is sent to an LLM, which returns a predefined JSON structure.

Example:

```json
{
  "summary": "Good progress this week...",
  "completed": [
    "Finish authentication"
  ],
  "pending": [
    "Write integration tests"
  ],
  "today": [
    "Implement task filtering"
  ],
  "recommendations": [
    "Focus on completing the remaining backend tests"
  ]
}
```

The backend validates the response before sending it to the frontend.

This keeps the AI integration separated from the presentation layer and allows the frontend to work with a predictable data structure.

## Architecture

The project follows a modular monolithic architecture.

```text
┌─────────────────────────────┐
│            React            │
│       TypeScript / CSS      │
└──────────────┬──────────────┘
               │
              REST
               │
┌──────────────▼──────────────┐
│        Spring Boot          │
│            Java             │
│                             │
│  Auth                       │
│  Goals                      │
│  Tasks                      │
│  Pomodoro                   │
│  Reports                    │
│  AI                         │
└──────────────┬──────────────┘
               │
               ▼
        ┌─────────────┐
        │ PostgreSQL  │
        └─────────────┘
```

The backend is organized around application domains rather than technical layers alone.

```text
backend/
├── auth/
├── goals/
├── tasks/
├── pomodoro/
├── reports/
├── ai/
└── notifications/
```

## Tech Stack

### Frontend

* React
* TypeScript
* Tailwind CSS

### Backend

* Java
* Spring Boot
* Spring Web
* Spring Data JPA
* Hibernate
* Spring Security

### Database

* PostgreSQL

### Testing

* JUnit 5
* Mockito
* Testcontainers

### Development & Deployment

* Docker
* Docker Compose
* GitHub Actions

### AI

* LLM API
* Structured JSON responses
* JSON Schema validation

## Testing

The project includes both unit and integration tests.

Unit tests are used for business logic and services, while integration tests verify the interaction between the application and external components such as the database.

Testcontainers is used to run integration tests against a real PostgreSQL instance rather than relying exclusively on mocks.

Example areas covered by tests:

* Goal management
* Task management
* Pomodoro sessions
* Progress calculations
* Report generation
* AI context generation
* REST endpoints
* Database persistence

## Scheduled Tasks

The application will use scheduled backend jobs to generate reports automatically.

### Daily

A daily report containing:

* Weekly objectives
* Today's priorities
* Completed work
* Pending tasks
* Recommended actions

### Weekly

A summary of:

* Completed objectives
* Unfinished tasks
* Total Pomodoro sessions
* Progress during the week
* Priorities for the following week

### Monthly

A higher-level summary including:

* Monthly achievements
* Unfinished objectives
* Productivity trends
* Completed work
* Priorities for the following month

## Project Structure

```text
ai-productivity-planner/
│
├── frontend/
│   └── React application
│
├── backend/
│   └── Spring Boot application
│
├── docker/
│   └── Docker configuration
│
└── README.md
```

## Roadmap

### Core

* [ ] Authentication
* [ ] Goal management
* [ ] Task management
* [ ] Pomodoro timer
* [ ] Dashboard
* [ ] PostgreSQL integration

### Backend

* [ ] REST API
* [ ] Validation
* [ ] Error handling
* [ ] Authentication & authorization
* [ ] Unit tests
* [ ] Integration tests
* [ ] Testcontainers

### AI

* [ ] AI context generation
* [ ] Structured responses
* [ ] Response validation
* [ ] Daily reports
* [ ] Weekly reports
* [ ] Monthly reports
* [ ] Recommendations

### Infrastructure

* [ ] Docker Compose
* [ ] CI pipeline
* [ ] Production deployment
* [ ] Application monitoring

## Running the Project

The project is currently under development.

Once the initial setup is complete, the application will be runnable locally using Docker Compose:

```bash
docker compose up
```

Environment-specific configuration will be provided through environment variables.

```env
DATABASE_URL=
DATABASE_USERNAME=
DATABASE_PASSWORD=

JWT_SECRET=

AI_API_KEY=
AI_MODEL=
```

## Status

🚧 **Work in progress**

The project is being developed as a personal full-stack project, with a focus on backend development, testing, architecture and AI integration.
