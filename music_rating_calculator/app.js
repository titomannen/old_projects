//Iteration 1
/*
document.addEventListener("DOMContentLoaded", function () {
  const ratings = [];
  const inputField = document.getElementById("ratingInput");
  const resultDiv = document.getElementById("results");

  document.getElementById("addRating").addEventListener("click", function () {
      const rating = parseFloat(inputField.value);
      if (!isNaN(rating)) {
          ratings.push(rating);
          inputField.value = "";
          displayResults();
      } else {
          alert("Fel input. Snälla skriv ett nummer.");
      }
  });

  document.getElementById("calculateAverage").addEventListener("click", function () {
      if (ratings.length === 0) {
          alert("Inga tal kunde identifieras.");
          return;
      }

      let sum = 0;
      let countFives = 0;
      let countOnes = 0;

      ratings.forEach(num => {
          sum += num;
          if (num === 5) countFives++;
          if (num === 1) countOnes++;
      });

      let average = sum / ratings.length;
      let adjustedFives = countFives * 0.10;
      let adjustedOnes = countOnes * 0.15;
      let adjustedScore = average + adjustedFives - adjustedOnes;
      let finalScore = Math.round(adjustedScore * 2) / 2;

      resultDiv.innerHTML = `
          <p>Antal låtar: ${ratings.length}</p>
          <p>Totala värdet: ${sum.toFixed(0)}</p>
          <p>Medelvärdet: ${average.toFixed(2)}</p>
          <p>Medelbetyg (ändrat med 1or och 5or): ${adjustedScore.toFixed(2)}</p>
          <p>Slutbetyg (avrundat): ${finalScore.toFixed(2)}</p>
      `;
  });

  function displayResults() {
      document.getElementById("ratingsList").textContent = "Nuvarande betyg: " + ratings.join(", ");
  }
});
*/
document.addEventListener("DOMContentLoaded", function () {
  let albums = JSON.parse(localStorage.getItem("albums")) || [];
  let currentAlbum = {};

  const stepContainer = document.getElementById("stepContainer");
  const ratingsContainer = document.getElementById("ratingsContainer");
  const resultDiv = document.getElementById("results");
  const albumTitleContainer = document.getElementById("albumTitleContainer");

  function saveAlbums() {
      localStorage.setItem("albums", JSON.stringify(albums));
  }

  function displayAlbums() {
      resultDiv.innerHTML = "<h2>Alla sparade album:</h2>";
      albums.forEach((album, index) => {
          resultDiv.innerHTML += `
              <div id="album-${index}">
                  <h3>${album.title}</h3>
                  <p>Antal låtar: ${album.songs.length}</p>
                  <p>Medelbetyg: ${album.average.toFixed(2)}</p>
                  <p>Medelbetyg (ändrat med 1or och 5or): ${album.adjustedScore.toFixed(2)}</p>
                  <p>Slutbetyg: ${album.finalScore.toFixed(2)}</p>
                  <button onclick="removeAlbum(${index})">Ta bort detta album</button>
              </div>
          `;
      });
  }

  document.getElementById("setAlbumDetails").addEventListener("click", function () {
      let albumTitle = document.getElementById("albumTitleInput").value.trim();
      let totalSongs = parseInt(document.getElementById("totalSongsInput").value);
      
      if (!albumTitle) {
          alert("Snälla skriv ett albumtitel.");
          return;
      }
      
      if (isNaN(totalSongs) || totalSongs <= 0) {
          alert("Snälla skriv ett giltigt antal låtar.");
          return;
      }
      
      currentAlbum = {
          title: albumTitle,
          songs: new Array(totalSongs).fill(null),
      };
      
      stepContainer.style.display = "none";
      ratingsContainer.style.display = "block";
      albumTitleContainer.style.display = "block";
      document.getElementById("albumTitleDisplay").textContent = `Album: ${albumTitle}`;
      generateRatingInputs();
  });

  function generateRatingInputs() {
      const ratingInputsDiv = document.getElementById("ratingInputs");
      ratingInputsDiv.innerHTML = "";
      for (let i = 0; i < currentAlbum.songs.length; i++) {
          const inputWrapper = document.createElement("div");
          inputWrapper.innerHTML = `
              <label for="song${i}">Låt ${i + 1} betyg (1-5): </label>
              <input type="number" id="song${i}" min="1" max="5">
          `;
          ratingInputsDiv.appendChild(inputWrapper);
      }
  }

  document.getElementById("submitRatings").addEventListener("click", function () {
      for (let i = 0; i < currentAlbum.songs.length; i++) {
          const rating = parseFloat(document.getElementById(`song${i}`).value);
          if (isNaN(rating) || rating < 1 || rating > 5) {
              alert(`Fel input för låt ${i + 1}. Snälla skriv ett nummer mellan 1 och 5.`);
              return;
          }
          currentAlbum.songs[i] = rating;
      }

      let sum = currentAlbum.songs.reduce((a, b) => a + b, 0);
      let average = sum / currentAlbum.songs.length;
      let countFives = currentAlbum.songs.filter(num => num === 5).length;
      let countOnes = currentAlbum.songs.filter(num => num === 1).length;
      let adjustedFives = countFives * 0.10;
      let adjustedOnes = countOnes * 0.15;
      let adjustedScore = average + adjustedFives - adjustedOnes;
      let finalScore = Math.round(adjustedScore * 2) / 2;

      currentAlbum.average = average;
      currentAlbum.adjustedScore = adjustedScore;
      currentAlbum.finalScore = finalScore;
      albums.push(currentAlbum);
      saveAlbums();
      
      stepContainer.style.display = "block";
      ratingsContainer.style.display = "none";
      albumTitleContainer.style.display = "none";
      document.getElementById("albumTitleInput").value = "";
      document.getElementById("totalSongsInput").value = "";

      displayAlbums();
  });

  window.removeAlbum = function (index) {
      albums.splice(index, 1);
      saveAlbums();
      displayAlbums();
  };

  document.getElementById("removeData").addEventListener("click", function () {
      localStorage.removeItem("albums");
      albums = [];
      alert("Alla sparade album har tagits bort.");
      location.reload();
  });

  displayAlbums();
});
