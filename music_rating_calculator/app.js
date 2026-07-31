document.addEventListener("DOMContentLoaded", function () {

    // -----------------------
    // Application data
    // -----------------------

    let albums = JSON.parse(localStorage.getItem("albums")) || [];
    let currentAlbum = {};
    let editingAlbumIndex = null;
    let currentDetailAlbum = null;
    let editingAlbum = null;

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

    const saveMessage = document.getElementById("saveMessage");

    const releaseArtist =
    document.getElementById("releaseArtist");

    const releaseTitle =
        document.getElementById("releaseTitle");

    const releaseYear =
        document.getElementById("releaseYear");

    const releaseCoverUrl =
        document.getElementById("releaseCoverUrl");

    const manualAlbumPopup =
    document.getElementById("manualAlbumPopup");

    const manualArtist =
        document.getElementById("manualArtist");

    const manualTitle =
        document.getElementById("manualTitle");

    const manualYear =
        document.getElementById("manualYear");

    const manualCover =
        document.getElementById("manualCover");

    const manualTrackList =
        document.getElementById("manualTrackList");

    const createManualAlbum =
        document.getElementById("createManualAlbum");

    const cancelManual =
        document.getElementById("cancelManual");

    const addTrackButton =
    document.getElementById("addTrackButton");

    addTrackButton.onclick = function(){

        addManualTrack();

    };

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

        if(searchData.releases.length === 0){

            openManualAlbumDialog(
                artist,
                title
            );

            return;

        }
        const unique = [];
        const seen = new Set();

        for (const release of searchData.releases) {

            const key = release.id;

            if (!seen.has(key)) {

                seen.add(key);

                unique.push(release);

            }

        }

        foundReleases = unique;

        if (foundReleases.length === 0) {

            openManualAlbumDialog(artist, title);

            return;

        }

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

                const stars = `⭐ ${album.finalScore.toFixed(1)}`;

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

                    <div
                        class="albumScore"
                        style="background:${badgeColor}"
                    >
                        ${album.percentScore}
                    </div>

                    <div class="albumStars">
                        ${stars}
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

        editingAlbum = structuredClone(album);

        currentDetailAlbum = album;

        albumDetails.style.display = "block";

        detailCover.src = album.cover || "";

        detailTitle.textContent = album.title;

        detailArtist.textContent = album.artist;

        detailYear.textContent =
            album.year ? album.year.slice(0,4) : "";

        // Track list
        trackList.innerHTML = "";

        editingAlbum.songs.forEach((song,index)=>{

            const row = document.createElement("div");

            row.className = "trackRow";

            const emojis = ["⚪", "🔴", "🟠", "🟡", "🟢", "🔵"];

            row.innerHTML = `
                <span class="trackTitle">
                    ${index + 1}. ${song.title}
                </span>

                <div class="ratingButtons">
                    ${emojis.map((emoji, rating) => `
                        <button
                            class="ratingButton ${song.rating === rating ? "selected" : ""}"
                            data-song="${index}"
                            data-rating="${rating}">
                            ${emoji}
                        </button>
                    `).join("")}
                </div>
            `;

            trackList.appendChild(row);

        });

        trackList.onclick = function(event) {

            const button = event.target.closest(".ratingButton");

            if (!button) return;

            const songIndex = Number(button.dataset.song);
            const rating = Number(button.dataset.rating);

            // Update the album in memory
            editingAlbum.songs[songIndex].rating = rating;

            calculateAndSave(editingAlbum, false);

            // Remove selection from this song only
            button.parentElement
                .querySelectorAll(".ratingButton")
                .forEach(btn => btn.classList.remove("selected"));

            // Highlight clicked button
            button.classList.add("selected");

        };

        const rated = editingAlbum.songs.filter(song => song.rating > 0).length;

        // Statistics
        albumStats.innerHTML = `

            <h3>Statistics</h3>

            <p><strong>Average:</strong> ${editingAlbum.average.toFixed(2)}</p>

            <p><strong>Adjusted:</strong> ${editingAlbum.adjustedScore.toFixed(2)}</p>

            <p><strong>Displayed rating:</strong> ${editingAlbum.finalScore} ★</p>

            <p><strong>Overall:</strong> ${editingAlbum.percentScore}%</p>

             <p><strong>Total songs rated:</strong> ${rated}/${editingAlbum.songs.length}</p>

            <p><strong>Edited:</strong> ${editingAlbum.lastEdited}</p>

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

        releaseArtist.value =
            release["artist-credit"][0].name;

        releaseTitle.value =
            release.title;

        releaseYear.value =
            release.date || "";

        const coverUrl =
            `https://coverartarchive.org/release/${release.id}/front-500`;

        releaseCover.src = coverUrl;

        releaseCoverUrl.value = coverUrl;

        releaseCountry.textContent =
            release.country || "Unknown";

        releaseFormat.textContent =
            release.packaging || "Unknown";

    }

    saveChangesButton.onclick = function () {

        // Replace the original album with the edited copy
        albums[editingAlbumIndex] = editingAlbum;

        // Recalculate scores
        calculateAndSave(albums[editingAlbumIndex]);

        // Save to localStorage
        saveAlbums();

        saveMessage.textContent = "Changes saved ✓";
        saveMessage.classList.add("show");

        setTimeout(() => {

            saveMessage.classList.remove("show");

        }, 2000);


        // Refresh the library
        displayAlbums();

        // Reopen the saved album
        showAlbumDetails(albums[editingAlbumIndex]);

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

            artist: releaseArtist.value.trim(),

            title: releaseTitle.value.trim(),

            year: releaseYear.value.trim(),

            cover: releaseCoverUrl.value.trim(),

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

    function addManualTrack(name = "") {

        const row = document.createElement("input");

        row.type = "text";

        row.className = "manualTrack";

        row.placeholder = "Track name";

        row.value = name;

        manualTrackList.appendChild(row);

    }
    function openManualAlbumDialog(artist, title){

        manualArtist.value = artist;

        manualTitle.value = title;

        manualYear.value = "";

        manualCover.value = "";

        // Clear any tracks from a previous manual album
        manualTrackList.innerHTML = "";

        // Add 10 empty track inputs
        addManualTrack();

        manualAlbumPopup.classList.remove("hidden");

    }
    createManualAlbum.onclick = function(){
        if (!manualArtist.value.trim() || !manualTitle.value.trim()) {
        alert("Please enter an artist and album title.");
        return;
    }

    const songs = [...manualTrackList.querySelectorAll(".manualTrack")]
        .filter(input => input.value.trim())
        .map(input => ({
            title: input.value.trim(),
            rating: 0
        }));

    if (songs.length === 0) {
        alert("Please add at least one track.");
        return;
    }

        const album = {

            id: crypto.randomUUID(),

            artist: manualArtist.value,

            title: manualTitle.value,

            year: manualYear.value,

            cover: manualCover.value || "assets/no-cover.png",

            songs,

            mbid: null

        };

        calculateAndSave(album);

        albums.push(album);

        saveAlbums();

        displayAlbums();

        manualAlbumPopup.classList.add("hidden");

        showAlbumDetails(album);

    };

    cancelManual.onclick = function(){

        manualAlbumPopup.classList.add("hidden");

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
        catch (err) {
            console.error(err);
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
