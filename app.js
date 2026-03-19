// SPA with hash routing — merges former script.js (list view) + page_script.js (table view)

(function () {
    'use strict';

    // DOM elements
    const pageTitle = document.getElementById('page-title');
    const listView = document.getElementById('list-view');
    const tableView = document.getElementById('table-view');
    const listContainer = document.getElementById('csv-list-container');
    const tableContainer = document.getElementById('table-container');

    // State
    let configData = {};
    let originalData = { headers: [], rows: [] };
    let currentSort = { columnIndex: -1, ascending: true };

    // ── Config ──────────────────────────────────────────────

    async function fetchConfig() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ' while fetching config.json');
            }
            configData = await response.json();
        } catch (error) {
            console.error('Error loading config:', error);
            listContainer.innerHTML = '<p>Error loading config: ' + error.message + '</p>';
            return false;
        }
        return true;
    }

    // ── List View ───────────────────────────────────────────

    function renderList() {
        listContainer.innerHTML = '';
        const csvFiles = Object.keys(configData);
        if (csvFiles.length === 0) {
            listContainer.innerHTML = '<p>No CSV files found.</p>';
            return;
        }
        const ul = document.createElement('ul');
        csvFiles.sort().forEach(function (file) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            const title = configData[file] || file.replace('.csv', '');
            a.href = '#' + file.replace('.csv', '');
            a.textContent = title;
            li.appendChild(a);
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    }

    function showListView() {
        pageTitle.textContent = 'Tables';
        document.title = 'Tables';
        listView.style.display = '';
        tableView.style.display = 'none';
    }

    // ── Table View ──────────────────────────────────────────

    function showTableView(hash) {
        var csvName = hash + '.csv';
        var title = configData[csvName] || hash;
        pageTitle.textContent = 'Table: ' + title;
        document.title = 'Table: ' + title;
        listView.style.display = 'none';
        tableView.style.display = '';
        loadCSV(hash);
    }

    // ── CSV Helpers ─────────────────────────────────────────

    function isURL(str) {
        try {
            new URL(str);
            return true;
        } catch (_) {
            return false;
        }
    }

    function parseCsvRow(rowString) {
        var cells = [];
        var inQuotes = false;
        var currentCell = '';
        for (var i = 0; i < rowString.length; i++) {
            var char = rowString[i];
            if (char === '"') {
                if (inQuotes && i + 1 < rowString.length && rowString[i + 1] === '"') {
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                cells.push(currentCell.trim());
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        cells.push(currentCell.trim());
        return cells;
    }

    // ── Table Rendering ─────────────────────────────────────

    function renderTable(dataToRender) {
        tableContainer.innerHTML = '';
        var table = document.createElement('table');
        var thead = document.createElement('thead');
        var tbody = document.createElement('tbody');
        table.appendChild(thead);
        table.appendChild(tbody);

        if (dataToRender.headers.length > 0) {
            var headerRow = document.createElement('tr');

            var thNo = document.createElement('th');
            thNo.textContent = 'No.';
            headerRow.appendChild(thNo);

            dataToRender.headers.forEach(function (headerText, index) {
                var th = document.createElement('th');
                th.textContent = headerText;
                th.style.cursor = 'pointer';
                if (index === currentSort.columnIndex) {
                    th.textContent += currentSort.ascending ? ' \u25B2' : ' \u25BC';
                }
                th.addEventListener('click', function () { handleHeaderClick(index); });
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
        }

        dataToRender.rows.forEach(function (rowData, rowIndex) {
            var row = document.createElement('tr');

            var tdNo = document.createElement('td');
            tdNo.textContent = rowIndex + 1;
            row.appendChild(tdNo);

            rowData.forEach(function (cellText) {
                var td = document.createElement('td');
                if (isURL(cellText)) {
                    var anchor = document.createElement('a');
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

    // ── Sorting ─────────────────────────────────────────────

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
        var columnIndex = currentSort.columnIndex;
        var ascending = currentSort.ascending;
        if (columnIndex === -1) {
            renderTable(originalData);
            return;
        }

        var sortedRows = originalData.rows.slice();
        sortedRows.sort(function (a, b) {
            var valA = a[columnIndex];
            var valB = b[columnIndex];
            var numA = parseFloat(valA);
            var numB = parseFloat(valB);
            var comparison = 0;
            if (!isNaN(numA) && !isNaN(numB) && String(numA) === valA && String(numB) === valB) {
                comparison = numA - numB;
            } else {
                comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
            }
            return ascending ? comparison : -comparison;
        });

        renderTable({ headers: originalData.headers, rows: sortedRows });
    }

    // ── CSV Loading ─────────────────────────────────────────

    async function loadCSV(hash) {
        var fileName = 'data/' + hash + '.csv';
        tableContainer.innerHTML = '<p>Loading...</p>';
        try {
            var response = await fetch(fileName);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ' for ' + fileName);
            }
            var csvText = await response.text();
            var allRows = csvText.trim().split('\n');
            if (allRows.length > 0) {
                originalData.headers = parseCsvRow(allRows[0]);
                originalData.rows = allRows.slice(1)
                    .map(function (r) { return parseCsvRow(r); })
                    .filter(function (row) { return row.length > 1 || (row.length === 1 && row[0] !== ''); });
            } else {
                originalData.headers = [];
                originalData.rows = [];
            }
            currentSort = { columnIndex: -1, ascending: true };
            renderTable(originalData);
        } catch (error) {
            console.error('Error loading CSV:', error);
            tableContainer.innerHTML = '<p>Error loading ' + fileName + ': ' + error.message + '</p>';
        }
    }

    // ── Router ──────────────────────────────────────────────

    function route() {
        var hash = location.hash.replace('#', '');
        if (!hash) {
            showListView();
        } else {
            showTableView(hash);
        }
    }

    // ── Init ────────────────────────────────────────────────

    async function init() {
        var loaded = await fetchConfig();
        if (loaded) {
            renderList();
        }
        window.addEventListener('hashchange', route);
        route();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
