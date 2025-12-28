document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------
    // DOM elements
    // ------------------------------
    const form = document.getElementById('logForm'); //Form for adding/updating logs
    const c = document.getElementById('myChart').getContext('2d'); // Canvas for Chart.js
    const healthScoreEl = document.getElementById('healthScore'); // Daily health score display

    let chart;

    // ------------------------------
    // Convert numeric mood to emoji for display
    // ------------------------------s
    function moodEmoji(mood) {
        switch (mood) {
            case 1: return '😢';
            case 2: return '😟';
            case 3: return '😐';
            case 4: return '🙂';
            case 5: return '😁';
            default: return '❓';
        }
    }
    // ------------------------------
    // Fetch all logs from backend
    // ------------------------------
    async function fetchLogs() {
        const res = await fetch('/logs'); // GET request to fetch user's logs
        const data = await res.json();

        renderChart(data); // Update chart with fetched data
        renderLogList(data); // Render log list in DOM

    }

    // ------------------------------
    // Render line chart of logs using Chart.js
    // ------------------------------
    function renderChart(data) {

        const labels = data.map(d => d.date);
        const exercise = data.map(d => d.exercise);
        const water = data.map(d => d.water);
        const sleep = data.map(d => d.sleep);
        const mood = data.map(d => d.mood);
        const meals = data.map(d => d.meals);
        const stress = data.map(d => d.stress);
        const screen = data.map(d => d.screen_time);

        if (chart) {
            chart.destroy(); //destory previous chart to prevent overlapping
        }

        chart = new Chart(c, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Exercise (min)', data: exercise, borderColor: 'red', fill: false },
                    { label: 'Sleep (hrs)', data: sleep, borderColor: 'blue', fill: false },
                    { label: 'Water (cups)', data: water, borderColor: 'green', fill: false },
                    { label: 'Mood', data: mood, borderColor: 'purple', fill: false },
                    { label: 'Meals', data: meals, borderColor: 'orange', fill: false },
                    { label: 'Stress', data: stress, borderColor: 'pink', fill: false },
                    { label: 'Screen Time (hrs)', data: screen, borderColor: 'brown', fill: false }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }

        });
    }
    // ------------------------------
    // Render list of logs in the DOM
    // ------------------------------
    function renderLogList(data) {
        const container = document.getElementById('logList');
        container.innerHTML = '';

        data.forEach(log => {
            const div = document.createElement('div');
            div.className = 'log-item';
            div.innerHTML = `
    <strong>${log.date}</strong><br>
    🏃 ${log.exercise} min |
    😴 ${log.sleep} hrs |
    💧 ${log.water} cups |
    ${moodEmoji(log.mood)} |
    🍽 ${log.meals} meals |
    😰 ${log.stress} stress |
    📱 ${log.screen_time} hrs screen

    <div class="actions">
        <button onclick="editLog(
            '${log.date}',
            ${log.exercise},
            ${log.sleep},
            ${log.water},
            ${log.mood},
            ${log.meals},
            ${log.stress},
            ${log.screen_time}
        )">Edit</button>
        <button onclick="showDelete(this)">Delete</button>
        <span class="delete-confirm" style="display:none;">
            Are you sure?
            <button onclick="deleteLog('${log.date}', this)">Yes</button>
            <button onclick="hideDeleteConfirm(this)">No</button>
        </span>
    </div>
`;

            container.appendChild(div);
        });
        updateHealthScore(data); // Update the daily health score display
    }

    // ------------------------------
    // Update daily health score display
    // ------------------------------
    function updateHealthScore(data) {
        if (data.length === 0) {
            healthScoreEl.textContent = 'Daily Health Score: -- / 100';
            return;
        }

        // Sort logs by date descending and get latest logs
        const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latest = sorted[0];
        healthScoreEl.textContent = `Daily Health Score: ${latest.health_score} / 100`;
    }
     // ------------------------------
    // Populate form with log data for editing
    // ------------------------------
    window.editLog = function (date, exercise, sleep, water, mood, meals, stress, screen_time) {
        document.getElementById('date').value = date;
        document.getElementById('exercise').value = exercise;
        document.getElementById('sleep').value = sleep;
        document.getElementById('water').value = water;
        document.getElementById('mood').value = mood;
        document.getElementById('meals').value = meals;
        document.getElementById('stress').value = stress;
        document.getElementById('screen').value = screen_time;

        form.dataset.editing = 'true'; // Enable editing mode
    };
    // ------------------------------
    // Show confirmation prompt for deletion
    // ------------------------------
    window.showDelete = function (btn) {
        const span = btn.nextElementSibling; // the <span class="delete-confirm">
        span.style.display = 'inline';
        btn.style.display = 'none'; // hide the original delete button
    };
     // ------------------------------
    // Hide deletion confirmation
    // ------------------------------
    window.hideDeleteConfirm = function (btn) {
        const span = btn.parentElement;
        span.style.display = 'none';
        span.previousElementSibling.style.display = 'inline'; // show Delete button again
    };
     // ------------------------------
    // Delete a log via API
    // ------------------------------
    window.deleteLog = async function (date, btn) {
        const res = await fetch(`/log/${date}`, { method: 'DELETE' });
        if (res.ok) {
            fetchLogs(); // Refresh logs after deletion
        }
    };

    // ------------------------------
    // Handle form submission for adding/updating logs
    // ------------------------------
    form.addEventListener('submit', async (e) => {

        e.preventDefault();

        // Prevent future date logging
        const date = document.getElementById('date').value;

        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // ignore time part

        if (selectedDate > today) {
            alert("You cannot add a log for a future date.");
            return; // stop submission
        }

        // Prepare log data from form
        const logData = {
            date: document.getElementById('date').value,
            exercise_minutes: Number(document.getElementById('exercise').value),
            sleep_hours: Number(document.getElementById('sleep').value),
            water_cups: Number(document.getElementById('water').value),
            mood: Number(document.getElementById('mood').value),
            meals: Number(document.getElementById('meals').value),
            stress: Number(document.getElementById('stress').value),
            screen_time_hours: Number(document.getElementById('screen').value)
        };
        // Determine API method: POST for new logs, PUT for editing existing logs
        const method = form.dataset.editing === 'true' ? 'PUT' : 'POST';
        const url = method === 'POST' ? '/log' : `/log/${date}`;

        if (method === 'POST') logData.date = date;

        const res = await fetch(url, {

            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });

        if (res.ok) {
            form.reset();
            form.dataset.editing = 'false'; // reset editing mode
            fetchLogs();
        } else {
            const err = await res.json();
            alert(err.message);
        }
    });

    // ------------------------------
    // Initial fetch and render on page load
    // ------------------------------
    fetchLogs();
});