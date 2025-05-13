document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('csv-list-container');
    let csvFiles = [];

    async function fetchCsvFileList() {
        try {
            const response = await fetch('csv_files.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching csv_files.json`);
            }
            csvFiles = await response.json();
        } catch (error) {
            console.error('Error loading CSV file list:', error);
            if (listContainer) listContainer.innerHTML = `<p>Error loading CSV file list: ${error.message}.<br>Please ensure 'csv_files.json' exists and is correctly formatted. You might need to run 'make generate_csv_list'.</p>`;
            return false;
        }
        return true;
    }

    function populateCsvList() {
        if (!listContainer) return;
        listContainer.innerHTML = ''; // Clear loading message
        if (csvFiles.length === 0) {
            listContainer.innerHTML = '<p>No CSV files found. Run `make generate_csv_list`.</p>';
            return;
        }
        const ul = document.createElement('ul');
        csvFiles.forEach(file => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            const htmlFileName = file.replace('.csv', '.html');
            a.href = htmlFileName;
            a.textContent = file;
            li.appendChild(a);
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    }

    const listLoaded = await fetchCsvFileList();
    if (listLoaded) {
        populateCsvList();
    }
});
