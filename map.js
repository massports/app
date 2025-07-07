class Location {
  constructor(name, address, note, city, lat, lng, imgUrl) {
    this.name = name;
    this.address = address;
    this.city = city;
    this.lat = parseFloat(lat);
    this.lng = parseFloat(lng);
    this.note = note;
    this.imgUrl = imgUrl;
  }
}

async function fetchAndParseLocations(tsvUrl) {
  const response = await fetch(tsvUrl);
  const tsvText = await response.text();
  const rows = tsvText.trim().split('\n');
  return rows.slice(1).map(row => {
    const [name, address, note, city, lat, lng, imgUrl] = row.split('\t');
    return new Location(name, address, note, city, lat, lng, imgUrl);
  });
}

async function initMap() {
  const tsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTI6LQ9QOhxicN_9FPXdsl3N7fBQkaFsH0jmDa17QpX7-4pYJiQ293Qf40xbIUaRJ5WW2Gt-IHOjO6p/pub?gid=0&single=true&output=tsv';

  const map = L.map('map', { attributionControl: false, zoomControl: false });
  map.setView([35, -100], 3);
  map.flyTo([35, -100], 4);
  map.toggleFullscreen();

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    minZoom: 2
  }).addTo(map);

  const icon = L.icon({
    iconUrl: 'https://i.postimg.cc/xT5k075d/icon-MARKER.png',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -20]
  });

  const locations = await fetchAndParseLocations(tsvUrl);
  const bounds = [];
  const markers = [];
  let currentIndex = 0;

  function showMarker(index) {
    if (index < 0) index = markers.length - 1;
    if (index >= markers.length) index = 0;
    currentIndex = index;
    markers[index].openPopup();
  }

  locations.forEach((loc, index) => {
    const uniqueImgId = `popup-img-${index}`;
    const searchLink = `https://maps.google.com/?q=${encodeURIComponent(loc.name)},${encodeURIComponent(loc.address)}`;
    const popupHTML = `
      <button class="arrow-btn" data-dir="back" style="position: absolute; left: -20%;">
        <span class="material-symbols-rounded">chevron_backward</span>
      </button>
      <button class="arrow-btn" data-dir="forward" style="position: absolute; right: -20%;">
        <span class="material-symbols-rounded">chevron_forward</span>
      </button>
      ${loc.imgUrl ? `
      <div class="croppedDiv">
        <img id="${uniqueImgId}" src="https://raw.githubusercontent.com/rypittner/massport/refs/heads/main/${loc.imgUrl}" class="croppedImg" alt="${loc.name}&#8199;<span class='modal-city'>${loc.city}</span>" onload="this.classList.add('loaded')">
      </div>` : ''}
      <h2 class="heading">${loc.name}</h2>
      <a class="popup-link" target="_blank" href="${searchLink}">${loc.city}</a>
      ${loc.note ? `<p class="description">${loc.note}</p>` : ''}`;

    const marker = L.marker([loc.lat, loc.lng], { icon, zIndexOffset: index + 1 }).addTo(map);
    marker.bindPopup(popupHTML, { maxWidth: 250, minWidth: 250, closeButton: false });

    marker.on('click', () => {
      currentIndex = index;
      setTimeout(() => {
        const img = document.getElementById(uniqueImgId);
        const modal = document.getElementById("myModal");
        const modalImg = document.getElementById("img01");
        const captionText = document.getElementById("caption");
        const span = document.querySelector(".close");

        if (img) {
          img.onclick = function () {
            modal.style.display = "block";
            modalImg.src = this.src;
            captionText.innerHTML = this.alt;
          };
        }

        if (span) {
          span.onclick = function () {
            modal.style.display = "none";
          };
        }
      }, 100);
    });

    bounds.push([loc.lat, loc.lng]);
    markers.push(marker);
  });

  if (markers.length > 0) showMarker(0);
}

initMap();
