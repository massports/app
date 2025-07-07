class Location {
  constructor(name, address, note, city, lat, lng, imgUrl) {
    this.name = name;
    this.address = address;
    this.note = note;
    this.city = city;
    this.lat = parseFloat(lat);
    this.lng = parseFloat(lng);
    this.imgUrl = imgUrl;
  }
}

async function fetchAndParseLocations(tsvUrl) {
  const response = await fetch(tsvUrl);
  const tsvText = await response.text();
  const rows = tsvText.trim().split('\n');
  return rows.slice(1).map((row) => {
    const [name, address, note, city, lat, lng, imgUrl] = row.split('\t');
    return new Location(name, address, note, city, lat, lng, imgUrl);
  });
}

function setupModal(imgId, name, city) {
  const img = document.getElementById(imgId);
  const modal = document.getElementById("myModal");
  const modalImg = document.getElementById("img01");
  const captionText = document.getElementById("caption");
  const closeBtn = document.querySelector(".close");

  if (img) {
    img.onclick = function () {
      modal.style.display = "block";
      modalImg.src = this.src;
      captionText.innerHTML = `${name}  <span class='modal-city'>${city}</span>`;
    };
  }

  if (closeBtn) {
    closeBtn.onclick = function () {
      modal.style.display = "none";
    };
  }
}

async function initMap() {
  const tsvUrl = window.TSV_URL || '';
  if (!tsvUrl) {
    alert("Missing TSV_URL. Please define 'window.TSV_URL' before loading the template.");
    return;
  }

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
  const markers = [];
  let currentIndex = 0;

  locations.forEach((loc, index) => {
    const uniqueImgId = `popup-img-${index}`;
    const searchLink = `https://maps.google.com/?q=${encodeURIComponent(loc.name)},${encodeURIComponent(loc.address)}`;
    const hasNote = loc.note && loc.note.trim();
    const hasImg = loc.imgUrl && loc.imgUrl.trim();

    const popupHTML = `
      <button class="arrow-btn" data-dir="back" style="position: absolute; left: -20%;">
        <span class="material-symbols-rounded">chevron_backward</span>
      </button>
      <button class="arrow-btn" data-dir="forward" style="position: absolute; right: -20%;">
        <span class="material-symbols-rounded">chevron_forward</span>
      </button>
      ${hasImg ? `
      <div class="croppedDiv">
        <img id="${uniqueImgId}" src="https://raw.githubusercontent.com/rypittner/massport/refs/heads/main/${loc.imgUrl}" class="croppedImg" alt="${loc.name}  <span class='modal-city'>${loc.city}</span>" onload="this.classList.add('loaded')">
      </div>` : ''}
      <h2 class="heading">${loc.name}</h2>
      <a class="popup-link" target="_blank" href="${searchLink}">${loc.city}</a>
      ${hasNote ? `<p class="description">${loc.note}</p>` : ''}`;

    const marker = L.marker([loc.lat, loc.lng], { icon, zIndexOffset: index + 1 }).addTo(map);
    marker.bindPopup(popupHTML, { maxWidth: 250, minWidth: 250, closeButton: false });

    marker.on('click', () => {
      currentIndex = index;
      setTimeout(() => {
        setupModal(uniqueImgId, loc.name, loc.city);
      }, 100);
    });

    markers.push(marker);
  });

  function showMarker(index) {
    if (index < 0) index = markers.length - 1;
    if (index >= markers.length) index = 0;
    currentIndex = index;
    markers[index].openPopup();
  }

  map.on('popupopen', function (e) {
    const popup = e.popup._container;
    const popupHeight = popup.offsetHeight;

    setTimeout(() => {
      const backBtn = popup.querySelector('[data-dir="back"]');
      const forwardBtn = popup.querySelector('[data-dir="forward"]');

      const verticalOffset = popupHeight / 2;
      if (backBtn) {
        backBtn.style.top = `${verticalOffset}px`;
        backBtn.style.transform = `translateY(-50%)`;
        backBtn.onclick = () => showMarker(currentIndex - 1);
      }

      if (forwardBtn) {
        forwardBtn.style.top = `${verticalOffset}px`;
        forwardBtn.style.transform = `translateY(-50%)`;
        forwardBtn.onclick = () => showMarker(currentIndex + 1);
      }

      const px = map.project(e.popup._latlng);
      px.y -= popupHeight / 2;
      map.panTo(map.unproject(px), { animate: true });
    }, 10);
  });

  if (markers.length > 0) showMarker(0);
}

initMap();
