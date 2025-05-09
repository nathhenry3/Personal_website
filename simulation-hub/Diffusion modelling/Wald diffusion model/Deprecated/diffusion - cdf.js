// --- Canvas Setup ---
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// --- Simulation Parameters ---
const particleRadius = 2;
const particleColor = 'lightblue';
const particleSourceX = 200;
const particleSourceY = canvasHeight / 2;
const maxParticles = 300;

// Note: With particleSpawnRate = 1000000 and maxParticles = 300,
// the spawnParticles function essentially ensures that you start with 300 particles initially.
const particleSpawnRate = 500;

const stepSize = 20;

// --- Simulation State ---
let particles = [];
let leftHits = 0;
let rightHits = 0;
let startTime = performance.now();

// --- Chart Data ---
// Store data as {x, y} points directly in datasets
const initialDataPoint = { x: 0, y: 0 };

// --- Chart.js Setup ---
const chartCanvas = document.getElementById('hitChart');
const chartCtx = chartCanvas.getContext('2d');

const hitChart = new Chart(chartCtx, {
    type: 'line',
    data: {
        // No longer using a separate 'labels' array for the x-axis values
        datasets: [
            {
                label: 'Left Wall Hits',
                data: [initialDataPoint], // Start with the initial {x:0, y:0} point
                borderColor: 'red',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                borderWidth: 1.5,
                fill: false,
                tension: 0.1
            },
            {
                label: 'Right Wall Hits',
                data: [initialDataPoint], // Start with the initial {x:0, y:0} point
                borderColor: 'green',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                borderWidth: 1.5,
                fill: false,
                tension: 0.1
            }
        ]
    },
    options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: {
            x: {
                // Explicitly set the x-axis type to 'linear'
                type: 'linear', // <<< This is the key change!
                position: 'bottom', // Standard position
                title: {
                    display: true,
                    text: 'Time (seconds)'
                },
                beginAtZero: true
            },
            y: {
                title: {
                    display: true,
                    text: 'Cumulative Hits'
                },
                beginAtZero: true
            }
        },
        animation: {
            duration: 0
        },
         plugins: {
            legend: {
                position: 'top',
            },
            title: {
                 display: true,
                 text: 'Particle Hits on Walls Over Time'
            }
        }
    }
});

// --- Particle Class ---
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    move() {
        const angle = Math.random() * 2 * Math.PI;
        this.x += Math.cos(angle) * stepSize;
        this.y += Math.sin(angle) * stepSize;

        // Boundary checks (bounce off top/bottom)
        if (this.y - particleRadius < 0) {
            this.y = particleRadius;
        } else if (this.y + particleRadius > canvasHeight) {
            this.y = canvasHeight - particleRadius;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, particleRadius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
    }
}

// --- Functions ---

function spawnParticles() {
    // This function will now only be called ONCE to create the initial set
    for (let i = 0; i < particleSpawnRate; i++) {
        if (particles.length < maxParticles) {
            particles.push(new Particle(particleSourceX, particleSourceY));
        }
    }
}

function updateParticles() {
    let particlesToRemoveIndices = [];

    particles.forEach((particle, index) => {
        particle.move();

        if (particle.x - particleRadius <= 0) {
            leftHits++;
            particlesToRemoveIndices.push(index);
            recordHitData(); // Record data immediately on hit
        } else if (particle.x + particleRadius >= canvasWidth) {
            rightHits++;
            particlesToRemoveIndices.push(index);
            recordHitData(); // Record data immediately on hit
        }
    });

    // Remove particles that hit walls, from the end to avoid index issues
    for (let i = particlesToRemoveIndices.length - 1; i >= 0; i--) {
        const indexToRemove = particlesToRemoveIndices[i];
        particles.splice(indexToRemove, 1);
    }
}

function recordHitData() {
    // Use parseFloat to ensure it's a number for the linear axis
    const currentTimeSeconds = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));

    // Add new data points as {x, y} objects
    hitChart.data.datasets[0].data.push({ x: currentTimeSeconds, y: leftHits });
    hitChart.data.datasets[1].data.push({ x: currentTimeSeconds, y: rightHits });

    // Optional: Limit the number of data points for performance on long runs
    const maxDataPoints = 500; // Adjust as needed
    if (hitChart.data.datasets[0].data.length > maxDataPoints) {
        hitChart.data.datasets[0].data.shift(); // Remove the oldest point
        hitChart.data.datasets[1].data.shift(); // Remove the oldest point
    }

    // Update the chart - No need to update labels anymore
    hitChart.update(); // Redraw the chart
}


function drawSimulation() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    particles.forEach(particle => {
        particle.draw();
    });

    // Draw the particle source marker
    ctx.beginPath();
    ctx.arc(particleSourceX, particleSourceY, particleRadius + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'orange';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// --- Main Animation Loop ---
function animate() {
    // REMOVED: spawnParticles(); // Removed from the loop
    updateParticles();
    drawSimulation();

    // Stop the animation if there are no particles left
    if (particles.length > 0) {
       requestAnimationFrame(animate);
    } else {
        console.log("Simulation finished: All particles hit a wall.");
        // You might want to display a "Simulation Complete" message here
    }
}

// --- Start Simulation ---

// 1. Create the initial set of particles FIRST
spawnParticles();

// 2. Start the animation loop
animate();