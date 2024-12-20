// Initialize the map
const map = L.map('map').setView([12.870219035448784, 80.21841715860253], 16);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors',
}).addTo(map);

// GeoJSON data storage and sliding panel references
let allFeatures = [];
const slidingPanel = document.getElementById('sliding-panel');
const locationTitle = document.getElementById('location-title');
const locationDetails = document.getElementById('location-details');
const locationImage = document.getElementById('location-image');
const closePanelButton = document.getElementById('close-panel');

// Load GeoJSON data
fetch('./assets/college_map.geojson')
    .then(response => response.json())
    .then(data => {
        const geoJsonLayer = L.geoJSON(data, {
            onEachFeature: (feature, layer) => {
                if (feature.properties && feature.properties.Name) {
                    // Add tooltip for quick identification
                    layer.bindTooltip(feature.properties.Name);

                    // Store feature data for search and routing
                    allFeatures.push({
                        name: feature.properties.Name,
                        details: feature.properties.description || 'No details available',
                        coordinates: feature.geometry.coordinates,
                        imageUrl: feature.properties.image || null, // Add image URL here
                        layer,
                    });

                    // Add click event for sliding panel
                    layer.on('click', () => {
                        showSlidingPanel(
                            feature.properties.Name,
                            feature.properties.description,
                            feature.properties.image // Pass image URL
                        );
                    });
                }
            },
        }).addTo(map);

        // Fit the map to the GeoJSON bounds
        map.fitBounds(geoJsonLayer.getBounds());
    })
    .catch(error => console.error('Error loading GeoJSON:', error));

// Function to show the sliding panel
function showSlidingPanel(name, details, imageUrl) {
    locationTitle.textContent = name;

    // Update the image if available, or hide it if not
    if (imageUrl) {
        locationImage.src = imageUrl;
        locationImage.alt = `${name} Image`;
        locationImage.style.display = 'block'; // Show the image
    } else {
        locationImage.style.display = 'none'; // Hide the image if no image URL is provided
    }

    if (details) {
        // Format description for line-by-line display
        if (details.includes('\n')) {
            locationDetails.innerHTML = details.replace(/\n/g, '<br>');
        } else if (details.includes(',')) {
            const detailsList = details.split(',').map(item => item.trim());
            locationDetails.innerHTML = '<ul>' + detailsList.map(item => `<li>${item}</li>`).join('') + '</ul>';
        } else {
            locationDetails.textContent = details;
        }
    } else {
        locationDetails.textContent = 'No details available.';
    }

    slidingPanel.classList.add('visible'); // Show the sliding panel
}

// Function to hide the sliding panel
function hideSlidingPanel() {
    slidingPanel.classList.remove('visible');
}

// Close button functionality
closePanelButton.addEventListener('click', hideSlidingPanel);

// Search functionality
document.getElementById('search-button').addEventListener('click', () => {
    const searchQuery = document.getElementById('search-box').value.toLowerCase();
    const result = allFeatures.find(f => f.name.toLowerCase().includes(searchQuery));
    if (result) {
        // Focus the map on the searched location and open the sliding panel
        map.setView([result.coordinates[1], result.coordinates[0]], 18);
        showSlidingPanel(result.name, result.details, result.imageUrl); // Pass image URL
    } else {
        alert('Place not found.');
    }
});

// Routing functionality
let routeControl = null;
document.getElementById('draw-route-button').addEventListener('click', () => {
    const sourceName = document.getElementById('source').value.toLowerCase();
    const destinationName = document.getElementById('destination').value.toLowerCase();

    const source = allFeatures.find(f => f.name.toLowerCase() === sourceName);
    const destination = allFeatures.find(f => f.name.toLowerCase() === destinationName);

    if (source && destination) {
        // Remove any existing route
        if (routeControl) map.removeControl(routeControl);

        // Add a new route
        routeControl = L.Routing.control({
            waypoints: [
                L.latLng(source.coordinates[1], source.coordinates[0]),
                L.latLng(destination.coordinates[1], destination.coordinates[0]),
            ],
            routeWhileDragging: true,
        }).addTo(map);

        // Hide the sliding panel when routing is active
        hideSlidingPanel();
    } else {
        alert('Invalid source or destination.');
    }
});
