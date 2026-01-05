# Health & Wellness Tracker

A full-stack web application that allows users to track daily health habits, set goals, and visualize progress through analytics dashboards.

## Features
- User authentication (signup, login, logout)
- Daily health logging:
  - Exercise
  - Sleep
  - Water intake
  - Mood
  - Meals
  - Stress level
  - Screen time
- Goal tracking (daily / weekly / monthly)
- Automatic goal progress calculation
- Analytics dashboard with charts
- Health score calculation
- Secure password hashing

## Tech Stack
**Frontend**
- HTML5
- CSS3
- JavaScript
- Chart.js

**Backend**
- Python
- Flask
- Flask-SQLAlchemy
- SQLite

##  Setup Instructions

```bash
# Clone repository
git clone https://github.com/your-username/health-wellness-tracker.git
cd health-wellness-tracker

# Create virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

#Install Flask Requirements

pip install flask flask_sqlalchemy flask_cors

# Run app
python app.py
