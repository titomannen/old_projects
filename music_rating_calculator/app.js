document.addEventListener("DOMContentLoaded", function () {
    let albums = JSON.parse(localStorage.getItem("albums")) || [];
    let currentAlbum = {};
    let editingAlbumIndex = null;

    const stepContainer = document.getElementById("stepContainer");
    const ratingsContainer = document.getElementById("ratingsContainer");
    const resultDiv = document.getElementById("results");
    const albumTitleContainer = document.getElementById("albumTitleContainer");
    const editContainer = document.getElementById("editContainer");

    function saveAlbums() {
        localStorage.setItem("albums", JSON.stringify(albums));
    }

    function downloadBackup() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(albums, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "album_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    function uploadBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedAlbums = JSON.parse(e.target.result);
                if (Array.isArray(importedAlbums)) {
                    albums = importedAlbums;
                    saveAlbums();
                    displayAlbums();
                    alert("Backup importerad!");
                } else {
                    alert("Ogiltig filstruktur.");
                }
            } catch (err) {
                alert("Fel vid import av fil: " + err.message);
            }
        };
        reader.readAsText(file);
    }

    const backupButton = document.createElement("button");
    backupButton.textContent = "📦 Exportera backup";
    backupButton.addEventListener("click", downloadBackup);
    document.body.insertBefore(backupButton, resultDiv);

    const importLabel = document.createElement("label");
    importLabel.textContent = "📂 Importera backup";
    importLabel.style.cursor = "pointer";
    importLabel.style.marginLeft = "10px";

    const importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = ".json";
    importInput.style.display = "none";
    importInput.addEventListener("change", uploadBackup);

    importLabel.appendChild(importInput);
    document.body.insertBefore(importLabel, resultDiv);

    function displayAlbums(sortValue = "date") {
        resultDiv.innerHTML = `
            <h2>Alla sparade album (${albums.length}):</h2>
            <input type="text" id="searchInput" placeholder="Sök artist eller album..." />
            <div id="sortControls">
                <label for="sortSelect">Sortera efter: </label>
                <select id="sortSelect">
                    <option value="date">Datum</option>
                    <option value="artist">Artist</option>
                    <option value="average">Medelbetyg</option>
                    <option value="adjusted">Ändrat betyg</option>
                </select>
            </div>
            <div id="albumGrid"></div>`;

        const albumGrid = document.getElementById("albumGrid");
        const searchInput = document.getElementById("searchInput");

        function renderAlbums() {
            albumGrid.innerHTML = "";
            let filteredAlbums = [...albums];
            const searchTerm = searchInput.value.toUpperCase();

            if (searchTerm) {
                filteredAlbums = filteredAlbums.filter(album =>
                    album.artist.includes(searchTerm) || album.title.includes(searchTerm)
                );
            }

            switch (document.getElementById("sortSelect").value) {
                case "artist":
                    filteredAlbums.sort((a, b) => a.artist.localeCompare(b.artist));
                    break;
                case "average":
                    filteredAlbums.sort((a, b) => b.average - a.average);
                    break;
                case "adjusted":
                    filteredAlbums.sort((a, b) => b.adjustedScore - a.adjustedScore);
                    break;
                case "date":
                default:
                    filteredAlbums.sort((a, b) => new Date(b.lastEdited) - new Date(a.lastEdited));
            }

            filteredAlbums.forEach((album, index) => {
                const actualIndex = albums.findIndex(a =>
                    a.artist === album.artist &&
                    a.title === album.title &&
                    a.lastEdited === album.lastEdited
                );
                const changeDate = album.lastEdited ? `<p>Senast ändrad: ${album.lastEdited}</p>` : "";
                const albumCard = document.createElement("div");
                albumCard.className = "albumCard";
                albumCard.innerHTML = `
                    <h3>${album.artist} – ${album.title}</h3>
                    <p>Antal låtar: ${album.songs.length}</p>
                    <p>Antal betygsatta låtar: ${album.songs.filter(r => r !== 0).length}</p>
                    <p>Medelbetyg: ${album.average.toFixed(2)}</p>
                    <p>Medelbetyg (ändrat med 1or och 5or): ${album.adjustedScore.toFixed(2)}</p>
                    <p>Slutbetyg: ${album.finalScore.toFixed(2)}</p>
                    ${changeDate}
                    <button onclick="editAlbum(${actualIndex})">Redigera betyg</button>
                    <button onclick="confirmRemoveAlbum(${actualIndex})">Ta bort detta album</button>
                `;
                albumGrid.appendChild(albumCard);
            });
        }

        document.getElementById("sortSelect").addEventListener("change", renderAlbums);
        searchInput.addEventListener("input", renderAlbums);
        renderAlbums();
    }

    document.getElementById("setAlbumDetails").addEventListener("click", function () {
        let artist = document.getElementById("artistInput").value.trim().toUpperCase();
        let title = document.getElementById("titleInput").value.trim().toUpperCase();
        let totalSongs = parseInt(document.getElementById("totalSongsInput").value);

        if (!artist || !title) {
            alert("Snälla skriv både artist och albumtitel.");
            return;
        }

        if (isNaN(totalSongs) || totalSongs <= 0) {
            alert("Snälla skriv ett giltigt antal låtar.");
            return;
        }

        currentAlbum = {
            artist,
            title,
            songs: new Array(totalSongs).fill(null),
            lastEdited: null,
        };

        stepContainer.style.display = "none";
        ratingsContainer.style.display = "block";
        albumTitleContainer.style.display = "block";
        document.getElementById("albumTitleDisplay").textContent = `Album: ${artist} – ${title}`;
        generateRatingInputs();
    });

    function generateRatingInputs() {
        const ratingInputsDiv = document.getElementById("ratingInputs");
        ratingInputsDiv.innerHTML = "";
        for (let i = 0; i < currentAlbum.songs.length; i++) {
            const inputWrapper = document.createElement("div");
            inputWrapper.innerHTML = `
                <p>Låt ${i + 1}</p>
                <div id="song${i}" class="rating-buttons">
                    ${[1, 2, 3, 4, 5].map(n => `<button onclick="setRating(${i}, ${n})">${n}</button>`).join(" ")}
                    <button onclick="setRating(${i}, 0)">Unrated</button>
                </div>
            `;
            ratingInputsDiv.appendChild(inputWrapper);
        }
    }

    window.setRating = function (index, value) {
        currentAlbum.songs[index] = value;
        const colors = {
            0: "#cccccc",
            1: "#e63946",
            2: "#f77f00",
            3: "#fcbf49",
            4: "#80ed99",
            5: "#4cc9f0"
        };
        document.querySelectorAll(`#song${index} button`).forEach(btn => {
            btn.style.backgroundColor = btn.textContent == value || (value === 0 && btn.textContent === "Unrated") ? colors[value] : "";
        });
    };

    document.getElementById("submitRatings").addEventListener("click", function () {
        if (currentAlbum.songs.some(r => r === null)) {
            alert("Alla låtar måste ha ett betyg eller markeras som unrated.");
            return;
        }

        calculateAndSave(currentAlbum);
        albums.push(currentAlbum);
        saveAlbums();

        stepContainer.style.display = "block";
        ratingsContainer.style.display = "none";
        albumTitleContainer.style.display = "none";
        document.getElementById("artistInput").value = "";
        document.getElementById("titleInput").value = "";
        document.getElementById("totalSongsInput").value = "";

        displayAlbums();
    });

    function calculateAndSave(album) {
        const ratedSongs = album.songs.filter(r => r > 0);
        let sum = ratedSongs.reduce((a, b) => a + b, 0);
        let average = sum / ratedSongs.length;
        let countFives = ratedSongs.filter(num => num === 5).length;
        let countOnes = ratedSongs.filter(num => num === 1).length;
        let adjustedFives = countFives * 0.10;
        let adjustedOnes = countOnes * 0.15;
        let adjustedScore = average + adjustedFives - adjustedOnes;
        let finalScore = Math.round(adjustedScore * 2) / 2;

        album.average = average;
        album.adjustedScore = adjustedScore;
        album.finalScore = finalScore;
        album.lastEdited = new Date().toLocaleString("sv-SE", {
            dateStyle: "short",
            timeStyle: "short"
        });

    }

    window.confirmRemoveAlbum = function (index) {
        const album = albums[index];
        const confirmDelete = confirm(`Är du säker på att du vill ta bort albumet: ${album.artist} – ${album.title}?`);
        if (confirmDelete) {
            albums.splice(index, 1);
            saveAlbums();
            displayAlbums();
        }
    };
      window.editAlbum = function (index) {
        editingAlbumIndex = index;
        currentAlbum = JSON.parse(JSON.stringify(albums[index]));

        const editInputsDiv = document.getElementById("editInputs");
        editInputsDiv.innerHTML = "";
        document.getElementById("editTitle").textContent = `Redigera: ${currentAlbum.artist} – ${currentAlbum.title}`;

        for (let i = 0; i < currentAlbum.songs.length; i++) {
            const inputWrapper = document.createElement("div");
            inputWrapper.innerHTML = `
                <p>Låt ${i + 1}</p>
                <div id="editSong${i}" class="rating-buttons">
                    ${[1, 2, 3, 4, 5].map(n => `<button onclick="setEditRating(${i}, ${n})" style="${n === currentAlbum.songs[i] ? 'background-color:' + getColor(n) : ''}">${n}</button>`).join(" ")}
                    <button onclick="setEditRating(${i}, 0)" style="${currentAlbum.songs[i] === 0 ? 'background-color:#cccccc' : ''}">Unrated</button>
                </div>
            `;
            editInputsDiv.appendChild(inputWrapper);
        }

        resultDiv.style.display = "none";
        editContainer.style.display = "block";
    };

    window.setEditRating = function (index, value) {
        currentAlbum.songs[index] = value;
        const colors = {
            0: "#cccccc",
            1: "#e63946",
            2: "#f77f00",
            3: "#fcbf49",
            4: "#80ed99",
            5: "#4cc9f0"
        };
        document.querySelectorAll(`#editSong${index} button`).forEach(btn => {
            btn.style.backgroundColor =
                (btn.textContent == value || (value === 0 && btn.textContent === "Unrated")) ? colors[value] : "";
        });
    };

    document.getElementById("saveEdit").addEventListener("click", function () {
        if (currentAlbum.songs.some(r => r === null)) {
            alert("Alla låtar måste ha ett betyg eller markeras som unrated.");
            return;
        }

        calculateAndSave(currentAlbum);
        albums[editingAlbumIndex] = currentAlbum;
        saveAlbums();

        editContainer.style.display = "none";
        resultDiv.style.display = "block";
        displayAlbums();
    });

    function getColor(value) {
        const colors = {
            0: "#cccccc",
            1: "#e63946",
            2: "#f77f00",
            3: "#fcbf49",
            4: "#80ed99",
            5: "#4cc9f0"
        };
        return colors[value];
    }

    displayAlbums();
});
