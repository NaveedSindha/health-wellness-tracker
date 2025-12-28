from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date, datetime

db = SQLAlchemy() # Initialize SQLAlchemy ORM instance

# ------------------------------
# User Model
# ------------------------------
class User (db.Model):
    """
    Represents a registered user in the application.
    Stores authentication credentials and related health logs.
    """
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    logs = db.relationship('HealthLog', backref='user', lazy=True) # A user can have many logs (One-to-Many relationship)

    def set_password(self, password):
        """
        Hashes the user's password and stores it securely.
        Uses PBKDF2 SHA-256 algorithm for strong hashing.
        """
        self.password_hash = generate_password_hash(
            password,
            method='pbkdf2:sha256'
        )
    
    def check_password(self, password):
        """
        Verifies apassword against the stored hashed password.
        Returns True if valid, False otherwise.
        """
        return check_password_hash(self.password_hash, password)

# ------------------------------
# HealthLog Model
# ------------------------------
class HealthLog(db.Model):
    """
    Represents a daily health log for a user.
    Tracks exercise, sleep, water intake, mood, meals, stress, and screen time.
    """
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    exercise_minutes = db.Column(db.Integer, default=0)
    sleep_hours = db.Column(db.Float, default=0)
    water_cups = db.Column(db.Integer, default=0)
    mood = db.Column(db.Integer, default=3) # scale 1-5
    meals = db.Column(db.Integer, default=3)
    stress = db.Column(db.Integer, default=3) # scale 1-5
    screen_time_hours = db.Column(db.Float, default=0)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

      # Make sure their is only one log per user per date
    __table_args__ = (
        db.UniqueConstraint('date', 'user_id', name='unique_log_per_user'),
    )

    def healthScore(self):
        """
        Computes a professional, realistic health score out of 100.
        Weighted categories:
        - Sleep: 25 pts (7-9 hrs ideal, small penalty for oversleep)
        - Exercise: 25 pts (30-60 min ideal)
        - Water: 15 pts (6-8 cups ideal)
        - Mood: 10 pts (1-5 scale)
        - Meals: 10 pts (3 meals ideal)
        - Stress: 10 pts (lower is better)
        - Screen Time: 5 pts (2-4 hrs ideal, penalty if above 6 hrs)
        """
        sleep_ideal = 8 # 7-9 hours is ideal
        
        sleep_score = max(0, min(self.sleep_hours / sleep_ideal, 1)) * 25
        
        if self.sleep_hours > 9:  # penalize oversleep slightly
            sleep_score -= (self.sleep_hours - 9) * 2
            sleep_score = max(sleep_score, 0)
        
        exercise_score = min(self.exercise_minutes / 30, 2) * 12.5  # max 25 pts
        if self.exercise_minutes > 60:
            exercise_score = 25
        
        # Water: 6-8 cups ideal
        water_score = min(self.water_cups / 8, 1) * 15
        
         # Mood: 1-5 scale
        mood_score = min(self.mood / 5, 1) * 10
        
        meals_score = min(self.meals / 3, 1) * 10 # 3 meals ideal
        
        stress_score = max(0, 5 - self.stress) / 5 * 10 # lower is better
        
        # Screen time: ideal 2-4 hrs, penalize heavily above 6 hrs
        if self.screen_time_hours <= 4:
            screen_score = 5
        elif self.screen_time_hours <= 6:
            screen_score = 3
        
        else:
            screen_score = max(0, 5 - (self.screen_time_hours - 4))  # heavy penalty
            screen_score = max(screen_score, 0)
        
        total = sleep_score + exercise_score + water_score + mood_score + meals_score + stress_score + screen_score
        return round(total)
        
    def to_dict(self):
        """
        Converts the HealthLog object to a JSON-serializable dictionary.
        Includes the calculated health score.
        """
        return {
            'date': self.date.isoformat(),
            'exercise': self.exercise_minutes,
            'sleep': self.sleep_hours,
            'water': self.water_cups,
            'mood': self.mood,
            'meals': self.meals,
            'stress': self.stress,
            'screen_time': self.screen_time_hours,
            'health_score': self.healthScore()
        }

# ------------------------------
# Goal Model
# ------------------------------
class Goal (db.Model):
    """
    Represents a health goal for a user.
    Tracks type (exercise, sleep, water, mood, meals, stress, screen time),
    target value, period (daily/weekly/monthly), and completion status.
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    type = db.Column(db.String(50), nullable=False)  # example: exercise, sleep, water, custom
    target_value = db.Column(db.Integer, nullable=False) # target amount for goal
    period = db.Column(db.String(20), nullable=False)  # daily, weekly, monthly

    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.Date, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    start_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='goals') # Relationship to user

    def to_dict(self):
        """
        Converts the Goal object to a JSON-serializable dictionary.
        """
        return {
            'id': self.id,
            'type': self.type,
            'target_value': self.target_value,
            'period': self.period
        }
