document.addEventListener('DOMContentLoaded', async () => {
    const tableContainer = document.getElementById('table-container');
    const csvFileNameFromAttribute = document.body.dataset.csvfile;

    let originalData = { headers: [], rows: [] }; // To store original parsed data
    let currentSort = { columnIndex: -1, ascending: true };

    // Helper function to check if a string is a URL
    function isURL(str) {
        try {
            new URL(str);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Helper function to parse a CSV row, handling quoted commas
    function parseCsvRow(rowString) {
        const cells = [];
        let inQuotes = false;
        let currentCell = '';
        for (let i = 0; i < rowString.length; i++) {
            const char = rowString[i];
            if (char === '"') {
                if (inQuotes && i + 1 < rowString.length && rowString[i+1] === '"') {
                    currentCell += '"';
                    i++; // Skip the next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                cells.push(currentCell.trim()); // Trim individual cells
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        cells.push(currentCell.trim()); // Add and trim the last cell
        return cells;
    }

    function renderTable(dataToRender) {
        tableContainer.innerHTML = ''; // Clear previous table
        const table = document.createElement('table');
        const tbody = document.createElement('tbody');
        const thead = document.createElement('thead');
        table.appendChild(thead);
        table.appendChild(tbody);

        if (dataToRender.headers.length > 0) {
            const headerRow = document.createElement('tr');

            // Add "No." header
            const thNo = document.createElement('th');
            thNo.textContent = 'No.';
            // thNo.style.cursor = 'default'; // Optional: indicate it's not sortable
            headerRow.appendChild(thNo);

            dataToRender.headers.forEach((headerText, index) => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.cursor = 'pointer';
                if (index === currentSort.columnIndex) {
                    th.textContent += currentSort.ascending ? ' ▲' : ' ▼';
                }
                th.addEventListener('click', () => handleHeaderClick(index));
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
        }

        dataToRender.rows.forEach((rowData, rowIndex) => {
            const row = document.createElement('tr');

            // Add "No." cell
            const tdNo = document.createElement('td');
            tdNo.textContent = rowIndex + 1; // Display 1-based row number
            row.appendChild(tdNo);

            rowData.forEach(cellText => {
                const td = document.createElement('td');
                // const trimmedText = cellText.trim(); // Already trimmed in parseCsvRow
                if (isURL(cellText)) {
                    const anchor = document.createElement('a');
                    anchor.href = cellText;
                    anchor.textContent = cellText;
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                    td.appendChild(anchor);
                } else {
                    td.textContent = cellText;
                }
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
        tableContainer.appendChild(table);
    }

    function handleHeaderClick(columnIndex) {
        if (currentSort.columnIndex === columnIndex) {
            currentSort.ascending = !currentSort.ascending;
        } else {
            currentSort.columnIndex = columnIndex;
            currentSort.ascending = true;
        }
        sortDataAndRedraw();
    }

    function sortDataAndRedraw() {
        const { columnIndex, ascending } = currentSort;
        if (columnIndex === -1) {
            renderTable(originalData); // Render original if no sort selected
            return;
        }

        // Create a copy of rows to sort, keeping originalData intact for future sorts
        let sortedRows = [...originalData.rows];

        sortedRows.sort((a, b) => {
            const valA = a[columnIndex];
            const valB = b[columnIndex];

            // Attempt to convert to numbers for comparison
            const numA = parseFloat(valA);
            const numB = parseFloat(valB);

            let comparison = 0;
            if (!isNaN(numA) && !isNaN(numB)) {
                comparison = numA - numB;
            } else {
                // Fallback to string comparison (case-insensitive)
                comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
            }
            return ascending ? comparison : -comparison;
        });

        renderTable({ headers: originalData.headers, rows: sortedRows });
    }


    async function loadCSV(fileName) {
        if (!fileName || fileName === '.csv') {
            tableContainer.innerHTML = '<p>Invalid CSV file name provided.</p>';
            console.error("Invalid CSV file name:", fileName);
            return;
        }
        try {
            const response = await fetch(fileName);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${fileName}`);
            }
            const csvTextData = await response.text();
            
            // Parse CSV text into structured data
            const allRows = csvTextData.trim().split('\n');
            if (allRows.length > 0) {
                originalData.headers = parseCsvRow(allRows[0]);
                // Filter out potential empty rows from parsing, e.g. if CSV ends with multiple newlines
                originalData.rows = allRows.slice(1).map(rowString => parseCsvRow(rowString)).filter(row => row.length > 1 || (row.length === 1 && row[0] !== ''));
            } else {
                originalData.headers = [];
                originalData.rows = [];
            }
            currentSort = { columnIndex: -1, ascending: true }; // Reset sort state
            renderTable(originalData); // Initial render with original data

        } catch (error) {
            console.error('Error loading CSV file:', error);
            tableContainer.innerHTML = `<p>Error loading ${fileName}: ${error.message}</p>`;
        }
    }

    if (csvFileNameFromAttribute) {
        loadCSV(csvFileNameFromAttribute);
    } else {
        console.error("CSV Filename could not be determined for this page from data-csvfile attribute.");
        tableContainer.innerHTML = '<p>Could not determine which CSV file to display. Ensure body tag has data-csvfile attribute.</p>';
    }
});
