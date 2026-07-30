document.addEventListener("DOMContentLoaded", function () {

    // -----------------------
    // Application data
    // -----------------------

    let albums = JSON.parse(localStorage.getItem("albums")) || [];
    let currentAlbum = {};
    let editingAlbumIndex = null;

    // MusicBrainz
    let foundReleases = [];
    let selectedRelease = null;

    // -----------------------
    // DOM Elements
    // -----------------------

    const stepContainer = document.getElementById("stepContainer");
    const ratingsContainer = document.getElementById("ratingsContainer");
    const resultDiv = document.getElementById("results");
    const albumTitleContainer = document.getElementById("albumTitleContainer");
    const editContainer = document.getElementById("editContainer");

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

            const key =
                `${release.date}-${release.country}-${release.packaging}`;

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

    /* ---------- DISPLAY ---------- */

    function displayAlbums() {
        resultDiv.innerHTML = `
            <h2>Alla sparade album (${albums.length}):</h2>
            <input type="text" id="searchInput" placeholder="Sök artist eller album..." />
            <div id="sortControls">
                <label>Sortera:</label>
                <select id="sortSelect">
                    <option value="date">Datum</option>
                    <option value="artist">Artist</option>
                    <option value="year">Utgivningsår</option>
                    <option value="average">Medelbetyg</option>
                    <option value="adjusted">Ändrat betyg</option>
                </select>
            </div>
            <div id="albumGrid"></div>
        `;

        const albumGrid = document.getElementById("albumGrid");
        const searchInput = document.getElementById("searchInput");
        const sortSelect = document.getElementById("sortSelect");

        function renderAlbums() {
                albumGrid.innerHTML = "";
                let filtered = [...albums];
                const term = searchInput.value.toLowerCase();
                filtered = filtered.filter(album =>
                    album.artist.toLowerCase().includes(term) ||
                    album.title.toLowerCase().includes(term)
                );

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
                albumGrid.appendChild(card);
            });
        }

        sortSelect.addEventListener("change", renderAlbums);
        searchInput.addEventListener("input", renderAlbums);
        renderAlbums();
    }

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
                rating: null
            }))

        };

        stepContainer.style.display = "none";
        ratingsContainer.style.display = "block";
        albumTitleContainer.style.display = "block";

        document.getElementById("albumTitleDisplay").textContent =
            `${currentAlbum.artist} - ${currentAlbum.title}`;

        generateRatingInputs();

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

    function generateRatingInputs() {
        const div = document.getElementById("ratingInputs");
        div.innerHTML = "";

        currentAlbum.songs.forEach((song, i) => {
            div.innerHTML += `
                <p>${i + 1}. ${song.title}</p>
                <div id="song${i}" class="rating-buttons">
                    ${[1,2,3,4,5].map(n =>
                        `<button onclick="setRating(${i},${n})">${n}</button>`
                    ).join("")}
                    <button onclick="setRating(${i},0)">Unrated</button>
                </div>`;
        });
    }

    function getColor(value) {
        return {
            0:"#cccccc",
            1:"#e63946",
            2:"#f77f00",
            3:"#fcbf49",
            4:"#80ed99",
            5:"#4cc9f0"
        }[value];
    }

    window.setRating = function(index, value) {
        currentAlbum.songs[index].rating = value;
        document.querySelectorAll(`#song${index} button`)
            .forEach(btn => btn.style.backgroundColor = "");
        document.querySelectorAll(`#song${index} button`)
            .forEach(btn => {
                if(btn.textContent == value ||
                   (value===0 && btn.textContent==="Unrated")){
                    btn.style.backgroundColor = getColor(value);
                }
            });
    };

    document.getElementById("submitRatings").onclick = function () {
        if (currentAlbum.songs.some(song => song.rating === null)) {
            alert("Alla låtar måste betygsättas.");
            return;
        }

        calculateAndSave(currentAlbum);
        albums.push(currentAlbum);
        saveAlbums();

        stepContainer.style.display="block";
        ratingsContainer.style.display="none";
        albumTitleContainer.style.display="none";

        displayAlbums();
    };

    /* ---------- EDIT / DELETE (UNCHANGED) ---------- */

    window.confirmRemoveAlbum=function(i){
        if(confirm("Ta bort album?")){
            albums.splice(i,1);
            saveAlbums();
            displayAlbums();
        }
    };

    window.editAlbum=function(i){
        editingAlbumIndex=i;
        currentAlbum=JSON.parse(JSON.stringify(albums[i]));

        const div=document.getElementById("editInputs");
        div.innerHTML="";

        currentAlbum.songs.forEach((song, idx) => {
            div.innerHTML += `
                <p>${idx + 1}. ${song.title}</p>
                <div id="editSong${idx}" class="rating-buttons">
                    ${[1,2,3,4,5].map(n =>
                        `<button onclick="setEditRating(${idx},${n})">${n}</button>`
                    ).join("")}
                    <button onclick="setEditRating(${idx},0)">Unrated</button>
                </div>`;
        });

        currentAlbum.songs.forEach((song, i) => {
            if (song.rating !== null) {
                setEditRating(i, song.rating);
            }
        });

        editContainer.style.display="block";
        resultDiv.style.display="none";
    };

    window.setEditRating=function(index,value){
        currentAlbum.songs[index].rating = value;
        document.querySelectorAll(`#editSong${index} button`)
            .forEach(btn=>btn.style.backgroundColor="");
        document.querySelectorAll(`#editSong${index} button`)
            .forEach(btn=>{
                if(btn.textContent==value ||
                   (value===0 && btn.textContent==="Unrated")){
                    btn.style.backgroundColor=getColor(value);
                }
            });
    };

    document.getElementById("saveEdit").onclick=function(){
        calculateAndSave(currentAlbum, true);
        albums[editingAlbumIndex]=currentAlbum;
        saveAlbums();

        editContainer.style.display="none";
        resultDiv.style.display="block";
        displayAlbums();
    };

    displayAlbums();
});
