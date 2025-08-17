This is something I made last year. I vibe coded the javascript with the help of ChatGPT because I could not bother writing code in Javascript at the time. The first few lines is what I made. Maybe in the future I will come back and polish this. I'm uploading this so I can install it on my laptop.

How it works:
It gives you the option to provide name of album and how many songs there are in the album. Then you have the option to rate each individual song from a rating of 1-5. It then mathematically provides a rating by taking the mean/average score. But because I wanted it to be more/less favorable towards really good/bad tracks I made it so that if a track has a rating of 1 it deduces 0.1 from the average score, and respectively it gains 0.1 if it gets a 5. I have found that this method provides the most efficient album scoring method from an objective standpoint, and because "I made it" I feel like it is good enough.

Inspiration to make this:
I usually did this for ratemymusic by doing the mathematics in my head or using the online calculator, but then one day I thought "I know how to program, let me build an application to do this for me" so I wrote it in Python flawlessly but then I got bored of putting in the 1, 2, 3, 4, 5 in the input tab so I decided to make it more interactable through HTML and JS.

Updated version as of 17/08/2025:
<img width="1778" height="959" alt="image" src="https://github.com/user-attachments/assets/b0bc89f1-105a-4bce-bc97-e085cf4ee85c" />
