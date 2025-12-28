document.addEventListener('DOMContentLoaded', () => {

    const c = document.getElementById('analyticsChart').getContext('2d'); // Chart.js canvas context

    let chart;

     // ------------------------------
    // Fetch all logs from backend
    // ------------------------------
    async function fetchLogs() {
        const res = await fetch('/logs'); // GET request to retrieve all user logs
        return await res.json(); // parse response as JSON
    }

    // ------------------------------
    // Helper: Get ISO week string for a given date
    // ------------------------------
    function week(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        // Calculate week number by taking difference from Jan 1, divide by 7
        const week = Math.ceil(
            (((d - new Date(year, 0, 1)) / 86400000) + 1) / 7
        );
        return `${year}-W${week}`; // e.g., "2025-W52"
    }
     // ------------------------------
    // Render Chart.js bar/line chart
    // ------------------------------s
    function renderChart(labels, exercise, sleep, water, mood, meals, stress, screen) {
        if (chart) chart.destroy();// Destroy existing chart before re-rendering

        chart = new Chart(c, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Avg Exercise (min)',
                        data: exercise,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)'
                    },
                    {
                        label: 'Avg Sleep (hrs)',
                        data: sleep,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)'
                    },
                    {
                        label: 'Avg Water (cups)',
                        data: water,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)'
                    },
                    {
                        label: 'Avg Meals',
                        data: meals,
                        backgroundColor: 'rgba(255, 206, 86, 0.7)',
                        yAxisID: 'mealsAxis'
                    },
                    {
                        label: 'Avg Screen Time (hrs)',
                        data: screen,
                        backgroundColor: 'rgba(153, 102, 255, 0.7)',
                        yAxisID: 'screenAxis'
                    },
                    {
                        label: 'Avg Mood',
                        data: mood,
                        type: 'line',
                        yAxisID: 'moodAxis',
                        borderColor: 'purple',
                        backgroundColor: 'purple',
                        tension: 0.3,
                        pointRadius: 4
                    },
                    {
                        label: 'Avg Stress',
                        data: stress,
                        type: 'line',
                        yAxisID: 'stressAxis',
                        borderColor: 'pink',
                        backgroundColor: 'pink',
                        tension: 0.3,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true },
                    moodAxis: {
                        type: 'linear',
                        position: 'right',
                        min: 1,
                        max: 5,
                        ticks: { stepSize: 1 }  // Ensures integer mood values
                    },
                    stressAxis: {
                        type: 'linear',
                        position: 'right',
                        min: 1,
                        max: 5,
                        ticks: { stepSize: 1 },
                        grid: { drawOnChartArea: false } // prevents overlapping gridlines
                    },
                    mealsAxis: {
                        type: 'linear',
                        position: 'right',
                        min: 0,
                        max: 5,
                        grid: { drawOnChartArea: false },
                        title: {
                            display: true,
                            text: 'Meals'
                        }
                    },
                    screenAxis: {
                        type: 'linear',
                        position: 'right',
                        min: 0,
                        max: 12,
                        grid: { drawOnChartArea: false },
                        title: {
                            display: true,
                            text: 'Screen Time'
                        }
                    }

                }
            }
        });
    }
    // ------------------------------
    // Aggregate logs weekly and render chart
    // ------------------------------
    function renderWeekly(data) {
        const weeks = {};

        data.forEach(log => {
            const key = week(log.date); // Get week string

            if (!weeks[key]) {
                weeks[key] = { ex: 0, sl: 0, wa: 0, mo: 0, meals: 0, stress: 0, screen: 0, count: 0 };
            }
            // Sum values for the week
            weeks[key].ex += Number(log.exercise);
            weeks[key].sl += Number(log.sleep);
            weeks[key].wa += Number(log.water);
            weeks[key].mo += Number(log.mood);
            weeks[key].meals += Number(log.meals);
            weeks[key].stress += Number(log.stress);
            weeks[key].screen += Number(log.screen_time);
            weeks[key].count++;

        });
        // Prepare arrays for Chart.js
        const labels = [];
        const exercise = [];
        const sleep = [];
        const water = [];
        const mood = [];
        const meals = [];
        const stress = [];
        const screen = [];

        Object.entries(weeks).forEach(([k, v]) => {
            labels.push(k);
            exercise.push(v.ex / v.count); // Compute weekly average
            sleep.push(v.sl / v.count);
            water.push(v.wa / v.count);
            mood.push(v.mo / v.count);
            meals.push(v.meals / v.count);
            stress.push(v.stress / v.count);
            screen.push(v.screen / v.count);
        });

        renderChart(labels, exercise, sleep, water, mood, meals, stress, screen);
    }
     // ------------------------------
    // Aggregate logs monthly and render chart
    // ------------------------------
    function renderMonthly(data) {
        const months = {};

        data.forEach(log => {

            const month = log.date.slice(0, 7);

            if (!months[month]) {
                months[month] = { ex: 0, sl: 0, wa: 0, mo: 0, meals: 0, stress: 0, screen: 0, count: 0 };
            }
            months[month].ex += Number(log.exercise);
            months[month].sl += Number(log.sleep);
            months[month].wa += Number(log.water);
            months[month].mo += Number(log.mood);
            months[month].meals += Number(log.meals);
            months[month].stress += Number(log.stress);
            months[month].screen += Number(log.screen_time);
            months[month].count++;
        });

        const labels = [];
        const exercise = [];
        const sleep = [];
        const water = [];
        const mood = [];
        const meals = [];
        const stress = [];
        const screen = [];

        Object.entries(months).forEach(([k, v]) => {

            labels.push(k);
            exercise.push(v.ex / v.count);
            sleep.push(v.sl / v.count);
            water.push(v.wa / v.count);
            mood.push(v.mo / v.count);
            meals.push(v.meals / v.count);
            stress.push(v.stress / v.count);
            screen.push(v.screen / v.count);
        });

        renderChart(labels, exercise, sleep, water, mood, meals, stress, screen);
    }

    // ------------------------------
    // Button click handlers
    // ------------------------------
    document.getElementById('weeklyBtn').onclick = async () => {

        const data = await fetchLogs(); // Fetch logs from backend
        renderWeekly(data); //render weekly chart
    }
    document.getElementById('monthlyBtn').onclick = async () => {

        const data = await fetchLogs(); //fetch logs from backend
        renderMonthly(data); //render montlhy chart
    }

    // Trigger weekly chart by default on page load
    document.getElementById('weeklyBtn').click();
});