var map = L.map('map').setView([13.0827, 80.2707], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

var FIXED_POPULATION = 10000;
var areas = [];
var markers = [];
var selectedZoneIndex = null;
var manualPriorityList = [];

// LAND ONLY
for (var i = 1; i <= 150; i++) {

    var randomLat = 12.85 + Math.random() * 0.4;
    var randomLng = 80.05 + Math.random() * 0.23;

    areas.push({
        name: "Zone " + i,
        lat: randomLat,
        lng: randomLng,
        manualBoost: 0,
        status: "Active",
        score: 0,
        critical: 0
    });
}

areas.forEach(function(area, index) {

    var marker = L.circleMarker([area.lat, area.lng], {
        radius: 4,
        color: "yellow",
        fillColor: "yellow",
        fillOpacity: 0.8
    }).addTo(map);

    marker.on("click", function(e) {
        showZoneDetails(index, e);
    });

    markers.push(marker);
});

function updateData() {

    var totalPop = 0;
    var totalCritical = 0;
    var ranking = [];

    markers.forEach(function(marker, index) {

        var area = areas[index];

        if (area.status === "Rescued") {
            marker.setStyle({ color: "green", fillColor: "green" });
            return;
        }

        var heartStress = Math.random() * 100;
        var oxygenDrop = Math.random() * 100;

        var dangerScore =
            (heartStress * 0.5) +
            (oxygenDrop * 0.5) +
            area.manualBoost;

        var critical = Math.floor(dangerScore * 20);

        totalPop += FIXED_POPULATION;
        totalCritical += critical;

        var color = "yellow";
        if (dangerScore > 70) color = "red";
        else if (dangerScore > 40) color = "orange";

        marker.setStyle({ color: color, fillColor: color });

        area.score = dangerScore;
        area.critical = critical;

        ranking.push(area);
    });

    ranking.sort((a,b)=>b.score-a.score);
    updateAI(ranking);

    document.getElementById("totalPop").innerText = totalPop;
    document.getElementById("totalCritical").innerText = totalCritical;
}

function updateAI(ranking) {

    if (ranking.length === 0) return;

    document.getElementById("aiTopZone").innerText =
        ranking[0].name + " (Score: " + ranking[0].score.toFixed(1) + ")";

    var list = document.getElementById("aiTopList");
    list.innerHTML = "";

    for (var i = 0; i < 5; i++) {
        var li = document.createElement("li");
        li.innerText = ranking[i].name + " - " + ranking[i].score.toFixed(1);
        list.appendChild(li);
    }

    document.getElementById("aiAction").innerText =
        ranking[0].score > 70 ?
        "Immediate Deployment Recommended" :
        "Monitor Situation";
}

function showZoneDetails(index, event) {

    selectedZoneIndex = index;
    var area = areas[index];
    var panel = document.getElementById("zonePanel");

    panel.style.display = "block";

    var point = map.latLngToContainerPoint(event.latlng);
    panel.style.left = point.x + 20 + "px";
    panel.style.top = point.y + "px";

    document.getElementById("zoneName").innerText = area.name;
    document.getElementById("zonePopulation").innerText = FIXED_POPULATION;
    document.getElementById("zoneCritical").innerText = area.critical;
    document.getElementById("zoneScore").innerText = area.score.toFixed(1);
    document.getElementById("zoneStatus").innerText = area.status;
}

document.getElementById("increasePriorityBtn").onclick = function() {

    if (selectedZoneIndex !== null) {

        var zone = areas[selectedZoneIndex];

        if (!manualPriorityList.includes(zone)) {
            manualPriorityList.push(zone);
            renderPriorityList();
        }

        zone.manualBoost += 20;
        updateData();
    }
};

function renderPriorityList() {

    var list = document.getElementById("priorityList");
    list.innerHTML = "";

    manualPriorityList.forEach(function(zone, index) {

        var li = document.createElement("li");
        li.innerHTML = zone.name +
            `<div class="priority-controls">
                <button onclick="moveUp(${index})">⬆</button>
                <button onclick="moveDown(${index})">⬇</button>
            </div>`;

        list.appendChild(li);
    });
}

function moveUp(index) {
    if (index > 0) {
        var temp = manualPriorityList[index];
        manualPriorityList[index] = manualPriorityList[index - 1];
        manualPriorityList[index - 1] = temp;
        renderPriorityList();
    }
}

function moveDown(index) {
    if (index < manualPriorityList.length - 1) {
        var temp = manualPriorityList[index];
        manualPriorityList[index] = manualPriorityList[index + 1];
        manualPriorityList[index + 1] = temp;
        renderPriorityList();
    }
}

document.getElementById("rescueDoneBtn").onclick = function() {
    if (selectedZoneIndex !== null) {
        areas[selectedZoneIndex].status = "Rescued";
        updateData();
    }
};

document.getElementById("closePanelBtn").onclick = function() {
    document.getElementById("zonePanel").style.display = "none";
    selectedZoneIndex = null;
};

// 1 minute update
setInterval(updateData, 60000);
updateData();