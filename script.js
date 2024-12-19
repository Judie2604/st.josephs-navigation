// Initialize the map and set the view to your college's coordinates
const map = L.map('map').setView([12.870219035448784, 80.21841715860253], 16);

// Add the tile layer (OSM fallback)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

// Store all GeoJSON features for search and routing
let allFeatures = [];

// Load GeoJSON file
fetch('./assets/college_map.geojson')
    .then(response => response.json())
    .then(data => {
        // Add GeoJSON to map
        const geoJsonLayer = L.geoJSON(data, {
            onEachFeature: function (feature, layer) {
                if (feature.properties && feature.properties.Name) {
                    // Bind a tooltip to the layer for hover effect
                    layer.bindTooltip(feature.properties.Name, {
                        permanent: false, // Tooltip only appears on hover
                        direction: "top", // Position the tooltip above the point
                        className: "hover-tooltip", // Optional: Add custom styling
                    });
        
                    // Bind a popup for click interaction (if needed)
                    layer.bindPopup(`<b>${feature.properties.Name}</b>`);
                }
        
                // Store feature data for searching and routing
                allFeatures.push({
                    name: feature.properties.Name,
                    layer,
                    coordinates: feature.geometry.coordinates, // [longitude, latitude]
                });
        
                // Add hover styling for better visual feedback
                layer.on("mouseover", function () {
                    layer.setStyle({
                        radius: 8,
                        fillColor: "#ff7800",
                        color: "#ff0000",
                        weight: 2,
                    });
                });
        
                layer.on("mouseout", function () {
                    layer.setStyle({
                        radius: 6,
                        fillColor: "#3388ff",
                        color: "#000",
                        weight: 1,
                    });
                });
            },
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: "#3388ff",
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8,
                });
            },
        }).addTo(map);
        

        // Adjust map bounds based on GeoJSON features
        map.fitBounds(geoJsonLayer.getBounds());
    })
    .catch(error => console.error('Error loading GeoJSON:', error));

// Search functionality
document.getElementById('search-button').addEventListener('click', () => {
    const searchQuery = document.getElementById('search-box').value.toLowerCase();
    const result = allFeatures.find((f) => f.name.toLowerCase().includes(searchQuery));

    if (result) {
        map.setView([result.coordinates[1], result.coordinates[0]], 18); // [lat, lng]
        result.layer.openPopup();
    } else {
        alert('Place not found');
    }
});

// Route functionality
let routeControl = null; // Variable to manage route instance
document.getElementById('draw-route-button').addEventListener('click', () => {
    const sourceName = document.getElementById('source').value.trim().toLowerCase();
    const destinationName = document.getElementById('destination').value.trim().toLowerCase();

    const sourceFeature = allFeatures.find((f) => f.name.toLowerCase() === sourceName);
    const destinationFeature = allFeatures.find((f) => f.name.toLowerCase() === destinationName);

    if (sourceFeature && destinationFeature) {
        const startPoint = L.latLng(sourceFeature.coordinates[1], sourceFeature.coordinates[0]); // [lat, lng]
        const endPoint = L.latLng(destinationFeature.coordinates[1], destinationFeature.coordinates[0]); // [lat, lng]

        // Remove existing route if any
        if (routeControl) {
            map.removeControl(routeControl);
        }

        // Add new route
        routeControl = L.Routing.control({
            waypoints: [startPoint, endPoint],
            routeWhileDragging: true,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'walking', // Update to 'driving' or 'cycling' if needed
            }),
        }).addTo(map);
    } else {
        alert('Source or Destination not found');
    }
});
