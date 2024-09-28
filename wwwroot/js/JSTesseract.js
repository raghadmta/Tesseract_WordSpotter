function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function normalizeText(text) {
    return text
        .replace(/\u200E|\u200F/g, '')  // Remove invisible RTL/LTR markers
        .replace(/[^\w\u0600-\u06FF\s\u064B-\u065F]/g, '')  // Retain Arabic, English alphanumeric and spaces
        .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
        .trim()
        .toLowerCase();  // Convert to lower case 
}

let matchGroups = [];
let currentMatchIndex = 0;
const verticalThreshold = 10;

function highlightPhraseOnCanvas(canvas, ocrWords, normalizedSearchTerm, imgWidth, imgHeight, imageIndex) {
    if (!canvas) return [];
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let matchedGroups = [];
    let currentPhrase = [];
    let currentPhraseBoxes = [];
    let bufferPhrase = '';  

    for (let i = 0; i < ocrWords.length; i++) {
        const wordObj = ocrWords[i];
        const normalizedWord = normalizeText(wordObj.text);
        const currentBox = wordObj.bbox;

         bufferPhrase += normalizedWord + ' ';
        currentPhrase.push(normalizedWord);
        currentPhraseBoxes.push(currentBox);

         if (i > 0) {
            const previousBox = ocrWords[i - 1].bbox;
            if (Math.abs(previousBox.y0 - currentBox.y0) > verticalThreshold) {
                bufferPhrase = bufferPhrase.trim();  

                 if (bufferPhrase.includes(normalizedSearchTerm)) {
                    matchedGroups.push({ boxes: currentPhraseBoxes.slice(), imageIndex });
                }

                 currentPhrase = [];
                currentPhraseBoxes = [];
                bufferPhrase = '';  
            }
        }

         if (bufferPhrase.includes(normalizedSearchTerm)) {
            matchedGroups.push({ boxes: currentPhraseBoxes.slice(), imageIndex });

             currentPhrase = [];
            currentPhraseBoxes = [];
            bufferPhrase = '';
        } else if (currentPhrase.length > normalizedSearchTerm.split(' ').length) {
             currentPhrase.shift();
            currentPhraseBoxes.shift();
        }
    }

     if (bufferPhrase.includes(normalizedSearchTerm)) {
        matchedGroups.push({ boxes: currentPhraseBoxes.slice(), imageIndex });
    }

     if (matchedGroups.length > 0) {
        const scaleX = canvas.width / imgWidth;
        const scaleY = canvas.height / imgHeight;

        matchedGroups.forEach(group => {
            group.boxes.forEach(box => {
                const adjustedX0 = box.x0 * scaleX;
                const adjustedY0 = box.y0 * scaleY+20;
                const adjustedWidth = (box.x1 - box.x0) * scaleX;
                const adjustedHeight = (box.y1 - box.y0) * scaleY;

                ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
                ctx.lineWidth = 2;

                ctx.fillRect(adjustedX0, adjustedY0, adjustedWidth, adjustedHeight);
                ctx.strokeRect(adjustedX0, adjustedY0, adjustedWidth, adjustedHeight);
            });
        });
    }

    return matchedGroups;
}

async function searchAndHighlight(searchTerm) {
    const searchResultsDiv = document.getElementById('matchInfo');
    searchResultsDiv.innerHTML = '';

    const images = document.querySelectorAll('.searchable-img');
    const normalizedSearchTerm = normalizeText(searchTerm);  

    matchGroups = [];
    currentMatchIndex = 0;
    let totalMatches = 0;

    let messageElement = searchResultsDiv.querySelector('div');
    if (!messageElement) {
        messageElement = document.createElement('div');
        searchResultsDiv.appendChild(messageElement);
    }

    const ocrPromises = Array.from(images).map(async (image, index) => {
        const canvas = document.getElementById(`canvas(${index + 1})`);
        if (!canvas) {
            console.error(`Canvas not found for image ${index + 1}`);
            return;
        }

        const result = await Tesseract.recognize(image.src, 'ara+eng', {
            langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast/'
        });
 
        let fullText = normalizeText(result.data.text);  
         
        const matchCount = (fullText.match(new RegExp(escapeRegExp(normalizedSearchTerm), 'gi')) || []).length;
        totalMatches += matchCount;

        canvas.width = image.width;
        canvas.height = image.height;

        const matchedGroups = highlightPhraseOnCanvas(canvas, result.data.words, normalizedSearchTerm, image.naturalWidth, image.naturalHeight, index);

        if (matchedGroups.length > 0) {
            const canvasRect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / image.naturalWidth;
            const scaleY = canvas.height / image.naturalHeight;

            matchedGroups.forEach(group => {
                let groupBounds = group.boxes.map(box => ({
                    left: canvasRect.left + box.x0 * scaleX + window.scrollX,
                    top: canvasRect.top + box.y0 * scaleY + window.scrollY,
                    width: (box.x1 - box.x0) * scaleX,
                    height: (box.y1 - box.y0) * scaleY,
                    imageIndex: group.imageIndex
                }));

                matchGroups.push(groupBounds);
            });
        }
    });

    await Promise.all(ocrPromises);

    matchGroups.sort((a, b) => a[0].imageIndex - b[0].imageIndex);

    if (totalMatches > 0) {
        messageElement.textContent = `Match 1 of ${totalMatches}`;
        scrollToMatch(0);
    } else {
        messageElement.textContent = `No matches found`;
    }
}

function scrollToMatch(index) {
    if (matchGroups.length > 0 && index >= 0 && index < matchGroups.length) {
        const group = matchGroups[index];

        const firstBox = group[0];
        window.scrollTo({
            top: firstBox.top + firstBox.height / 2 - window.innerHeight / 2,
            left: firstBox.left + firstBox.width / 2 - window.innerWidth / 2,
            behavior: 'smooth'
        });

        const searchResultsDiv = document.getElementById('matchInfo');
        searchResultsDiv.textContent = `Match ${index + 1} of ${matchGroups.length}`;
    }
}

function nextMatch() {
    if (matchGroups.length > 0) {
        currentMatchIndex = (currentMatchIndex + 1) % matchGroups.length;
        scrollToMatch(currentMatchIndex);
    }
}

function prevMatch() {
    if (matchGroups.length > 0) {
        currentMatchIndex = (currentMatchIndex - 1 + matchGroups.length) % matchGroups.length;
        scrollToMatch(currentMatchIndex);
    }
}
function startSearch() {
    const searchButton = document.getElementById('searchButton');
    const loader = document.getElementById('loader');
    const searchButtonText = document.getElementById('searchButtonText');
    const searchNote = document.getElementById('searchNote');
    const searchTerm = document.getElementById('searchWord').value.trim();

    if (!searchTerm) {
        alert("Please enter a search term.");
        return;
    }

    searchButton.disabled = true;
    searchButtonText.textContent = "Searching...";
    loader.style.display = "inline-block";
    searchNote.style.display = "block";

    searchAndHighlight(searchTerm)
        .then(() => {
            searchButton.classList.add('btn-success');
            searchButton.classList.remove('btn-primary');
            searchButtonText.textContent = "Done !";
            loader.style.display = "none";
            searchNote.style.display = "none";

            setTimeout(() => {
                searchButton.classList.remove('btn-success');
                searchButton.classList.add('btn-primary');
                searchButtonText.textContent = "Search";
                searchButton.disabled = false;
            }, 3000);
        })
        .catch((error) => {
            console.error(error);
            alert("Error during the search.");
            searchButton.disabled = false;
            searchButtonText.textContent = "Search";
            loader.style.display = "none";
            searchNote.style.display = "none";
        });
}
 