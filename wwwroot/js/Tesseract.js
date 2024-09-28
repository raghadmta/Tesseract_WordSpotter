let searchTimeout;
const searchInput = $('#searchInput');
const resultInfo = $('#resultInfo');
const imageContainer = $('#imageContainer');
const previousButton = $('#previousButton');
const nextButton = $('#nextButton');
const loadingIndicator = $('#loadingIndicator');
const originalImage = $('#originalImage');

searchInput.on('input', function () {
    clearTimeout(searchTimeout);
    loadingIndicator.show();
    searchTimeout = setTimeout(performSearch, 500);
});

nextButton.on('click', nextMatch);
previousButton.on('click', previousMatch);

function performSearch() {
    const searchTerm = searchInput.val().trim();
    if (searchTerm.length === 0) {
        resetView();
        return;
    }

    $.ajax({
        url: '/Tesseract/Search',
        type: 'POST',
        data: {
            searchTerm: searchTerm
        },
        beforeSend: function () {
            loadingIndicator.show();
        },
        success: function (data) {
            updateView(data);
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
        },
        complete: function () {
            loadingIndicator.hide();
        }
    });
}

function nextMatch() {
    $.ajax({
        url: '/Tesseract/NextMatch',
        type: 'POST',
        success: function (data) {
            updateView(data);
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
        }
    });
}

function previousMatch() {
    $.ajax({
        url: '/Tesseract/PreviousMatch',
        type: 'POST',
        success: function (data) {
            updateView(data);
        },
        error: function (xhr, status, error) {
            console.error('Error:', error);
        }
    });
}

function updateView(data) {
    if (data.success) {
        resultInfo.html(`
             match ${data.currentIndex} of ${data.matchCount}
         `);

        // Fetch the processed image from the session
        imageContainer.html(`<img src="${data.imagePath}?t=${new Date().getTime()}" alt="Processed Image" />`);

        nextButton.toggle(data.matchCount > 1);
        previousButton.toggle(data.matchCount > 1);
    } else {
        resultInfo.html(`<p>${data.message}</p>`);
        imageContainer.html('');
        nextButton.hide();
        previousButton.hide();
    }
}

function resetView() {
    resultInfo.html('');
    imageContainer.html('<img src="/images/sample.jpg" alt="Original Image" />');
    nextButton.hide();
    loadingIndicator.hide();
}
