# 🎬 Movies App

A full-stack movie browsing application with a React frontend and Node.js/Express backend, deployed on AWS with infrastructure managed by Terraform.

## 📋 Table of Contents

- [Features](#features)
- [Live Deployment](#live-deployment)
- [Architecture](#architecture)
- [Local Development](#local-development)
- [Docker Setup](#docker-setup)
- [Manual Setup](#manual-setup)
- [Deployment](#deployment)
- [Infrastructure](#infrastructure)
- [API Documentation](#api-documentation)

## ✨ Features

- **Browse Movies**: View all movies with pagination
- **Filter by Genre**: Select from 14 different genres (Action, Comedy, Drama, etc.)
- **Filter by Year**: Browse movies from 1920 to present
- **Movie Details**: View detailed information including ratings, budget, and cast
- **OMDB Integration**: Fetches additional ratings and metadata from OMDB API
- **Responsive Design**: Clean, modern UI that works on all devices

## 🌐 Live Deployment

The application is currently deployed on AWS with the following URLs:

### Frontend
**URL**: https://dwkpann1b246g.cloudfront.net

The frontend is hosted on:
- **S3**: Static files stored in S3 bucket
- **CloudFront**: Global CDN for fast delivery

### Backend API
**HTTPS URL**: https://movies-app-be-alb-dev-1617446654.us-east-1.elb.amazonaws.com/api
**HTTP URL**: http://movies-app-be-alb-dev-1617446654.us-east-1.elb.amazonaws.com/api

The backend is hosted on:
- **ECS Fargate**: Serverless container orchestration
- **Application Load Balancer**: HTTPS/HTTP load balancing

### ⚠️ Self-Signed Certificate Notice

The backend uses a **self-signed SSL certificate** for testing purposes. To access the application:

#### First-Time Setup (Required)

1. **Open the backend URL directly** in your browser:
   ```
   https://movies-app-be-alb-dev-1617446654.us-east-1.elb.amazonaws.com/api/heartbeat
   ```

2. **You'll see a security warning**. This is expected with self-signed certificates.

3. **Accept the certificate**:
   - **Chrome**: Click "Advanced" → "Proceed to ... (unsafe)"
   - **Firefox**: Click "Advanced" → "Accept the Risk and Continue"
   - **Safari**: Click "Show Details" → "visit this website"

4. **You should see**: `{"status":"ok"}` - This means the certificate is now trusted

5. **Now access the frontend**: https://dwkpann1b246g.cloudfront.net

The frontend will now be able to make API calls to the backend successfully!

#### Why Self-Signed Certificate?

- ✅ **Testing/Development**: Enables HTTPS for testing without purchasing a domain
- ✅ **Mixed Content Fix**: CloudFront (HTTPS) requires backend to be HTTPS
- ⚠️ **Not for Production**: For production, use a proper SSL certificate from a Certificate Authority

#### Upgrading to Production Certificate

For production deployment, see [infra/HTTPS-SETUP.md](infra/HTTPS-SETUP.md) for instructions on:
- Using AWS Certificate Manager with a custom domain
- Setting up Route53 DNS
- Configuring proper SSL/TLS certificates

## 🏗️ Architecture

```
┌─────────────────┐
│   CloudFront    │  Frontend (React + Vite)
│   (CDN/HTTPS)   │  https://dwkpann1b246g.cloudfront.net
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │   S3   │  Static Assets
    └────────┘

         │ HTTPS API Calls
         ▼

┌─────────────────┐
│      ALB        │  Load Balancer (HTTPS)
│  (+ Self-Signed │  https://movies-app-be-alb-dev-*.elb.amazonaws.com
│   Certificate)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ECS Fargate    │  Backend (Node.js + Express)
│   Container     │  - SQLite database
└─────────────────┘  - OMDB API integration
```

### Technology Stack

#### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety

#### Backend
- **Node.js 20** - Runtime
- **Express** - Web framework
- **SQLite** (better-sqlite3) - Database
- **Zod** - Schema validation
- **TypeScript** - Type safety

#### Infrastructure
- **AWS ECS Fargate** - Container orchestration
- **AWS Application Load Balancer** - Load balancing + HTTPS
- **AWS S3** - Static file hosting
- **AWS CloudFront** - CDN
- **AWS ECR** - Container registry
- **Terraform** - Infrastructure as Code

## 🚀 Local Development

### Prerequisites

- **Node.js 20+** and npm
- **Docker** and **Docker Compose** (for Docker setup)
- **Git**

## 🐳 Docker Setup (Recommended)

The easiest way to run the entire application locally is using Docker Compose.

> **Note**: This guide uses `docker-compose` command syntax. If you have Docker Compose V2 installed, you can use `docker compose` (without hyphen) instead. Both syntaxes work the same way.

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd movies-app
   ```

2. **Start everything with one command**:
   ```bash
   docker-compose up --build
   ```

   This will:
   - Build the backend Docker image
   - Build the frontend Docker image
   - Start both services
   - Set up networking between them
   - Enable hot-reloading for development

3. **Access the application**:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:4000/api
   - **Health Check**: http://localhost:4000/api/heartbeat

4. **Stop the application**:
   ```bash
   docker-compose down
   ```

### Docker Compose Commands

```bash
# Start in detached mode (background)
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild containers after code changes
docker-compose up --build

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes
docker-compose down -v
```

### What's Included

The `docker-compose.yml` configures:

- **Backend Service**:
  - Port 4000 exposed
  - SQLite database mounted for persistence
  - Health checks enabled
  - OMDB API integration

- **Frontend Service**:
  - Port 5173 exposed
  - Hot-reload enabled (source files mounted)
  - Waits for backend to be healthy before starting
  - Configured to connect to backend at `http://localhost:4000/api`

### Development Workflow with Docker

1. **Make changes** to your source code
2. **Changes auto-reload**:
   - Frontend: Vite hot-reload (instant)
   - Backend: Requires restart (`docker-compose restart backend`)
3. **View logs**: `docker-compose logs -f`
4. **Run tests**: `docker-compose exec backend npm test`

## 🔧 Manual Setup (Without Docker)

If you prefer to run services manually without Docker:

### Backend Setup

1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Verify environment variables** (`.env` file):
   ```env
   PORT=4000
   DATABASE_PATH=./db/movies.db
   RATINGS_API_MODE=imdb
   OMDB_API_BASE=https://www.omdbapi.com
   OMDB_API_KEY=9d7079bb
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

   Backend will be available at http://localhost:4000/api

5. **Run tests**:
   ```bash
   npm test
   ```

### Frontend Setup

1. **Navigate to web directory**:
   ```bash
   cd web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Verify environment variables** (`.env` file):
   ```env
   VITE_API_BASE=http://localhost:4000/api
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

   Frontend will be available at http://localhost:5173

5. **Build for production**:
   ```bash
   npm run build
   ```

   Production files will be in `dist/` directory

### Running Both Manually

You'll need **two terminal windows**:

**Terminal 1 - Backend**:
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd web
npm run dev
```

Then open http://localhost:5173 in your browser.

## 📦 Deployment

The application uses **GitHub Actions** for CI/CD automation.

### Automated Deployment (GitHub Actions)

Push to `main` branch triggers automatic deployment:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

GitHub Actions will:
1. Build and push backend Docker image to ECR
2. Deploy new ECS task definition
3. Build frontend assets
4. Upload to S3
5. Invalidate CloudFront cache

See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) for details.

### Manual Deployment

If you need to deploy manually:

#### Backend

```bash
# 1. Authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 212612999379.dkr.ecr.us-east-1.amazonaws.com

# 2. Build Docker image
cd server
docker build -t movies-app-212612999379-backend-dev .

# 3. Tag image
docker tag movies-app-212612999379-backend-dev:latest 212612999379.dkr.ecr.us-east-1.amazonaws.com/movies-app-212612999379-backend-dev:latest

# 4. Push to ECR
docker push 212612999379.dkr.ecr.us-east-1.amazonaws.com/movies-app-212612999379-backend-dev:latest

# 5. Update ECS service (triggers new deployment)
aws ecs update-service --cluster movies-app-cluster-dev --service movies-app-backend-service-dev --force-new-deployment
```

#### Frontend

```bash
# 1. Build production assets
cd web
npm run build

# 2. Upload to S3
aws s3 sync dist/ s3://movies-app-212612999379-frontend-dev --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E2VBVV3DYB27IM --paths "/*"
```

### Deployment Best Practices

- ✅ **Use GitHub Actions** for consistent deployments
- ✅ **Manual deployments** are safe for S3/CloudFront (files aren't tracked by Terraform)
- ⚠️ **Avoid manual changes** to infrastructure (ALB, ECS, Security Groups) - use Terraform instead
- 📖 See [infra/DEPLOYMENT-WORKFLOW.md](infra/DEPLOYMENT-WORKFLOW.md) for detailed guidance

## 🏗️ Infrastructure

Infrastructure is managed with **Terraform** in the `infra/` directory.

### Prerequisites

- **Terraform** 1.5+
- **AWS CLI** configured with credentials
- **AWS Account** with appropriate permissions

### Infrastructure Setup

1. **Navigate to infra directory**:
   ```bash
   cd infra
   ```

2. **Initialize Terraform**:
   ```bash
   terraform init
   ```

3. **Review the plan**:
   ```bash
   terraform plan
   ```

4. **Apply infrastructure**:
   ```bash
   terraform apply
   ```

### Infrastructure Components

- **VPC**: Custom VPC with public/private subnets
- **ECS Cluster**: Fargate cluster for backend
- **ALB**: Application Load Balancer with HTTPS
- **S3 Buckets**: Frontend hosting + Terraform state
- **CloudFront**: CDN distribution
- **ECR**: Docker image registry
- **Security Groups**: Network security
- **IAM Roles**: Service permissions
- **DynamoDB**: Terraform state locking

### Terraform Outputs

View deployed infrastructure URLs:

```bash
cd infra
terraform output
```

Key outputs:
- `cloudfront_url`: Frontend URL
- `alb_https_url`: Backend API URL (HTTPS)
- `ecr_repository_url`: Docker registry URL

### Infrastructure Documentation

- **[infra/BOOTSTRAP.md](infra/BOOTSTRAP.md)**: Initial setup guide
- **[infra/STATE-FIX-SUMMARY.md](infra/STATE-FIX-SUMMARY.md)**: State management
- **[infra/HTTPS-SETUP.md](infra/HTTPS-SETUP.md)**: SSL/TLS setup
- **[infra/NO-STATE-DRIFT-EXPLANATION.md](infra/NO-STATE-DRIFT-EXPLANATION.md)**: State drift analysis

## 📚 API Documentation

### Base URLs

- **Local**: http://localhost:4000/api
- **Production**: https://movies-app-be-alb-dev-1617446654.us-east-1.elb.amazonaws.com/api

### Endpoints

#### Health Check
```
GET /api/heartbeat
```
Returns: `{"status":"ok"}`

#### List All Movies
```
GET /api/movies?page=1&perPage=50
```
Query params:
- `page` (optional, default: 1): Page number
- `perPage` (optional, default: 50, max: 200): Items per page

#### Get Movie Details
```
GET /api/movies/:imdbId
```
Returns detailed movie information including OMDB ratings.

#### Filter by Genre
```
GET /api/movies/genre/:genre?page=1&perPage=50
```
Path params:
- `genre`: Genre name (e.g., "Action", "Comedy", "Drama")

Query params:
- `page` (optional): Page number
- `perPage` (optional): Items per page

#### Filter by Year
```
GET /api/movies/year/:year?page=1&perPage=50&order=asc
```
Path params:
- `year`: Release year (e.g., 2020)

Query params:
- `page` (optional): Page number
- `perPage` (optional): Items per page
- `order` (optional, default: "asc"): Sort order ("asc" or "desc")

### Example Response

```json
{
  "page": 1,
  "perPage": 50,
  "total": 1234,
  "items": [
    {
      "imdbId": "tt0111161",
      "title": "The Shawshank Redemption",
      "genres": ["Drama"],
      "releaseDate": "1994-09-23",
      "budget": {
        "raw": 25000000,
        "usd": "$25,000,000"
      }
    }
  ]
}
```

## 🧪 Testing

### Backend Tests

```bash
cd server
npm test
```

Tests are written using **Vitest** and cover:
- Movie repository (database queries)
- Movie service (business logic)
- Ratings service (OMDB integration)

Test files:
- `src/repositories/movieRepository.test.ts`
- `src/services/movieService.test.ts`
- `src/services/ratingsService.test.ts`

## 📁 Project Structure

```
movies-app/
├── web/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/               # Page components
│   │   │   ├── MoviesPage.tsx   # All movies
│   │   │   ├── GenrePage.tsx    # Genre filter
│   │   │   ├── YearPage.tsx     # Year filter
│   │   │   └── MovieDetails.tsx # Movie details
│   │   ├── main.tsx             # App entry point
│   │   └── utils.ts             # API client
│   ├── .env                     # Local dev environment
│   ├── .env.production          # Production environment
│   ├── Dockerfile.dev           # Dev Docker image
│   └── package.json
│
├── server/                       # Backend (Node.js + Express)
│   ├── src/
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic
│   │   ├── repositories/        # Database access
│   │   └── index.ts             # Server entry point
│   ├── db/
│   │   └── movies.db            # SQLite database
│   ├── Dockerfile               # Production Docker image
│   ├── .env                     # Environment variables
│   └── package.json
│
├── infra/                        # Infrastructure (Terraform)
│   ├── main.tf                  # Main configuration
│   ├── variables.tf             # Input variables
│   ├── outputs.tf               # Output values
│   ├── backend.tf               # Remote state config
│   ├── vpc.tf                   # Network configuration
│   ├── ecs-backend.tf           # Container orchestration
│   ├── alb.tf                   # Load balancer
│   ├── s3-frontend.tf           # Static hosting
│   ├── cloudfront.tf            # CDN
│   ├── terraform.tfvars         # Variable values
│   └── *.md                     # Documentation
│
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD pipeline
│
├── docker-compose.yml           # Local development orchestration
└── README.md                    # This file
```

## 🔐 Environment Variables

### Backend (`server/.env`)

```env
PORT=4000                                           # Server port
DATABASE_PATH=./db/movies.db                       # SQLite database path
RATINGS_API_MODE=imdb                              # Rating source (imdb or omdb)
OMDB_API_BASE=https://www.omdbapi.com              # OMDB API endpoint
OMDB_API_KEY=9d7079bb                              # OMDB API key
```

### Frontend (`web/.env`)

```env
# Local development
VITE_API_BASE=http://localhost:4000/api
```

### Frontend Production (`web/.env.production`)

```env
# Production deployment
VITE_API_BASE=https://movies-app-be-alb-dev-1617446654.us-east-1.elb.amazonaws.com/api
```

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `npm test`
4. Commit: `git commit -m "Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create a Pull Request

## 📝 License

This project is for demonstration purposes.

## 🆘 Troubleshooting

### "Failed to fetch" error in production

**Cause**: Self-signed certificate not accepted by browser

**Solution**: Follow the [Self-Signed Certificate Setup](#️-self-signed-certificate-notice) steps above

### "Mixed Content" error

**Cause**: Frontend (HTTPS) trying to call backend (HTTP)

**Solution**: Use the HTTPS backend URL in `.env.production`

### Docker containers won't start

**Cause**: Port already in use

**Solution**:
```bash
# Check what's using the port
lsof -i :4000
lsof -i :5173

# Stop docker-compose and try again
docker-compose down
docker-compose up --build
```

### Terraform state lock error

**Cause**: DynamoDB table not found or backend misconfigured

**Solution**: See [infra/STATE-FIX-SUMMARY.md](infra/STATE-FIX-SUMMARY.md)

### Frontend shows blank page

**Cause**: Environment variable not set correctly

**Solution**:
```bash
# Check .env file exists
cat web/.env

# Should contain:
VITE_API_BASE=http://localhost:4000/api

# Restart dev server
cd web
npm run dev
```

## 📧 Support

For issues and questions:
- Check the [Troubleshooting](#-troubleshooting) section
- Review documentation in `infra/*.md`
- Check GitHub Issues

---

Built with ❤️ using React, Node.js, and AWS
