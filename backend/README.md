# Thesis Backend - Task Management System

A modern, scalable REST API for a comprehensive task management system, built with **NestJS**, **Prisma ORM** and **PostgreSQL**.

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Development](#development)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Contributors](#contributors)
- [License](#license)

## 🎯 Overview

This backend system is the backbone of a task management system and offers the following features:

- **User Management**: Authentication, roles & permissions
- **Classes & Teachers**: Management of classes, students and teaching staff
- **Task Management**: Create, manage and track tasks
- **Chat System**: Real-time communication between users
- **Document Management**: Store, share and manage documents
- **Notifications**: Event-based notifications
- **Scheduling System**: Management of lesson plans and time slots

## 🛠️ Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: NestJS 10+
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5+
- **Authentication**: JWT (Passport.js)
- **Testing**: Jest, Supertest
- **Linting**: ESLint, Prettier
- **Validation**: class-validator, class-transformer

## ✅ Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **PostgreSQL**: v14 or higher
- **Git**: For version control

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/kiDra94/diplom-arbeit.git
cd diplom-arbeit/backend
```

### 2. Install dependencies

```bash
npm install
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/diplom_arbeit

# JWT Secret
JWT_SECRET=your-super-secret-key-change-this-in-production

# JWT Expiration
JWT_EXPIRATION=24h

# Server Port
PORT=3000

# Node Environment
NODE_ENV=development
```

## 🗄️ Database Setup

### Initialize the Database

```bash
# Run database migrations
npm run prisma:migrate:dev

# Alternatively: With a name for the new migration
npx prisma migrate dev --name "migration_name"
```

### Prisma Studio (GUI for Database Data)

```bash
npm run prisma:studio
```

This opens a graphical interface at `http://localhost:5555` for managing database entries.

## 🚀 Development

### Start Development Server

```bash
# With watch mode (Hot Reload)
npm run start:dev

# Compile and run once
npm run start

# Production build
npm run build
npm run start:prod
```

The server runs by default at `http://localhost:3000`

### Available NPM Scripts

```bash
npm run start           # Start the application
npm run start:dev       # Start with watch mode
npm run start:debug     # Debug mode with Inspector
npm run start:prod      # Production mode
npm run build          # Build for production
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

## 🧪 Testing

### Run Unit Tests

```bash
npm run test
npm run test:watch     # Watch mode
npm run test:cov       # With coverage report
```

### Run E2E Tests

```bash
npm run test:e2e
npm run test:e2e:watch # Watch mode
```

### Auth Throttle E2E Tests

```bash
npm run test:e2e -- auth-throttle
```

## 📚 API Documentation

### Swagger/OpenAPI

The API documentation is automatically available at the following URL:

```
http://localhost:3000/api/docs
```

### Main Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - Register new user
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - User logout

#### Users
- `GET /users` - Get all users
- `GET /users/:id` - Get user details
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

#### Classes
- `GET /classes` - Get all classes
- `POST /classes` - Create new class
- `GET /classes/:id` - Get class details
- `PUT /classes/:id` - Update class

#### Tasks
- `GET /tasks` - Get all tasks
- `POST /tasks` - Create new task
- `GET /tasks/:id` - Get task details
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task

#### Documents
- `GET /documents` - Get all documents
- `POST /documents` - Upload document
- `GET /documents/:id` - Download document
- `DELETE /documents/:id` - Delete document

#### Chat
- `POST /chat-rooms` - Create chat room
- `GET /chat-rooms` - Get all chat rooms
- `POST /chat-messages` - Send message
- `GET /chat-messages/:roomId` - Get messages from room

For a complete list of all endpoints see Swagger documentation.

## 📁 Project Structure

```
src/
├── modules/                    # Business logic modules
│   ├── auth/                   # Authentication & JWT
│   ├── users/                  # User management
│   ├── classes/                # Class management
│   ├── students/               # Student management
│   ├── teachers/               # Teacher management
│   ├── tasks/                  # Task management
│   ├── documents/              # Document management
│   ├── chat-rooms/             # Chat system
│   ├── notifications/          # Notifications
│   ├── roles/                  # Role management
│   ├── permissions/            # Permission management
│   └── ...                     # Additional modules
├── prisma/                     # Prisma service
├── common/                     # Shared utilities/Guards
├── app.module.ts              # Root module
├── app.controller.ts          # Root controller
├── main.ts                    # Entry point
└── ...

prisma/
├── schema.prisma              # Database schema
├── migrations/                # Database migrations
└── seeds/                     # Seed data

test/
├── app.e2e-spec.ts           # E2E tests
└── jest-e2e.json             # Jest configuration
```

## � Deployment

When you're ready to deploy your NestJS application to production, there are several options available. For cloud-based deployment, we recommend **Mau** - the official platform for deploying NestJS applications on AWS.

### Deploy with Mau (Recommended)

Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
# Install Mau globally
npm install -g @nestjs/mau

# Deploy your application
mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure. The deployment involves:

1. Building your NestJS application
2. Uploading to AWS infrastructure
3. Setting up database connections
4. Configuring environment variables
5. SSL/TLS certificate management

### General Deployment Guidelines

When deploying to production:

1. Make sure all environment variables are properly configured
2. Build the application: `npm run build`
3. Run production mode: `npm run start:prod`
4. Ensure database migrations are applied: `npm run prisma:migrate:deploy`
5. Set up monitoring and logging
6. Configure backups for your PostgreSQL database

For more information on deployment, visit the [NestJS Deployment Documentation](https://docs.nestjs.com/deployment).

## �👥 Contributors

- **Ereny** - Backend Development
- **Drazen** - Backend Development

## 📄 License

This project is part of a thesis and is subject to school guidelines.

---




