// ------------------------------
// Load and render all active goals
// ------------------------------
async function loadGoals() {

    const res = await fetch('/api/goals'); // Fetch active goals from backend API
    const goals = await res.json();

    const list = document.getElementById("goalList");

    list.innerHTML = ''; //clear previous goals

    // If no goals exist, show a message
    if (goals.length === 0) {
        list.innerHTML = "<p>No active goals!</p>";
        return;
    }
    // Iterate through each goal and render a card
    goals.forEach(g => {
        // Determine status text based on completion
        const status = g.completed ? ' (Completed!)' : g.expired ? ' (Not completed in time)' : '';
        const removeButton = `<button onclick="removeGoal(${g.id})">Remove</button>`;

        // Append goal card to the DOM
        list.innerHTML += `
        <div class="goal-card">
            <strong>${g.type.toUpperCase()}${status}</strong>
            <p>${g.progress} / ${g.target_value} (${g.period})</p>
            <progress value="${g.progress}" max="${g.target_value}"></progress>
            <p>${g.percentage}% complete</p>
            ${removeButton}
        </div>
    `;
    });
}
// ------------------------------
// Remove a goal by its ID
// ------------------------------
async function removeGoal(goalId) {
     // Send DELETE request to API
    await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });

    // Refresh the goal list after deletion
    loadGoals();
}

// ------------------------------
// Add a new goal
// ------------------------------s
async function addGoal() {

    const targetInput = document.getElementById('goalTarget');
    const target_value = parseInt(targetInput.value);

    // Validate the target value
    if (!target_value || target_value < 1) {
        alert("Please enter a valid target value (1 or higher)");
        targetInput.focus();
        return;
    }
    // Prepare goal object from input fields
    const goal = {
        type: document.getElementById('goalType').value,
        target_value: parseInt(document.getElementById('goalTarget').value),
        period: document.getElementById('goalPeriod').value
    }
    // Send POST request to create new goal
    await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal)

    });
    loadGoals(); //refresh list after adding
}
// ------------------------------
// Initial load of goals when page loads
// ------------------------------
loadGoals();