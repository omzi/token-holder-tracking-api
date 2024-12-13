<p align="center" id="top">
	<h1 align="center">Token Holder Tracking API</h1>
	<p align="center">🔄 Real-time blockchain token holder tracking and analytics system built with NestJS</p>
</p>

<div align="center">

![](https://img.shields.io/github/stars/omzi/token-holder-tracking-api.svg?color=ff0)
![](https://img.shields.io/github/forks/omzi/token-holder-tracking-api.svg?color=ff0)
![](https://img.shields.io/github/languages/top/omzi/token-holder-tracking-api?color=222FE6)
![](https://img.shields.io/github/languages/code-size/omzi/token-holder-tracking-api?color=222FE6)
![](https://img.shields.io/github/issues/omzi/token-holder-tracking-api.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?color=222FE6)](https://opensource.org/licenses/MIT)
![](https://img.shields.io/twitter/follow/0xOmzi.svg?style=social&label=@0xOmzi)

</div>

## 📜 About

A robust NestJS application that synchronizes with the FraxScan blockchain to track token holders and their balances in real-time. Features automatic synchronization, high-precision balance tracking, and holder analytics.

## ⚡ Key Features

- [x] Real-time blockchain synchronization
- [x] High-precision balance tracking
- [x] Automatic periodic updates (10-second intervals)
- [x] Paginated holder data access
- [x] Flexible sorting and filtering
- [x] Percentage holdings calculation
- [x] RESTful API endpoints
- [x] Swagger API documentation

## 🏗 Architecture

The system is built around two core modules:

### 🔄 Sync Module
- Blockchain event synchronization
- Balance management
- Progress tracking (CLI)
- Automated updates

### 📊 Holders Module
- Paginated data access
- Percentage analytics
- Sorting capabilities

## 🛠 Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **API**: FraxScan Blockchain API
- **Libraries**: 
  - BigNumber.js (precision calculations)
  - Axios (API requests)
  - class-validator (input validation)
  - Swagger (API documentation)

## 🚀 Getting Started

1. **Clone the repository**
```bash
git clone https://github.com/omzi/token-holder-tracking-api.git
cd token-holder-tracking-api
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the root directory:
```env
DATABASE_URL=# Your PostgreSQL connection string
FRAXSCAN_API_KEY=#Your FraxScan API key
PORT=3000
```

4. **Start the application**
```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## 🔌 API Endpoints

### GET /holders
Retrieve paginated list of token holders
- Query Parameters:
  - `page` (default: 1)
  - `limit` (default: 10, max: 100)
  - `sortBy` (options: balance, address, rank)
  - `order` (options: asc, desc)

### POST /sync
Manually trigger blockchain synchronization

## 📚 API Documentation

Access the Swagger API documentation at `/api` when running the application.

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📦 Project Structure

```
src/
├── sync/              # Blockchain synchronization module
├── holders/           # Holder management module
├── entities/          # Database entities
└── dto/               # Data transfer objects
```

## 👥 **Contributors**

- [Omezibe Obioha](https://github.com/omzi/) (@0xOmzi)

## 📄 **License**

This project is licensed under the MIT License. See the [`LICENSE`](./LICENSE) file for more details.

## ❌ **Disclaimer**

You may experience rate limits, errors and/or bugs while testing out the application. Feel free to reach to me on Twitter/X ([@0xOmzi](https://x.com/0xOmzi/)) regarding any issue you might be facing.

---

<p align="center">
  <a href="#top">Back to Top ⬆️</a>
</p>