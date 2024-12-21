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
const closePanelButton = document.getElementById('close-panel');
const locationImage = document.getElementById('location-image');

// Track the active input field (source or destination)
let activeInputField = null;

// Add focus event listeners to track active input field
document.getElementById('source').addEventListener('focus', () => {
    activeInputField = 'source';
});

document.getElementById('destination').addEventListener('focus', () => {
    activeInputField = 'destination';
});

// Remove focus tracking when clicking outside input fields
document.addEventListener('click', (event) => {
    if (!event.target.closest('#source') && !event.target.closest('#destination')) {
        activeInputField = null;
    }
});

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
                        layer,
                    });

                    // Add click event for sliding panel and input field filling
                    layer.on('click', () => {
                        showSlidingPanel(
                            feature.properties.Name,
                            feature.properties.description,
                            feature.properties.imageUrl
                        );

                        // Automatically fill the active input field
                        if (activeInputField) {
                            document.getElementById(activeInputField).value = feature.properties.Name;
                            activeInputField = null; // Reset after filling
                        }
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

    slidingPanel.classList.add('visible');
}

// Function to hide the sliding panel
function hideSlidingPanel() {
    slidingPanel.classList.remove('visible');
}

// Close button functionality
closePanelButton.addEventListener('click', hideSlidingPanel);

// Search functionality with autocomplete
function initializeAutocomplete(inputId) {
    const inputField = document.getElementById(inputId);
    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'autocomplete-suggestions';
    inputField.parentNode.appendChild(suggestionBox);

    inputField.addEventListener('input', () => {
        const query = inputField.value.toLowerCase();
        suggestionBox.innerHTML = '';

        if (query) {
            const matches = allFeatures.filter(f => f.name.toLowerCase().includes(query));
            matches.forEach(match => {
                const suggestion = document.createElement('div');
                suggestion.textContent = match.name;

                // When a suggestion is clicked
                suggestion.addEventListener('click', () => {
                    inputField.value = match.name;
                    suggestionBox.innerHTML = '';
                    suggestionBox.style.display = 'none';

                    if (inputId === 'search-box') {
                        map.setView([match.coordinates[1], match.coordinates[0]], 18);
                        showSlidingPanel(match.name, match.details, match.imageUrl);
                    } else {
                        document.getElementById(inputId).value = match.name;
                    }
                });

                suggestionBox.appendChild(suggestion);
            });

            suggestionBox.style.display = matches.length > 0 ? 'block' : 'none';
        } else {
            suggestionBox.style.display = 'none';
        }
    });

    inputField.addEventListener('blur', () => {
        setTimeout(() => (suggestionBox.style.display = 'none'), 200);
    });
}

// Initialize autocomplete for search, source, and destination
initializeAutocomplete('search-box');
initializeAutocomplete('source');
initializeAutocomplete('destination');

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

// Add event listener to search button next to source and destination input fields
document.getElementById('search-button-source').addEventListener('click', () => {
    const sourceName = document.getElementById('source').value.toLowerCase();
    const source = allFeatures.find(f => f.name.toLowerCase() === sourceName);

    if (source) {
        map.setView([source.coordinates[1], source.coordinates[0]], 18);
        showSlidingPanel(source.name, source.details, source.imageUrl);
    }
});

document.getElementById('search-button-destination').addEventListener('click', () => {
    const destinationName = document.getElementById('destination').value.toLowerCase();
    const destination = allFeatures.find(f => f.name.toLowerCase() === destinationName);

    if (destination) {
        map.setView([destination.coordinates[1], destination.coordinates[0]], 18);
        showSlidingPanel(destination.name, destination.details, destination.imageUrl);
    }
});
