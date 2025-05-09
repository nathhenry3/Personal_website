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
const maxParticles = 3000;
const particleSpawnRate = 1000000; // Effectively ensures 300 particles initially
const stepSize = 15;
const binSize = 0.5; // Seconds per bin for the histogram

// --- Simulation State ---
let particles = [];
// We now store the exact time of each hit instead of cumulative counts
let leftHitTimes = [];
let rightHitTimes = [];
let startTime = performance.now(); // Time when simulation starts

// --- Chart Update Period ---
const chartUpdateInterval = 500; // Update chart every 500 milliseconds

// --- Chart.js Setup ---
const chartCanvas = document.getElementById('hitChart');
const chartCtx = chartCanvas.getContext('2d');

// Change chart type to 'bar' for a histogram
const hitChart = new Chart(chartCtx, {
    type: 'bar', // Changed to 'bar'
    data: {
        datasets: [
            {
                label: 'Left Wall Hits (per ' + binSize + 's)', // Updated label
                data: [], // Data will be generated dynamically per bin
                backgroundColor: 'rgba(255, 0, 0, 0.6)', // Solid fill for bars
                borderColor: 'red',
                borderWidth: 1
            },
            {
                label: 'Right Wall Hits (per ' + binSize + 's)', // Updated label
                data: [], // Data will be generated dynamically per bin
                backgroundColor: 'rgba(0, 255, 0, 0.6)', // Solid fill for bars
                borderColor: 'green',
                borderWidth: 1
            }
        ]
    },
    options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'linear', // Keep linear scale for time bins
                position: 'bottom',
                title: {
                    display: true,
                    text: 'Time (seconds)'
                },
                beginAtZero: true,
                // Optional: Define ticks or intervals if needed
                 ticks: {
                     stepSize: binSize // Ensure ticks align with bins
                 }
            },
            y: {
                title: {
                    display: true,
                    text: 'Number of Hits' // Updated title
                },
                beginAtZero: true,
                // Ensure y-axis ticks are integers
                ticks: {
                    stepSize: 1
                }
            }
        },
        animation: {
            duration: 0 // Disable animation for real-time updates
        },
         plugins: {
            legend: {
                position: 'top',
            },
            title: {
                 display: true,
                 text: 'Particle Hit Rate Over Time (Histogram)' // Updated title
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
    // This function is called ONCE to create the initial set (max 300)
    for (let i = 0; i < particleSpawnRate; i++) {
        if (particles.length < maxParticles) {
            particles.push(new Particle(particleSourceX, particleSourceY));
        }
    }
}

function updateParticles() {
    let particlesToRemoveIndices = [];
    const currentTime = performance.now(); // Get current time once per frame

    particles.forEach((particle, index) => {
        particle.move();

        if (particle.x - particleRadius <= 0) {
            leftHitTimes.push((currentTime - startTime) / 1000); // Record hit time in seconds
            particlesToRemoveIndices.push(index);
        } else if (particle.x + particleRadius >= canvasWidth) {
            rightHitTimes.push((currentTime - startTime) / 1000); // Record hit time in seconds
            particlesToRemoveIndices.push(index);
        }
    });

    // Remove particles that hit walls, from the end to avoid index issues
    for (let i = particlesToRemoveIndices.length - 1; i >= 0; i--) {
        const indexToRemove = particlesToRemoveIndices[i];
        particles.splice(indexToRemove, 1);
    }
}

// Function to calculate hits per time interval (for histogram)
function calculateHitsPerInterval(hitTimes, binSize) {
    const bins = {}; // Use an object to store counts per bin start time
    const currentTime = performance.now();
    const elapsedSeconds = (currentTime - startTime) / 1000;

    // Initialize bins up to the current elapsed time to ensure the chart range extends
    const numBins = Math.ceil(elapsedSeconds / binSize) + 1; // Add one extra bin to show the current interval

    for (let i = 0; i < numBins; i++) {
        const binStartTime = i * binSize;
        bins[binStartTime] = 0; // Initialize count for this bin
    }


    // Count hits falling into each bin
    hitTimes.forEach(hitTime => {
        const binStartTime = Math.floor(hitTime / binSize) * binSize;
         // Ensure the bin exists in our initialized bins (handles cases where hits come before initialization loop)
         if (bins[binStartTime] === undefined) {
             bins[binStartTime] = 0;
         }
        bins[binStartTime]++;
    });

    // Convert the bins object into an array of {x, y} points for Chart.js
    const chartData = [];
    // Sort bin start times to ensure points are in order
    const sortedBinStartTimes = Object.keys(bins).map(Number).sort((a, b) => a - b);

    sortedBinStartTimes.forEach(binStartTime => {
        chartData.push({
            x: binStartTime,
            y: bins[binStartTime]
        });
    });

    return chartData;
}


// --- Periodic Chart Update Function (for PDF/Histogram) ---
function updateChartPeriodically() {
    // Calculate the data for the histogram bins
    const leftChartData = calculateHitsPerInterval(leftHitTimes, binSize);
    const rightChartData = calculateHitsPerInterval(rightHitTimes, binSize);

    // Update the chart data - replace the entire data array
    hitChart.data.datasets[0].data = leftChartData;
    hitChart.data.datasets[1].data = rightChartData;

    // Update the chart
    hitChart.update();
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
    // spawnParticles() is now called only once at the start
    updateParticles(); // updateParticles now records hit times
    drawSimulation();

    // Continue animation if there are particles left
    if (particles.length > 0) {
       requestAnimationFrame(animate);
    } else {
        console.log("Simulation finished: All particles hit a wall.");
        // Perform a final chart update when simulation ends
        updateChartPeriodically();
        // You might want to display a "Simulation Complete" message here
    }
}

// --- Start Simulation ---

// 1. Create the initial set of particles FIRST
spawnParticles();

// 2. Start the animation loop
animate();

// 3. Start the periodic chart update loop
// This updates the histogram chart at a controlled rate
setInterval(updateChartPeriodically, chartUpdateInterval);