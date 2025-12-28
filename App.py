from flask import Flask, request, jsonify, render_template, session, g, redirect, url_for
from models import db, User, HealthLog, Goal
from datetime import date, timedelta, datetime
from flask_cors import CORS  # allows frontend JS to talk to backend

# ------------------------------
# Flask App Initialization
# ------------------------------
app = Flask(__name__)
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",  # Improve security for session cookies
    SESSION_COOKIE_SECURE=False,   # MUST be False for localhost
)
CORS(app,  supports_credentials=True) # Enable CORS for frontend JS
app.secret_key = 'dev_secret_key' # Secret key for session management

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'  # SQLite database
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Create database tables if they don't exist
with app.app_context():
    db.create_all()

# ------------------------------
# User Session Management
# ------------------------------
@app.before_request
def load_user():
    """
    Loads the currently logged-in user before each request.
    Redirects unauthenticated users to login page unless accessing public paths.
    """
    
    # Check if session contains a logged-in user
    g.user = None
    if 'user_id' in session:
        g.user = User.query.get(session['user_id'])
    
    public_paths = ['/login', '/signup', '/static']

    # Redirect to login if the path is not public and user is not logged in
    if not g.user:
        if not any(request.path.startswith(p) for p in public_paths):
            return redirect(url_for('login'))

# ------------------------------
# Authentication Routes
# ------------------------------
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    """
    Handles user registration.
    GET: Render signup page
    POST: Create new user if username doesn't exist
    """
    if request.method =='GET':
        return render_template('signup.html')
    
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username exists'}), 400
    
    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Account created'})

@app.route('/login', methods=['GET', 'POST'])
def login():
    """
    Handles user login.
    GET: Render login page
    POST: Authenticate user and create session
    """
    if g.user:
        return redirect(url_for('home'))

    if request.method == 'GET':
        return render_template('login.html')
        
    data = request.json
    user = User.query.filter_by(username=data['username']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401

    session['user_id'] = user.id
    return jsonify({'message': 'Logged in'})

@app.route('/logout')
def logout ():
    """Logs out the current user by clearing session."""
    session.pop('user_id', None)
    return redirect(url_for('login'))

@app.route('/')
def home():
    """Render main home page (dashboard)."""
    return render_template('index.html')

# ------------------------------
# Health Log Routes
# ------------------------------
@app.route('/log', methods=['POST'])
def add_log():
    """
    Adds a new health log for the user.
    Ensures only one log per user per date.
    """
    data = request.json
    log_date = date.fromisoformat(data['date'])  # Convert string date to date object

     # Check if a log already exists for this date and user
    if HealthLog.query.filter_by(date=log_date, user_id=g.user.id).first():
        return jsonify({'message': 'Log exists'}), 400

    # Create new HealthLog object with values from frontend, using defaults if missing
    log = HealthLog(
        date=log_date,
        exercise_minutes=data.get('exercise_minutes', 0),
        sleep_hours=data.get('sleep_hours', 0),
        water_cups=data.get('water_cups', 0),
        mood=data.get('mood', 3),
        meals=data.get('meals', 3),
        stress=data.get('stress', 3),
        screen_time_hours=data.get('screen_time_hours', 0),
        user_id=g.user.id
    )

    # Add the new log to the database session and commit
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': 'Log added!'})
    

@app.route('/log/<log_date>', methods=['PUT'])
def update_log(log_date):
    """Update an existing health log by date."""
    data = request.json

    log_date = date.fromisoformat(log_date) # Convert URL parameter to date object

     # Retrieve the log to update
    log = HealthLog.query.filter_by(date=log_date, user_id=g.user.id).first()
    if not log:
        return jsonify({'message': 'Log not found'}), 404

    # Update each field only if provided in the request
    log.exercise_minutes = data.get('exercise_minutes', log.exercise_minutes)
    log.sleep_hours = data.get('sleep_hours', log.sleep_hours)
    log.water_cups = data.get('water_cups', log.water_cups)
    log.mood = data.get('mood', log.mood)
    log.meals = data.get('meals', log.meals)
    log.stress = data.get('stress', log.stress)
    log.screen_time_hours = data.get('screen_time_hours', log.screen_time_hours)

    db.session.commit()
    return jsonify({'message': 'Log updated!', 'log': log.to_dict()})


@app.route('/logs', methods=['GET'])
def get_logs():
    """Return all logs for the current user, sorted by date."""
    logs = HealthLog.query.filter_by(
        user_id=g.user.id
    ).order_by(HealthLog.date).all()

    return jsonify([log.to_dict() for log in logs])

@app.route('/log/<log_date>', methods=['GET'])
def get_log(log_date):
    """Return a single health log by date."""
    log_date = date.fromisoformat(log_date)
    log = HealthLog.query.filter_by(date = log_date).first()

    if not log:
        return jsonify({'message': 'Log not found'}), 404

    return jsonify(log.to_dict())

@app.route('/log/<log_date>', methods=['DELETE'])
def delete_log(log_date):
    """Delete a specific health log by date."""
    log = HealthLog.query.filter_by(
        date=date.fromisoformat(log_date),
        user_id=g.user.id
    ).first()

    if not log:
        return jsonify({'message': 'Not found'}), 404

    db.session.delete(log)
    db.session.commit()
    return jsonify({'message': 'Log deleted'})

@app.route('/analytics')
def analytics():
    """render analytics page for logged-in users"""
    if not g.user:
        return redirect(url_for('login'))
    return render_template('analytics.html')

def goal_progress(goal):
    """
    Calculate the progress of a goal by summing relevant log fields
    within the goal period (daily, weekly, monthly).
    """
    now = datetime.utcnow()
    start = goal.start_at  # exact start datetime of the goal

    # Calculate the end date of the goal based on its period
    if goal.period=='daily':
        end = start + timedelta(days=1)
    
    elif goal.period=='weekly':
        end = start + timedelta(days=7)

    elif goal.period=='monthly':
        end = start + timedelta(days=30)
    else:
        end = start + timedelta(days=1) # Default fallback

    # Query logs in the goal period
    logs = HealthLog.query.filter(
        HealthLog.user_id == goal.user_id,
        HealthLog.date >= start.date(),
        HealthLog.date < end.date()  # logs before end date
    ).all()
        
    if goal.type=='exercise':
        return sum(log.exercise_minutes for log in logs)
    
    elif goal.type=='sleep':
        return sum(log.sleep_hours for log in logs)
    
    elif goal.type=='water':
        return sum(log.water_cups for log in logs)
        
    elif goal.type == 'mood':
        
        return sum(log.mood for log in logs)
        

    elif goal.type == 'meals':
        return sum(log.meals for log in logs)
    
    elif goal.type == 'stress':
        
        return sum(log.stress for log in logs)  

    elif goal.type == 'screen_time':
        return sum(log.screen_time_hours for log in logs)
    
    return 0
    
@app.route('/goals')
def goals_page():
    """Render goals management page for logged-in users."""
    if not g.user:
        return redirect(url_for('login'))
    return render_template('goals.html')

@app.route('/api/goals', methods=['GET', 'POST'])
def goals():
    """Handles adding new goals and retrieving active goals."""
    if request.method=='POST':
        data = request.json
        goal = Goal(
            user_id=g.user.id,
            type=data['type'],
            target_value=data['target_value'],
            period=data['period'],
            start_at=datetime.utcnow()
        )

        db.session.add(goal)
        db.session.commit()

        goal_data = goal.to_dict()
        goal_data['progress'] = 0       # always start at 0
        goal_data['percentage'] = 0
        goal_data['completed'] = False

        return jsonify(goal_data)
    
    active_goals = Goal.query.filter_by(user_id=g.user.id, completed=False).all()

    result = []
    updated = False

    for goal in active_goals:
        progress = goal_progress(goal)

        if progress >= goal.target_value:
            goal.completed = True
            goal.completed_at = date.today()
            updated = True

        goal_data = goal.to_dict()
        goal_data['progress'] = progress
        goal_data['percentage'] = min(100, int((progress / goal.target_value) * 100))
        goal_data['completed'] = goal.completed
        result.append(goal_data)

    if updated:
        db.session.commit()
    
    return jsonify(result)

@app.route('/api/goals/<int:goal_id>', methods=['DELETE'])
def delete_goals (goal_id):
    """Delete a specific goal."""
    goal = Goal.query.filter_by(id=goal_id, user_id=g.user.id).first()

    if not goal:
        return jsonify({'message': 'Goal not found'}), 404
    
    db.session.delete(goal)
    db.session.commit()
    return jsonify({'message': 'Goal removed'})

@app.route('/change-password')
def change_password_page():
    """Render change password page."""
    if not g.user:
        return redirect(url_for('login'))

    return render_template('change_password.html')

# ------------------------------
# Change Password API
# ------------------------------
@app.route('/api/change-password', methods=['POST'])
def change_password():
    """
    Allows logged-in users to update their password.
    Verifies current password before updating.
    """
    data = request.get_json()
    current = data.get('current_password')

    new = data.get('new_password')

    if not current or not new:
        return jsonify({'message': 'Missing current or new password'}), 400

    if not g.user.check_password(current):
        return jsonify({'message': 'Current password is incorrect'}), 400
    
    g.user.set_password(new)

    db.session.commit()
    return jsonify({'message': 'Password updated successfully'})

if __name__ == '__main__':
    app.run(debug=True)
