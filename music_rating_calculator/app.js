document.addEventListener("DOMContentLoaded", function () {

    // -----------------------
    // Application data
    // -----------------------

    let albums = JSON.parse(localStorage.getItem("albums")) || [];
    let currentAlbum = {};
    let editingAlbumIndex = null;
    let currentDetailAlbum = null;

    // MusicBrainz
    let foundReleases = [];
    let selectedRelease = null;

    // -----------------------
    // DOM Elements
    // -----------------------

    const toolbar = document.getElementById("toolbar");
    const resultDiv = document.getElementById("results");
    // MusicBrainz popup
    const releasePopup = document.getElementById("releasePopup");
    const releaseList = document.getElementById("releaseList");
    const confirmRelease = document.getElementById("confirmRelease");
    const cancelRelease = document.getElementById("cancelRelease");

    // Release preview
    const releasePreview = document.getElementById("releasePreview");
    const releaseCover = document.getElementById("releaseCover");

    // Release information
    const releaseInfo = document.getElementById("releaseInfo");
    const releaseCountry = document.getElementById("releaseCountry");
    const releaseFormat = document.getElementById("releaseFormat");
    const releaseLabel = document.getElementById("releaseLabel");
    const releaseTracks = document.getElementById("releaseTracks");
    const releaseGenres = document.getElementById("releaseGenres");

    const albumDetails = document.getElementById("albumDetails");

    const detailCover = document.getElementById("detailCover");
    const detailTitle = document.getElementById("detailTitle");
    const detailArtist = document.getElementById("detailArtist");
    const detailYear = document.getElementById("detailYear");

    const trackList = document.getElementById("trackList");
    const albumStats = document.getElementById("albumStats");

    const deleteAlbumButton = document.getElementById("deleteAlbumButton");

    const saveChangesButton = document.getElementById("saveChangesButton");

    /* STORAGE */
    function saveAlbums() {
        localStorage.setItem("albums", JSON.stringify(albums));
    }

    /* API MUSICBRAINZ */
    async function fetchAlbum(artist, title) {
        console.log("Searching...");
        const query =
            `artist:"${artist}" AND release:"${title}"`;

        const searchUrl =
            `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query)}&fmt=json&limit=10`;

        const searchResponse = await fetch(searchUrl);

        console.log(searchResponse);
        const searchData = await searchResponse.json();

        console.log(searchData);

        if (!searchData.releases.length) {
            throw new Error("Album not found");
        }

        const unique = [];
        const seen = new Set();

        for (const release of searchData.releases) {
            // Skip releases with missing information
            if (!release.date) {
                continue;
            }
            const key = release.id;

            if (!seen.has(key)) {
                seen.add(key);
                unique.push(release);
            }
        }
        console.log("Showing popup");

        foundReleases = unique;
        showReleasePopup(foundReleases);
    }

    /* SCORING (MIGHT CHANGE IN THE FUTURE) */
    function calculateAndSave(album, updateTimestamp = true) {
        const rated = album.songs
            .map(song => song.rating)
            .filter(r => r > 0);

        const avg = rated.length
            ? rated.reduce((a,b)=>a+b,0)/rated.length
            : 0;

        const adjusted =
            Math.max(0,
                avg +
                rated.filter(n=>n===5).length*0.10 -
                rated.filter(n=>n===1).length*0.15
            );


        const finalScore = Math.round(adjusted*2)/2;

        // NEW ECHELON PERCENT SCORE
        let bandBase = finalScore * 20;
        let lower = finalScore - 0.25;
        let upper = finalScore + 0.25;

        let position = (adjusted - lower) / (upper - lower);
        position = Math.max(0, Math.min(1, position));

        album.percentScore = Math.max(
            0,
            Math.min(100, Math.round((adjusted / 5.3) * 100))
        );

        album.average = avg;
        album.adjustedScore = adjusted;
        album.finalScore = finalScore;

        if (updateTimestamp) {
            album.lastEdited = new Date().toLocaleString("sv-SE");
            
        }
    }

    /* INITIALIZATION */
    albums.forEach(album => {
        if (album.songs) {
            calculateAndSave(album, false);
        }
    });
    saveAlbums();

    /*  BACKUP */
    function downloadBackup() {
        const dataStr =
            "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(albums, null, 2));

        const a = document.createElement("a");
        a.href = dataStr;
        a.download = "album_backup.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
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

                    albums.forEach(album => {
                        if (album.songs) {
                            calculateAndSave(album, false);
                        }
                    });

                    saveAlbums();
                    displayAlbums();

                } else {

                    alert("Invalid backup file.");

                }

            } catch {

                alert("Could not read backup.");

            }

        };
        reader.readAsText(file);
    }

    /* EVENT LISTENERS */

    const backupButton = document.getElementById("backupButton");
    const importInput = document.getElementById("importInput");

    backupButton.addEventListener("click", downloadBackup);
    importInput.addEventListener("change", uploadBackup);



    deleteAlbumButton.onclick = function(){

        confirmRemoveAlbum(editingAlbumIndex);

    };

    /* ---------- DISPLAY ---------- */

    function displayAlbums() {
        resultDiv.innerHTML = `
            <div id="libraryControls">

                <input
                    type="text"
                    id="searchInput"
                    placeholder="🔍 Sök artist eller album..."
                />

                <div id="sortControls">

                    <label for="sortSelect">
                        Sortera efter
                    </label>

                    <select id="sortSelect">
                        <option value="date">Datum</option>
                        <option value="artist">Artist</option>
                        <option value="year">Utgivningsår</option>
                        <option value="average">Medelbetyg</option>
                        <option value="adjusted">Ändrat betyg</option>
                    </select>

                </div>

            </div>

            <div id="albumGrid"></div>
        `;

        const albumGrid = document.getElementById("albumGrid");
        const searchInput = document.getElementById("searchInput");
        const sortSelect = document.getElementById("sortSelect");
        const libraryCount = document.getElementById("libraryCount");

        function renderAlbums() {
                albumGrid.innerHTML = "";
                let filtered = [...albums];
                const term = searchInput.value.toLowerCase();
                filtered = filtered.filter(album =>
                    album.artist.toLowerCase().includes(term) ||
                    album.title.toLowerCase().includes(term)
                );
                libraryCount.textContent = `💿 ${albums.length} album`;

            switch (sortSelect.value) {
                case "artist":
                    filtered.sort((a, b) => a.artist.localeCompare(b.artist));
                    break;
                case "year":
                    filtered.sort((a, b) => (b.year || "").localeCompare(a.year || ""));
                    break;
                case "average":
                    filtered.sort((a, b) => b.average - a.average);
                    break;
                case "adjusted":
                    filtered.sort((a, b) => b.adjustedScore - a.adjustedScore);
                    break;
                default:
                    filtered.sort(
                        (a, b) => new Date(b.lastEdited) - new Date(a.lastEdited)
                    );
            }

            filtered.forEach(album => {
                const index = albums.indexOf(album);

                const coverHTML = album.cover
                    ? `<img class="albumCover" src="${album.cover}">`
                    : "";

                const card = document.createElement("div");
                card.className = "albumCard";

                const starCount = Math.min(5, Math.ceil(album.finalScore));

                const stars =
                    "★".repeat(starCount) +
                    "☆".repeat(5 - starCount);

                // Generate score badge color
                const hue = Math.round(album.percentScore * 1.2);
                const badgeColor = `hsl(${hue}, 70%, 45%)`;

                card.innerHTML = `
                    ${coverHTML}

                    <div class="albumInfo">

                    <div class="albumTitle">
                        ${album.title}
                    </div>

                    <div class="albumArtist">
                        ${album.artist}
                    </div>

                    <div class="albumRelease">
                        ${album.year ? album.year.slice(0, 4) : ""}
                    </div>

                </div>

                <div class="albumMeta">

                    <div class="albumStars">
                        ${stars}
                    </div>

                    <div
                        class="albumScore"
                        style="background:${badgeColor}"
                    >
                        ${album.percentScore}
                    </div>

                    <div class="albumDate">
                        ${album.lastEdited.split(" ")[0]}
                    </div>

                </div>      
                `;

                card.addEventListener("click", () => {

                    showAlbumDetails(album);

                });

                albumGrid.appendChild(card);
            });
        }

        sortSelect.addEventListener("change", renderAlbums);
        searchInput.addEventListener("input", renderAlbums);
        renderAlbums();
    }

    function showAlbumDetails(album){
        editingAlbumIndex = albums.indexOf(album);

        currentDetailAlbum = album;

        albumDetails.style.display = "block";

        detailCover.src = album.cover || "";

        detailTitle.textContent = album.title;

        detailArtist.textContent = album.artist;

        detailYear.textContent =
            album.year ? album.year.slice(0,4) : "";

        // Track list
        trackList.innerHTML = "";

        album.songs.forEach((song,index)=>{

            const row = document.createElement("div");

            row.className = "trackRow";

            row.innerHTML = `
                <span class="trackTitle">
                    ${index + 1}. ${song.title}
                </span>

                <select id="rating${index}" class="trackRating">

                    <option value="0" ${song.rating == 0 || song.rating == null ? "selected" : ""}>
                        ⚪ Unrated
                    </option>

                    <option value="1" ${song.rating == 1 ? "selected" : ""}>🔴 Red</option>
                    <option value="2" ${song.rating == 2 ? "selected" : ""}>🟠 Orange</option>
                    <option value="3" ${song.rating == 3 ? "selected" : ""}>🟡 Yellow</option>
                    <option value="4" ${song.rating == 4 ? "selected" : ""}>🟢 Green</option>
                    <option value="5" ${song.rating == 5 ? "selected" : ""}>🔵 Blue</option>

                </select>
            `;

            trackList.appendChild(row);

        });

        const rated = album.songs.filter(song => song.rating > 0).length;

        // Statistics
        albumStats.innerHTML = `

            <h3>Statistics</h3>

            <p><strong>Average:</strong> ${album.average.toFixed(2)}</p>

            <p><strong>Adjusted:</strong> ${album.adjustedScore.toFixed(2)}</p>

            <p><strong>Overall:</strong> ${album.percentScore}%</p>

             <p><strong>Rated:</strong> ${rated}/${album.songs.length}</p>

            <p><strong>Edited:</strong> ${album.lastEdited}</p>

        `;
    }

    cancelRelease.onclick = function () {

        releasePopup.classList.add("hidden");

    };

        function showReleasePopup(releases){

        releaseList.innerHTML = "";

        releases.forEach((release,index)=>{

            const label=document.createElement("label");

            label.className="releaseOption";

            label.innerHTML=`

            <input
                type="radio"
                name="release"
                value="${index}"
                ${index===0?"checked":""}
            >

            ${release.date || "Unknown year"}

            —

            ${release.country || "Unknown country"}

            —

            ${release.title}

            `;

            releaseList.appendChild(label);

        });

        selectedRelease = releases[0];

        updateReleasePreview(selectedRelease);

        releaseList.onchange = (e) => {

            selectedRelease = releases[e.target.value];

            updateReleasePreview(selectedRelease);

        };

        releasePopup.classList.remove("hidden");

    }

    function updateReleasePreview(release){

        releaseCover.src =
            `https://coverartarchive.org/release/${release.id}/front-500`;

        releaseCountry.textContent =
            release.country || "Unknown";

        releaseFormat.textContent =
            release.packaging || "Unknown";

    }

    saveChangesButton.onclick = function(){

        currentDetailAlbum.songs.forEach((song,index)=>{

            song.rating = Number(
                document.getElementById(`rating${index}`).value
            );

        });

        calculateAndSave(currentDetailAlbum);

        saveAlbums();

        displayAlbums();

        showAlbumDetails(currentDetailAlbum);

    };



    confirmRelease.onclick = async () => {

        releasePopup.classList.add("hidden");

        const details = await fetch(
            `https://musicbrainz.org/ws/2/release/${
            selectedRelease.id
            }?inc=recordings&fmt=json`
        );

        const album = await details.json();

        currentAlbum = {

            artist:
            selectedRelease["artist-credit"][0].name,

            title:
            selectedRelease.title,

            year:
            selectedRelease.date,

            mbid:
            selectedRelease.id,

            cover:
            `https://coverartarchive.org/release/${selectedRelease.id}/front-500`,

            songs: (album.media?.[0]?.tracks ?? []).map(track => ({
                title: track.title,
                rating: 0
            }))

        };

        calculateAndSave(currentAlbum);

        albums.push(currentAlbum);

        saveAlbums();

        displayAlbums();

        showAlbumDetails(currentAlbum);

    };



    /* ---------- CREATE ALBUM (UNCHANGED) ---------- */

    document.getElementById("setAlbumDetails").onclick = async function () {

        const artist =
            document.getElementById("artistInput").value.trim();

        const title =
            document.getElementById("titleInput").value.trim();

        if (!artist || !title) {
            alert("Fill in artist and album.");
            return;
        }

        try {
            await fetchAlbum(artist, title);
        }
        catch {
            alert("Album could not be found.");
        }

    };

    /* ---------- EDIT / DELETE (UNCHANGED) ---------- */

    window.confirmRemoveAlbum=function(i){
        if(confirm("Ta bort album?")){
            albums.splice(i,1);
            saveAlbums();
            displayAlbums();
        }
    };

    displayAlbums();
});
