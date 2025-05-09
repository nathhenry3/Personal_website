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
const maxParticles = 1000; // Beyond 10,000, simulation slows down noticeably, affecting CDF and PDF shape (because the sim speeds up as particles are removed)
const particleSpawnRate = maxParticles; // Make sure that maxParticles < particleSpawnRate
const stepSize = 15;
const binSize = 0.5; // Seconds per bin for the histogram (PDF)

// --- Simulation State ---
let particles = [];
// Data for CDF Chart (Cumulative Counts)
let leftHits = 0;
let rightHits = 0;
// Data for PDF/Histogram Chart (Hit Times)
let leftHitTimes = [];
let rightHitTimes = [];

let startTime = performance.now(); // Time when simulation starts

// --- Chart Update Period ---
const chartUpdateInterval = 200; // Update charts every 200 milliseconds

// --- CDF Chart Setup ---
const cdfChartCanvas = document.getElementById('cdfChart'); // Updated ID
const cdfChartCtx = cdfChartCanvas.getContext('2d');

const cdfChart = new Chart(cdfChartCtx, { // Updated variable name
    type: 'line', // CDF is a line chart
    data: {
        datasets: [
            {
                label: 'Left Wall Cumulative Hits', // Updated label
                data: [{ x: 0, y: 0 }], // Start with the initial {x:0, y:0} point
                borderColor: 'red',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                borderWidth: 1.5,
                fill: false,
                tension: 0.1,
                 stepped: 'before' // Add steps for cumulative chart
            },
            {
                label: 'Right Wall Cumulative Hits', // Updated label
                data: [{ x: 0, y: 0 }], // Start with the initial {x:0, y:0} point
                borderColor: 'green',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                borderWidth: 1.5,
                fill: false,
                tension: 0.1,
                 stepped: 'before' // Add steps for cumulative chart
            }
        ]
    },
    options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
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
                beginAtZero: true,
                 ticks: {
                    stepSize: 1 // Cumulative counts are integers
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
                 text: 'Particle Hits on Walls Over Time (Cumulative)' // Updated title
            }
        }
    }
});


// --- PDF/Histogram Chart Setup ---
const pdfChartCanvas = document.getElementById('pdfChart'); // New ID
const pdfChartCtx = pdfChartCanvas.getContext('2d');

const pdfChart = new Chart(pdfChartCtx, { // New chart instance
    type: 'bar', // PDF/Histogram is a bar chart
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
                 ticks: {
                     stepSize: binSize // Ensure ticks align with bins
                 }
            },
            y: {
                title: {
                    display: true,
                    text: 'Number of Hits in Interval' // Updated title
                },
                beginAtZero: true,
                ticks: {
                    stepSize: 1 // Ensure y-axis ticks are integers
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

        // Check for hits on left/right walls
        if (particle.x - particleRadius <= 0) {
            leftHits++; // Increment CDF counter
            leftHitTimes.push((currentTime - startTime) / 1000); // Record hit time for PDF
            particlesToRemoveIndices.push(index);
        } else if (particle.x + particleRadius >= canvasWidth) {
            rightHits++; // Increment CDF counter
            rightHitTimes.push((currentTime - startTime) / 1000); // Record hit time for PDF
            particlesToRemoveIndices.push(index);
        }
    });

    // Remove particles that hit walls, from the end to avoid index issues
    for (let i = particlesToRemoveIndices.length - 1; i >= 0; i--) {
        const indexToRemove = particlesToRemoveIndices[i];
        particles.splice(indexToRemove, 1);
    }
}

// Function to calculate hits per time interval (for histogram/PDF)
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
         // Ensure the bin exists in our initialized bins
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
         // Only include bins that have been reached or have hits
         if (binStartTime <= elapsedSeconds + binSize) { // Include current/next bin
            chartData.push({
                x: binStartTime,
                y: bins[binStartTime]
            });
         }
    });

    return chartData;
}

// --- Function to update the CDF Chart ---
function updateCdfChartData() {
    const currentTimeSeconds = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));

    // Add new data points as {x, y} objects for cumulative hits
    // This creates the steps in the line chart
    cdfChart.data.datasets[0].data.push({ x: currentTimeSeconds, y: leftHits });
    cdfChart.data.datasets[1].data.push({ x: currentTimeSeconds, y: rightHits });

    // Optional: Limit the number of data points for performance on long runs
    const maxDataPoints = 1000; // Adjust as needed
    if (cdfChart.data.datasets[0].data.length > maxDataPoints) {
        cdfChart.data.datasets[0].data.shift(); // Remove the oldest point
        cdfChart.data.datasets[1].data.shift(); // Remove the oldest point
    }

    // Update the chart
    cdfChart.update();
}

// --- Function to update the PDF/Histogram Chart ---
function updatePdfChartData() {
     // Calculate the data for the histogram bins
    const leftChartData = calculateHitsPerInterval(leftHitTimes, binSize);
    const rightChartData = calculateHitsPerInterval(rightHitTimes, binSize);

    // Update the chart data - replace the entire data array for bar chart
    pdfChart.data.datasets[0].data = leftChartData;
    pdfChart.data.datasets[1].data = rightChartData;

    // Update the chart
    pdfChart.update();
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
    updateParticles(); // updateParticles increments CDF counters and records hit times
    drawSimulation();

    // Continue animation if there are particles left
    if (particles.length > 0) {
       requestAnimationFrame(animate);
    } else {
        console.log("Simulation finished: All particles hit a wall.");
        // Perform a final chart update for both charts when simulation ends
        updateCdfChartData();
        updatePdfChartData();
        // You might want to display a "Simulation Complete" message here
    }
}

// --- Start Simulation ---

// 1. Create the initial set of particles FIRST
spawnParticles();

// 2. Start the animation loop
animate();

// 3. Start the periodic chart update loop for BOTH charts
// This updates the charts at a controlled rate
setInterval(() => {
    updateCdfChartData();
    updatePdfChartData();
}, chartUpdateInterval);