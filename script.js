document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('csv-list-container');
    let titlesData = {};

    async function fetchTitles() {
        try {
            const response = await fetch('title.json'); // Changed from csv_files.json
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching title.json`);
            }
            titlesData = await response.json();
        } catch (error) {
            console.error('Error loading title data:', error);
            if (listContainer) listContainer.innerHTML = `<p>Error loading title data: ${error.message}.<br>Please ensure 'title.json' exists and is correctly formatted.</p>`;
            return false;
        }
        return true;
    }

    function populateCsvList() {
        if (!listContainer) return;
        listContainer.innerHTML = ''; // Clear loading message
        const csvFiles = Object.keys(titlesData);
        if (csvFiles.length === 0) {
            listContainer.innerHTML = '<p>No CSV files found. Please ensure it exists and is correctly populated.</p>';
            return;
        }
        const ul = document.createElement('ul');
        csvFiles.sort().forEach(file => { // Sort filenames alphabetically
            const li = document.createElement('li');
            const a = document.createElement('a');
            const htmlFileName = file.replace('.csv', '.html');
            const title = titlesData[file] || file.replace('.csv', ''); // Use title from json, or fallback to basename
            a.href = htmlFileName;
            a.textContent = title; // Display the title as the link text
            li.appendChild(a);
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    }

    const titlesLoaded = await fetchTitles();
    if (titlesLoaded) {
        populateCsvList();
    }
});
