// ============================================
// TIMESHEET EXPLORER - Main Application Script
// ============================================

// ============================================
// GLOBAL STATE & CONFIGURATION
// ============================================

let state = {
    // Core data structures
    projects: [],
    teams: [],
    roles: [],
    people: {}, // {personName: {team, project, role}}
    servisMapping: {}, // {servisNumber: "Description"} e.g., {"5215": "General Efforts"}
    timesheetData: [], // Array of CSV row objects
    filteredData: [], // Filtered timesheet data
    selectedRows: new Set(), // Selected row indices for batch update
    
    // Import validation data
    importValidation: {
        skippedRows: [], // Rows that couldn't be parsed
        headers: [],
        totalLines: 0,
        validRows: 0,
        invalidRows: 0
    },
    
    // UI State
    currentTab: 'mapping',
    currentReportType: 'person',
    currentChartType: 'donut',
    
    // Report data (for reordering)
    reportData: [], // Array of {label, value} for current report
    timeSeriesData: [], // Array for time series chart
    
    // Category colors (for consistent coloring across chart types)
    categoryColors: {},
    
    // Pagination state
    pagination: {
        projects: { currentPage: 1, itemsPerPage: 10 },
        teams: { currentPage: 1, itemsPerPage: 10 },
        roles: { currentPage: 1, itemsPerPage: 10 },
        people: { currentPage: 1, itemsPerPage: 20 },
        filteredData: { currentPage: 1, itemsPerPage: 20 }
    },
    
    // Search state
    search: {
        projects: '',
        teams: '',
        roles: '',
        people: ''
    },
    
    // Chart state
    chart: null,
    chartFontSize: 16,
    chartFontFamily: 'Helvetica',
    chartRotation: -55
};

// Chart color themes
const chartThemes = {
    'Default': ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'],
    'Pastel': ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFD8BA', '#E0BBE4', '#C7CEEA', '#FFDFD3', '#B4F8C8', '#FBE7C6'],
    'Professional': ['#2C3E50', '#3498DB', '#E74C3C', '#F39C12', '#1ABC9C', '#9B59B6', '#34495E', '#16A085', '#27AE60', '#E67E22'],
    'Vibrant': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8E6CF'],
    'Earth': ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#BC8F8F', '#C19A6B', '#A0826D', '#967969', '#8B7355'],
    'Ocean': ['#006994', '#1E88E5', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#0097A7', '#00ACC1', '#26C6DA', '#4DD0E1'],
    'Sunset': ['#FF6F61', '#FF8C94', '#FFA07A', '#FFB347', '#FFC371', '#FFD93D', '#FCE77D', '#F9E79F', '#FAD7A0', '#F5B7B1'],
    'Forest': ['#2D5016', '#3B6E23', '#4A8C31', '#5FAD41', '#76C954', '#8DD66A', '#A4E382', '#BBF09D', '#D2FDB9', '#E9FFD4'],
    'Monochrome': ['#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#F0F0F0']
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Timesheet Explorer...');
    
    // Load data from localStorage or JSON file
    loadInitialData();
    
    // Setup all event listeners
    setupEventListeners();
    
    // Initialize UI
    initializeUI();
    
    console.log('Timesheet Explorer initialized successfully');
});

// ============================================
// DATA LOADING & PERSISTENCE - IndexedDB
// ============================================

// IndexedDB wrapper for large data storage
const DB_NAME = 'TimesheetExplorerDB';
const DB_VERSION = 1;
const STORE_NAME = 'timesheetData';

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function saveToIndexedDB() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const dataToSave = {
            projects: state.projects,
            teams: state.teams,
            roles: state.roles,
            people: state.people,
            servisMapping: state.servisMapping,
            timesheetData: state.timesheetData
        };
        
        store.put(dataToSave, 'mainData');
        
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                console.log('Data saved to IndexedDB');
                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.error('Error saving to IndexedDB:', error);
        throw error;
    }
}

async function loadFromIndexedDB() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('mainData');
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error loading from IndexedDB:', error);
        return null;
    }
}

async function loadInitialData() {
    // Try to load from IndexedDB first
    try {
        const savedData = await loadFromIndexedDB();
        if (savedData) {
            state.projects = savedData.projects || [];
            state.teams = savedData.teams || [];
            state.roles = savedData.roles || [];
            state.people = savedData.people || {};
            state.servisMapping = savedData.servisMapping || {};
            state.timesheetData = savedData.timesheetData || [];
            console.log(`Data loaded from IndexedDB: ${state.timesheetData.length} timesheet records`);
            return;
        }
    } catch (e) {
        console.error('Error loading from IndexedDB:', e);
    }
    
    // Try to migrate from old localStorage
    try {
        const oldData = localStorage.getItem('timesheetExplorerData');
        if (oldData) {
            const parsed = JSON.parse(oldData);
            state.projects = parsed.projects || [];
            state.teams = parsed.teams || [];
            state.roles = parsed.roles || [];
            state.people = parsed.people || {};
            state.servisMapping = parsed.servisMapping || {};
            state.timesheetData = parsed.timesheetData || [];
            console.log('Migrating data from localStorage to IndexedDB');
            await saveToIndexedDB();
            // Clear old localStorage to free space
            localStorage.removeItem('timesheetExplorerData');
            return;
        }
    } catch (e) {
        console.error('Error migrating from localStorage:', e);
    }
    
    // If no saved data, try to load from JSON file
    try {
        const response = await fetch('data/project-team-role-people-data.json');
        if (response.ok) {
            const data = await response.json();
            state.projects = data.projects || [];
            state.teams = data.teams || [];
            state.roles = data.roles || [];
            state.people = data.people || {};
            await saveToIndexedDB();
            console.log('Data loaded from JSON file');
        }
    } catch (e) {
        console.log('No initial data file found, starting fresh');
    }
}

// Keep for backward compatibility, but redirect to IndexedDB
async function saveToLocalStorage() {
    await saveToIndexedDB();
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Import/Export buttons (Teams & People tab)
    document.getElementById('import-all-btn').addEventListener('click', importAllData);
    document.getElementById('export-all-btn').addEventListener('click', exportAllData);
    
    // Add buttons
    document.getElementById('add-project-btn').addEventListener('click', () => openModal('project'));
    document.getElementById('add-team-btn').addEventListener('click', () => openModal('team'));
    document.getElementById('add-role-btn').addEventListener('click', () => openModal('role'));
    document.getElementById('add-person-btn').addEventListener('click', () => openModal('person'));
    document.getElementById('import-csv-people-btn').addEventListener('click', importPeopleFromCSV);
    
    // Search inputs
    document.getElementById('project-search').addEventListener('input', (e) => {
        state.search.projects = e.target.value;
        renderProjects();
    });
    document.getElementById('team-search').addEventListener('input', (e) => {
        state.search.teams = e.target.value;
        renderTeams();
    });
    document.getElementById('role-search').addEventListener('input', (e) => {
        state.search.roles = e.target.value;
        renderRoles();
    });
    document.getElementById('person-search').addEventListener('input', (e) => {
        state.search.people = e.target.value;
        renderPeople();
    });
    
    // People filters
    document.getElementById('person-team-filter').addEventListener('change', renderPeople);
    document.getElementById('person-project-filter').addEventListener('change', renderPeople);
    
    // Timesheet Data tab
    document.getElementById('import-csv-data-btn').addEventListener('click', importTimesheetCSV);
    document.getElementById('export-csv-btn').addEventListener('click', exportFilteredDataCSV);
    document.getElementById('clear-all-data-btn').addEventListener('click', clearAllTimesheetData);
    document.getElementById('manage-servis-btn').addEventListener('click', openServisModal);
    document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
    document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);
    document.getElementById('apply-person-mapping-btn').addEventListener('click', applyPersonMapping);
    document.getElementById('clear-report-filters-btn').addEventListener('click', clearReportFilters);
    
    // Batch update controls
    document.getElementById('select-all-rows').addEventListener('change', toggleSelectAll);
    document.getElementById('select-all-filtered').addEventListener('change', toggleSelectAllFiltered);
    document.getElementById('batch-field-select').addEventListener('change', onBatchFieldChange);
    document.getElementById('batch-value-select').addEventListener('change', updateSelectedCount);
    document.getElementById('batch-update-btn').addEventListener('click', applyBatchUpdate);
    
    // Toggle advanced filters
    document.getElementById('toggle-advanced-filters').addEventListener('click', toggleAdvancedFilters);
    document.getElementById('toggle-report-advanced-filters').addEventListener('click', toggleReportAdvancedFilters);
    
    // Track filter changes for badges
    const dataFilterIds = ['project-filter', 'team-filter', 'role-filter', 'activity-filter', 'servis-filter', 'person-filter', 'issue-status-filter', 'project-key-filter'];
    dataFilterIds.forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateFilterBadges);
    });
    document.getElementById('issue-summary-filter')?.addEventListener('input', updateFilterBadges);
    document.getElementById('work-date-start')?.addEventListener('change', updateFilterBadges);
    document.getElementById('work-date-end')?.addEventListener('change', updateFilterBadges);
    
    const reportFilterIds = ['report-project-filter', 'report-team-filter', 'report-role-filter', 'report-activity-filter', 'report-servis-filter', 'report-person-filter', 'report-issue-status-filter', 'report-project-key-filter'];
    reportFilterIds.forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateReportFilterBadges);
    });
    document.getElementById('report-issue-summary-filter')?.addEventListener('input', updateReportFilterBadges);
    document.getElementById('report-work-date-start')?.addEventListener('change', updateReportFilterBadges);
    document.getElementById('report-work-date-end')?.addEventListener('change', updateReportFilterBadges);
    
    // Reports tab
    document.getElementById('report-type-select').addEventListener('change', (e) => {
        state.currentReportType = e.target.value;
        // Re-generate report if data exists
        if (state.timesheetData.length > 0 && state.reportData.length > 0) {
            generateReport();
        }
    });
    document.getElementById('chart-type-select').addEventListener('change', (e) => {
        state.currentChartType = e.target.value;
        // Re-render chart if data exists
        if (state.reportData.length > 0) {
            renderChart();
        }
    });
    document.getElementById('time-granularity-select')?.addEventListener('change', () => {
        if (state.reportData.length > 0) {
            generateReport();
        }
    });
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);
    
    // Auto-update chart when theme or font changes
    document.getElementById('theme-select').addEventListener('change', () => {
        if (state.reportData.length > 0) {
            renderChart();
        }
    });
    document.getElementById('font-family-select').addEventListener('change', (e) => {
        state.chartFontFamily = e.target.value;
        if (state.reportData.length > 0) {
            renderChart();
        }
    });
    
    document.getElementById('font-increase').addEventListener('click', () => adjustFontSize(1));
    document.getElementById('font-decrease').addEventListener('click', () => adjustFontSize(-1));
    
    // Rotation control
    document.getElementById('rotation-slider').addEventListener('input', (e) => {
        state.chartRotation = parseInt(e.target.value);
        document.getElementById('rotation-value').textContent = state.chartRotation;
        if (state.reportData.length > 0) {
            renderChart();
        }
    });
    
    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-save').addEventListener('click', saveModal);
    
    // Close modal on background click
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });
    
    // Event delegation for table action buttons
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        
        const action = btn.dataset.action;
        const type = btn.dataset.type;
        const value = btn.dataset.value;
        
        if (action === 'edit') {
            openModal(type, 'edit', value);
        } else if (action === 'delete') {
            if (type === 'project') deleteProject(value);
            else if (type === 'team') deleteTeam(value);
            else if (type === 'role') deleteRole(value);
            else if (type === 'person') deletePerson(value);
        }
    });
}

// ============================================
// TAB NAVIGATION
// ============================================

function switchTab(tabName) {
    state.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    // Perform tab-specific actions
    if (tabName === 'mapping') {
        renderMappingTab();
    } else if (tabName === 'data') {
        populateDataFilters();
        applyFilters();
    } else if (tabName === 'reports') {
        syncReportFilters();
    }
}

// ============================================
// TEAMS & PEOPLE TAB (tab-mapping)
// ============================================

function initializeUI() {
    renderMappingTab();
    populateThemeSelector();
    
    // Populate filters if data exists
    if (state.timesheetData.length > 0) {
        populateDataFilters();
    }
}

function renderMappingTab() {
    renderProjects();
    renderTeams();
    renderRoles();
    renderPeople();
    updatePeopleFilters();
}

// ---------- PROJECTS ----------

function renderProjects() {
    const tbody = document.getElementById('project-tbody');
    const search = state.search.projects.toLowerCase();
    
    // Filter projects
    const filtered = state.projects.filter(p => 
        p.toLowerCase().includes(search)
    );
    
    // Pagination
    const { currentPage, itemsPerPage } = state.pagination.projects;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filtered.slice(start, end);
    
    // Render table with fixed number of rows
    const rows = [];
    for (let i = 0; i < itemsPerPage; i++) {
        if (i < paginated.length) {
            const project = paginated[i];
            const peopleCount = Object.values(state.people).filter(p => p.project === project).length;
            const globalIdx = start + i + 1;
            rows.push(`
                <tr>
                    <td class="row-number-col">${globalIdx}</td>
                    <td>${escapeHtml(project)}</td>
                    <td>${peopleCount}</td>
                    <td class="actions-cell">
                        <button class="btn-icon" data-action="edit" data-type="project" data-value="${escapeHtml(project)}" title="Edit">✏️</button>
                        <button class="btn-icon" data-action="delete" data-type="project" data-value="${escapeHtml(project)}" title="Delete">🗑️</button>
                    </td>
                </tr>
            `);
        } else {
            rows.push('<tr><td class="row-number-col"></td><td></td><td></td><td></td></tr>');
        }
    }
    tbody.innerHTML = rows.join('');
    
    // Render pagination
    renderPagination('project', filtered.length);
}

function editProject(projectName) {
    openModal('project', 'edit', projectName);
}

async function deleteProject(projectName) {
    if (!confirm(`Delete project "${projectName}"?`)) return;
    
    state.projects = state.projects.filter(p => p !== projectName);
    
    // Remove project from people
    Object.keys(state.people).forEach(person => {
        if (state.people[person].project === projectName) {
            state.people[person].project = null;
        }
    });
    
    await saveToLocalStorage();
    renderProjects();
    renderPeople();
}

// ---------- TEAMS ----------

function renderTeams() {
    const tbody = document.getElementById('team-tbody');
    const search = state.search.teams.toLowerCase();
    
    const filtered = state.teams.filter(t => 
        t.toLowerCase().includes(search)
    );
    
    const { currentPage, itemsPerPage } = state.pagination.teams;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filtered.slice(start, end);
    
    // Render table with fixed number of rows
    const rows = [];
    for (let i = 0; i < itemsPerPage; i++) {
        if (i < paginated.length) {
            const team = paginated[i];
            const peopleCount = Object.values(state.people).filter(p => p.team === team).length;
            const globalIdx = start + i + 1;
            rows.push(`
                <tr>
                    <td class="row-number-col">${globalIdx}</td>
                    <td>${escapeHtml(team)}</td>
                    <td>${peopleCount}</td>
                    <td class="actions-cell">
                        <button class="btn-icon" data-action="edit" data-type="team" data-value="${escapeHtml(team)}" title="Edit">✏️</button>
                        <button class="btn-icon" data-action="delete" data-type="team" data-value="${escapeHtml(team)}" title="Delete">🗑️</button>
                    </td>
                </tr>
            `);
        } else {
            rows.push('<tr><td class="row-number-col"></td><td></td><td></td><td></td></tr>');
        }
    }
    tbody.innerHTML = rows.join('');
    
    renderPagination('team', filtered.length);
}

function editTeam(teamName) {
    openModal('team', 'edit', teamName);
}

async function deleteTeam(teamName) {
    if (!confirm(`Delete team "${teamName}"?`)) return;
    
    state.teams = state.teams.filter(t => t !== teamName);
    
    Object.keys(state.people).forEach(person => {
        if (state.people[person].team === teamName) {
            state.people[person].team = null;
        }
    });
    
    await saveToLocalStorage();
    renderTeams();
    renderPeople();
}

// ---------- ROLES ----------

function renderRoles() {
    const tbody = document.getElementById('role-tbody');
    const search = state.search.roles.toLowerCase();
    
    const filtered = state.roles.filter(r => 
        r.toLowerCase().includes(search)
    );
    
    const { currentPage, itemsPerPage } = state.pagination.roles;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filtered.slice(start, end);
    
    // Render table with fixed number of rows
    const rows = [];
    for (let i = 0; i < itemsPerPage; i++) {
        if (i < paginated.length) {
            const role = paginated[i];
            const peopleCount = Object.values(state.people).filter(p => p.role === role).length;
            const globalIdx = start + i + 1;
            rows.push(`
                <tr>
                    <td class="row-number-col">${globalIdx}</td>
                    <td>${escapeHtml(role)}</td>
                    <td>${peopleCount}</td>
                    <td class="actions-cell">
                        <button class="btn-icon" data-action="edit" data-type="role" data-value="${escapeHtml(role)}" title="Edit">✏️</button>
                        <button class="btn-icon" data-action="delete" data-type="role" data-value="${escapeHtml(role)}" title="Delete">🗑️</button>
                    </td>
                </tr>
            `);
        } else {
            rows.push('<tr><td class="row-number-col"></td><td></td><td></td><td></td></tr>');
        }
    }
    tbody.innerHTML = rows.join('');
    
    renderPagination('role', filtered.length);
}

function editRole(roleName) {
    openModal('role', 'edit', roleName);
}

async function deleteRole(roleName) {
    if (!confirm(`Delete role "${roleName}"?`)) return;
    
    state.roles = state.roles.filter(r => r !== roleName);
    
    Object.keys(state.people).forEach(person => {
        if (state.people[person].role === roleName) {
            state.people[person].role = null;
        }
    });
    
    await saveToLocalStorage();
    renderRoles();
    renderPeople();
}

// ---------- PEOPLE ----------

function renderPeople() {
    const tbody = document.getElementById('person-tbody');
    const search = state.search.people.toLowerCase();
    const teamFilter = document.getElementById('person-team-filter').value;
    const projectFilter = document.getElementById('person-project-filter').value;
    
    // Filter people
    let filtered = Object.keys(state.people).filter(person => {
        const data = state.people[person];
        const matchesSearch = person.toLowerCase().includes(search);
        const matchesTeam = !teamFilter || data.team === teamFilter;
        const matchesProject = !projectFilter || data.project === projectFilter;
        return matchesSearch && matchesTeam && matchesProject;
    });
    
    filtered.sort();
    
    // Pagination
    const { currentPage, itemsPerPage } = state.pagination.people;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filtered.slice(start, end);
    
    if (paginated.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No people</td></tr>';
    } else {
        tbody.innerHTML = paginated.map((person, idx) => {
            const data = state.people[person];
            const totalHours = calculatePersonHours(person);
            const globalIdx = start + idx + 1;
            return `
                <tr>
                    <td class="row-number-col">${globalIdx}</td>
                    <td>${escapeHtml(person)}</td>
                    <td>${data.team ? escapeHtml(data.team) : '-'}</td>
                    <td>${data.project ? escapeHtml(data.project) : '-'}</td>
                    <td>${data.role ? escapeHtml(data.role) : '-'}</td>
                    <td>${totalHours.toFixed(1)}</td>
                    <td class="actions-cell">
                        <button class="btn-icon" data-action="edit" data-type="person" data-value="${escapeHtml(person)}" title="Edit">✏️</button>
                        <button class="btn-icon" data-action="delete" data-type="person" data-value="${escapeHtml(person)}" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    renderPagination('person', filtered.length);
}

function calculatePersonHours(personName) {
    return state.timesheetData
        .filter(row => row['Full name'] && row['Full name'].includes(personName))
        .reduce((sum, row) => sum + (parseFloat(row.Hours) || 0), 0);
}

function editPerson(personName) {
    openModal('person', 'edit', personName);
}

async function deletePerson(personName) {
    if (!confirm(`Delete person "${personName}"?`)) return;
    
    delete state.people[personName];
    await saveToLocalStorage();
    renderPeople();
}

function updatePeopleFilters() {
    // Update team filter
    const teamFilter = document.getElementById('person-team-filter');
    const currentTeam = teamFilter.value;
    teamFilter.innerHTML = '<option value="">All Teams</option>' +
        state.teams.map(team => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`).join('');
    teamFilter.value = currentTeam;
    
    // Update project filter
    const projectFilter = document.getElementById('person-project-filter');
    const currentProject = projectFilter.value;
    projectFilter.innerHTML = '<option value="">All Projects</option>' +
        state.projects.map(project => `<option value="${escapeHtml(project)}">${escapeHtml(project)}</option>`).join('');
    projectFilter.value = currentProject;
}

// ---------- PAGINATION ----------

function renderPagination(entity, totalItems) {
    const paginationDiv = document.getElementById(`${entity === 'filteredData' ? 'data' : entity}-pagination`);
    if (!paginationDiv) return;
    
    const paginationKey = entity === 'person' ? 'people' : entity === 'filteredData' ? 'filteredData' : `${entity}s`;
    const { currentPage, itemsPerPage } = state.pagination[paginationKey];
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Always show total count
    let html = `<div class="pagination-info">Total: ${totalItems}</div>`;
    
    // Always show controls for projects, teams, roles tables
    const alwaysShowControls = ['project', 'team', 'role'].includes(entity);
    
    if (totalPages <= 1 && !alwaysShowControls) {
        paginationDiv.innerHTML = html;
        return;
    }
    
    html += '<div class="pagination-controls">';
    
    // Previous button
    html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} 
             onclick="changePage('${entity}', ${currentPage - 1})">‹</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                     onclick="changePage('${entity}', ${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    // Next button
    html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} 
             onclick="changePage('${entity}', ${currentPage + 1})">›</button>`;
    
    html += '</div>';
    paginationDiv.innerHTML = html;
}

function changePage(entity, page) {
    const key = entity === 'person' ? 'people' : entity === 'filteredData' ? 'filteredData' : `${entity}s`;
    state.pagination[key].currentPage = page;
    
    if (entity === 'project') renderProjects();
    else if (entity === 'team') renderTeams();
    else if (entity === 'role') renderRoles();
    else if (entity === 'person') renderPeople();
    else if (entity === 'filteredData') renderFilteredData();
}

// ============================================
// MODAL OPERATIONS
// ============================================

function openModal(type, mode = 'add', existingValue = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modal.dataset.type = type;
    modal.dataset.mode = mode;
    modal.dataset.existing = existingValue || '';
    
    // Set title
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    modalTitle.textContent = mode === 'add' ? `Add ${typeLabel}` : `Edit ${typeLabel}`;
    
    // Set body content
    if (type === 'person') {
        const personData = existingValue ? state.people[existingValue] : {};
        modalBody.innerHTML = `
            <div class="form-group">
                <label for="modal-person-name">Name *</label>
                <input type="text" id="modal-person-name" class="input" 
                       value="${existingValue ? escapeHtml(existingValue) : ''}" 
                       ${mode === 'edit' ? 'readonly' : ''} required>
            </div>
            <div class="form-group">
                <label for="modal-person-team">Team</label>
                <select id="modal-person-team" class="select">
                    <option value="">None</option>
                    ${state.teams.map(t => `<option value="${escapeHtml(t)}" 
                        ${personData.team === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="modal-person-project">Project</label>
                <select id="modal-person-project" class="select">
                    <option value="">None</option>
                    ${state.projects.map(p => `<option value="${escapeHtml(p)}" 
                        ${personData.project === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="modal-person-role">Role</label>
                <select id="modal-person-role" class="select">
                    <option value="">None</option>
                    ${state.roles.map(r => `<option value="${escapeHtml(r)}" 
                        ${personData.role === r ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('')}
                </select>
            </div>
        `;
    } else {
        modalBody.innerHTML = `
            <div class="form-group">
                <label for="modal-input">Name *</label>
                <input type="text" id="modal-input" class="input" 
                       value="${existingValue ? escapeHtml(existingValue) : ''}" required>
            </div>
        `;
    }
    
    modal.classList.add('active');
    
    // Focus first input
    setTimeout(() => {
        const firstInput = modalBody.querySelector('input, select');
        if (firstInput && !firstInput.hasAttribute('readonly')) firstInput.focus();
    }, 100);
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
    
    // Clear dataset to prevent conflicts
    delete modal.dataset.rowIndex;
    delete modal.dataset.type;
    delete modal.dataset.mode;
    delete modal.dataset.existing;
    
    // Reset save button visibility
    const saveBtn = document.getElementById('modal-save');
    const cancelBtn = document.getElementById('modal-cancel');
    saveBtn.style.display = '';
    cancelBtn.textContent = 'Cancel';
    saveBtn.onclick = null; // Clear any custom onclick handlers
}

async function saveModal() {
    const modal = document.getElementById('modal');
    const type = modal.dataset.type;
    const mode = modal.dataset.mode;
    const existing = modal.dataset.existing;
    
    // If we're in row editing mode (rowIndex is set), don't execute this function
    // The row editing has its own save handler (saveRowEdit)
    if (modal.dataset.rowIndex !== undefined) {
        return;
    }
    
    try {
        if (type === 'person') {
            const name = document.getElementById('modal-person-name').value.trim();
            const team = document.getElementById('modal-person-team').value || null;
            const project = document.getElementById('modal-person-project').value || null;
            const role = document.getElementById('modal-person-role').value || null;
            
            if (!name) {
                alert('Name is required');
                return;
            }
            
            if (mode === 'add' && state.people[name]) {
                alert('Person already exists');
                return;
            }
            
            state.people[name] = { team, project, role };
        } else {
            const value = document.getElementById('modal-input').value.trim();
            
            if (!value) {
                alert('Name is required');
                return;
            }
            
            const array = type === 'project' ? state.projects : 
                         type === 'team' ? state.teams : state.roles;
            
            if (mode === 'add') {
                if (array.includes(value)) {
                    alert(`${type} already exists`);
                    return;
                }
                array.push(value);
                array.sort();
            } else {
                // Edit mode - update the value
                const index = array.indexOf(existing);
                if (index !== -1) {
                    array[index] = value;
                    array.sort();
                    
                    // Update people references
                    Object.keys(state.people).forEach(person => {
                        if (type === 'project' && state.people[person].project === existing) {
                            state.people[person].project = value;
                        } else if (type === 'team' && state.people[person].team === existing) {
                            state.people[person].team = value;
                        } else if (type === 'role' && state.people[person].role === existing) {
                            state.people[person].role = value;
                        }
                    });
                }
            }
        }
        
        await saveToLocalStorage();
        closeModal();
        
        // Render after closing modal to avoid issues
        try {
            renderMappingTab();
        } catch (renderError) {
            console.error('Error rendering after save:', renderError);
            // Still saved, just render issue
        }
    } catch (error) {
        console.error('Error saving modal:', error);
        console.error('Error stack:', error.stack);
        alert('Error saving data: ' + error.message);
    }
}

// ============================================
// IMPORT/EXPORT OPERATIONS
// ============================================

function importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                state.projects = data.projects || [];
                state.teams = data.teams || [];
                state.roles = data.roles || [];
                state.people = data.people || {};
                
                await saveToLocalStorage();
                renderMappingTab();
                alert('Data imported successfully');
            } catch (error) {
                console.error('Error importing data:', error);
                alert('Error importing data: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportAllData() {
    const data = {
        projects: state.projects,
        teams: state.teams,
        roles: state.roles,
        people: state.people
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-team-role-people-data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importPeopleFromCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const csv = event.target.result;
                const rows = parseCSV(csv);
                
                let imported = 0;
                rows.forEach(row => {
                    const fullName = row['Full name'];
                    if (fullName) {
                        // Extract person name: take text before "-", trim spaces
                        const name = fullName.split('-')[0].trim();
                        if (name && !state.people[name]) {
                            state.people[name] = {
                                team: null,
                                project: null,
                                role: null
                            };
                            imported++;
                        }
                    }
                });
                
                await saveToLocalStorage();
                renderPeople();
                alert(`Imported ${imported} new people from CSV`);
            } catch (error) {
                console.error('Error importing CSV:', error);
                alert('Error importing CSV: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ============================================
// TIMESHEET DATA TAB (tab-data)
// ============================================

function applyPersonMapping() {
    const overrideExisting = document.getElementById('override-existing-mapping').checked;
    
    if (state.filteredData.length === 0) {
        alert('No filtered data to apply mapping to. Please apply filters first.');
        return;
    }
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    state.filteredData.forEach(row => {
        const fullName = row['Full name'];
        if (!fullName) return;
        
        // Check if row already has team/project values
        const hasExistingTeam = row._overrides?.team || row.Team;
        const hasExistingProject = row._overrides?.project || row.Project;
        
        // If not overriding and already has values, skip
        if (!overrideExisting && (hasExistingTeam || hasExistingProject)) {
            skippedCount++;
            return;
        }
        
        // Find person mapping
        let personData = null;
        for (const [personKey, data] of Object.entries(state.people)) {
            if (fullName.includes(personKey)) {
                personData = data;
                break;
            }
        }
        
        if (personData) {
            // Initialize overrides if doesn't exist
            if (!row._overrides) {
                row._overrides = {};
            }
            
            // Apply mapping
            if (personData.team) {
                row._overrides.team = personData.team;
            }
            if (personData.project) {
                row._overrides.project = personData.project;
            }
            
            updatedCount++;
            
            // Also update in original timesheetData
            const originalRow = state.timesheetData.find(r => 
                r['Full name'] === row['Full name'] && 
                r['Issue Key'] === row['Issue Key'] &&
                r['Work date'] === row['Work date']
            );
            if (originalRow) {
                if (!originalRow._overrides) {
                    originalRow._overrides = {};
                }
                if (personData.team) {
                    originalRow._overrides.team = personData.team;
                }
                if (personData.project) {
                    originalRow._overrides.project = personData.project;
                }
            }
        }
    });
    
    saveToLocalStorage();
    renderFilteredData();
    
    alert(`Person mapping applied!\n${updatedCount} record(s) updated\n${skippedCount} record(s) skipped (already had values)`);
}

function toggleSelectAll(e) {
    const checked = e.target.checked;
    const { currentPage, itemsPerPage } = state.pagination.filteredData;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    
    // Uncheck "select all filtered" when toggling current page
    const selectAllFiltered = document.getElementById('select-all-filtered');
    if (selectAllFiltered) selectAllFiltered.checked = false;
    
    if (checked) {
        // Select all visible rows
        for (let i = start; i < end && i < state.filteredData.length; i++) {
            state.selectedRows.add(i);
        }
    } else {
        // Deselect all visible rows
        for (let i = start; i < end && i < state.filteredData.length; i++) {
            state.selectedRows.delete(i);
        }
    }
    
    renderFilteredData();
}

function toggleSelectAllFiltered(e) {
    const checked = e.target.checked;
    
    if (checked) {
        // Select ALL filtered rows across all pages
        state.selectedRows.clear();
        for (let i = 0; i < state.filteredData.length; i++) {
            state.selectedRows.add(i);
        }
    } else {
        // Deselect all
        state.selectedRows.clear();
    }
    
    renderFilteredData();
    updateSelectedCount();
}

function toggleRowSelection(idx) {
    if (state.selectedRows.has(idx)) {
        state.selectedRows.delete(idx);
    } else {
        state.selectedRows.add(idx);
    }
    
    updateSelectAllCheckbox();
    updateSelectedCount();
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all-rows');
    if (!selectAllCheckbox) return;
    
    const { currentPage, itemsPerPage } = state.pagination.filteredData;
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, state.filteredData.length);
    
    let allSelected = true;
    let someSelected = false;
    
    for (let i = start; i < end; i++) {
        if (state.selectedRows.has(i)) {
            someSelected = true;
        } else {
            allSelected = false;
        }
    }
    
    selectAllCheckbox.checked = allSelected && someSelected;
    selectAllCheckbox.indeterminate = someSelected && !allSelected;
}

function updateSelectedCount() {
    const countSpan = document.getElementById('selected-count');
    const totalFilteredSpan = document.getElementById('total-filtered-count');
    const selectAllFilteredCheckbox = document.getElementById('select-all-filtered');
    
    if (countSpan) {
        countSpan.textContent = state.selectedRows.size;
    }
    
    if (totalFilteredSpan) {
        totalFilteredSpan.textContent = state.filteredData.length;
    }
    
    // Update "select all filtered" checkbox state
    if (selectAllFilteredCheckbox) {
        selectAllFilteredCheckbox.checked = (state.selectedRows.size === state.filteredData.length && state.filteredData.length > 0);
    }
    
    // Enable/disable batch update button
    const batchUpdateBtn = document.getElementById('batch-update-btn');
    const batchFieldSelect = document.getElementById('batch-field-select');
    const batchValueSelect = document.getElementById('batch-value-select');
    
    if (batchUpdateBtn && batchFieldSelect) {
        const hasSelection = state.selectedRows.size > 0;
        const hasField = batchFieldSelect.value !== '';
        const hasValue = batchValueSelect.value !== '';
        
        batchUpdateBtn.disabled = !(hasSelection && hasField && hasValue);
    }
}

function onBatchFieldChange(e) {
    const field = e.target.value;
    const valueSelect = document.getElementById('batch-value-select');
    
    if (!field) {
        valueSelect.disabled = true;
        valueSelect.innerHTML = '<option value="">Select Value</option>';
        updateSelectedCount();
        return;
    }
    
    valueSelect.disabled = false;
    
    if (field === 'team') {
        valueSelect.innerHTML = '<option value="">Select Team</option>' + 
            state.teams.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    } else if (field === 'project') {
        valueSelect.innerHTML = '<option value="">Select Project</option>' + 
            state.projects.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    }
    
    updateSelectedCount();
}

async function applyBatchUpdate() {
    if (state.selectedRows.size === 0) {
        alert('No rows selected');
        return;
    }
    
    const field = document.getElementById('batch-field-select').value;
    const value = document.getElementById('batch-value-select').value;
    
    if (!field || !value) {
        alert('Please select both field and value');
        return;
    }
    
    const selectedIndices = Array.from(state.selectedRows);
    
    selectedIndices.forEach(idx => {
        const row = state.filteredData[idx];
        if (!row) return;
        
        // Get current team and project values (from overrides or from row data or from person mapping)
        let currentTeam = null;
        let currentProject = null;
        
        if (row._overrides) {
            currentTeam = row._overrides.team;
            currentProject = row._overrides.project;
        } else {
            // Check if row has Team/Project from CSV
            currentTeam = row.Team;
            currentProject = row.Project;
            
            // If not in CSV, check person mapping
            if (!currentTeam || !currentProject) {
                const fullName = row['Full name'] || '';
                for (const [personKey, data] of Object.entries(state.people)) {
                    if (fullName && fullName.includes(personKey)) {
                        if (!currentTeam && data.team) currentTeam = data.team;
                        if (!currentProject && data.project) currentProject = data.project;
                        break;
                    }
                }
            }
        }
        
        // Initialize overrides if doesn't exist and preserve current values
        if (!row._overrides) {
            row._overrides = {};
            if (currentTeam) row._overrides.team = currentTeam;
            if (currentProject) row._overrides.project = currentProject;
        }
        
        // Apply update
        if (field === 'team') {
            row._overrides.team = value;
        } else if (field === 'project') {
            row._overrides.project = value;
        }
        
        // Also update in original timesheetData
        const originalRow = state.timesheetData.find(r => 
            r['Full name'] === row['Full name'] && 
            r['Issue Key'] === row['Issue Key'] &&
            r['Work date'] === row['Work date']
        );
        if (originalRow) {
            // Get current values for original row too
            let origCurrentTeam = null;
            let origCurrentProject = null;
            
            if (originalRow._overrides) {
                origCurrentTeam = originalRow._overrides.team;
                origCurrentProject = originalRow._overrides.project;
            } else {
                origCurrentTeam = originalRow.Team;
                origCurrentProject = originalRow.Project;
                
                if (!origCurrentTeam || !origCurrentProject) {
                    const fullName = originalRow['Full name'] || '';
                    for (const [personKey, data] of Object.entries(state.people)) {
                        if (fullName && fullName.includes(personKey)) {
                            if (!origCurrentTeam && data.team) origCurrentTeam = data.team;
                            if (!origCurrentProject && data.project) origCurrentProject = data.project;
                            break;
                        }
                    }
                }
            }
            
            if (!originalRow._overrides) {
                originalRow._overrides = {};
                if (origCurrentTeam) originalRow._overrides.team = origCurrentTeam;
                if (origCurrentProject) originalRow._overrides.project = origCurrentProject;
            }
            
            if (field === 'team') {
                originalRow._overrides.team = value;
            } else if (field === 'project') {
                originalRow._overrides.project = value;
            }
        }
    });
    
    await saveToLocalStorage();
    renderFilteredData();
    
    alert(`Batch update completed!\n${selectedIndices.length} record(s) updated`);
    
    // Clear selection
    state.selectedRows.clear();
    document.getElementById('batch-field-select').value = '';
    document.getElementById('batch-value-select').value = '';
    document.getElementById('batch-value-select').disabled = true;
    updateSelectedCount();
    renderFilteredData();
}

function importTimesheetCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Show loading indicator
        const loadingMsg = document.createElement('div');
        loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2);z-index:10000;text-align:center;';
        loadingMsg.innerHTML = '<div style="font-size:16px;font-weight:bold;margin-bottom:10px;">Importing CSV...</div><div id="import-progress">Reading file...</div>';
        document.body.appendChild(loadingMsg);
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const progressEl = document.getElementById('import-progress');
                progressEl.textContent = 'Parsing CSV data...';
                
                const csv = event.target.result;
                const parsedData = parseCSV(csv);
                
                document.body.removeChild(loadingMsg);
                
                // Show validation results if there are skipped rows
                if (state.importValidation.invalidRows > 0) {
                    showImportValidationModal(parsedData, file.name);
                } else {
                    // No issues, proceed with import
                    await finalizeImport(parsedData);
                }
            } catch (error) {
                console.error('Error importing timesheet CSV:', error);
                document.body.removeChild(loadingMsg);
                alert('Error importing timesheet CSV: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

async function finalizeImport(parsedData) {
    state.timesheetData = parsedData;
    await saveToIndexedDB();
    populateDataFilters();
    applyFilters();
    alert(`✅ Successfully imported ${state.timesheetData.length} timesheet records`);
}

function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const expectedColumns = headers.length;
    const rows = [];
    const skippedRows = [];
    
    let i = 1;
    while (i < lines.length) {
        let currentLine = lines[i];
        let lineStart = i;
        
        // Check if this line has unclosed quotes (multi-line field)
        let quoteCount = 0;
        let inQuotes = false;
        
        // Count quotes to check if they're balanced
        for (let j = 0; j < currentLine.length; j++) {
            if (currentLine[j] === '"') {
                // Check if it's an escaped quote
                if (j + 1 < currentLine.length && currentLine[j + 1] === '"') {
                    j++; // Skip the next quote as it's escaped
                } else {
                    inQuotes = !inQuotes;
                }
            }
        }
        
        // If quotes are not balanced, this line continues on next line(s)
        while (inQuotes && i + 1 < lines.length) {
            i++;
            const nextLine = lines[i];
            currentLine += '\n' + nextLine;
            
            // Re-check quote balance
            inQuotes = false;
            let quoteBalance = 0;
            for (let j = 0; j < currentLine.length; j++) {
                if (currentLine[j] === '"') {
                    if (j + 1 < currentLine.length && currentLine[j + 1] === '"') {
                        j++; // Skip escaped quote
                    } else {
                        quoteBalance++;
                    }
                }
            }
            inQuotes = (quoteBalance % 2 !== 0);
        }
        
        // Now parse the complete line (which may span multiple raw lines)
        const values = parseCSVLine(currentLine);
        
        if (values.length === expectedColumns) {
            const row = {};
            headers.forEach((header, idx) => {
                // Skip _overrides column if it exists in CSV
                if (header !== '_overrides') {
                    row[header] = values[idx];
                }
            });
            rows.push(row);
        } else {
            // Store skipped row info
            skippedRows.push({
                lineNumber: lineStart + 1,
                rawLine: currentLine.length > 100 ? currentLine.substring(0, 100) + '...' : currentLine,
                parsedValues: values.length > 5 ? values.slice(0, 5).concat(['...']) : values,
                expectedColumns: expectedColumns,
                actualColumns: values.length,
                reason: `Column count mismatch: expected ${expectedColumns}, got ${values.length}`
            });
        }
        
        i++;
    }
    
    // Store validation data
    state.importValidation = {
        skippedRows: skippedRows,
        headers: headers,
        totalLines: lines.length,
        validRows: rows.length,
        invalidRows: skippedRows.length
    };
    
    return rows;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim());
    return values;
}

function populateDataFilters() {
    if (state.timesheetData.length === 0) return;
    
    // Get unique values for each filter
    const activities = new Set();
    const statuses = new Set();
    const projectKeys = new Set();
    const servisValues = new Set();
    
    state.timesheetData.forEach(row => {
        if (row['Activity Name']) activities.add(row['Activity Name']);
        if (row['Issue Status']) statuses.add(row['Issue Status']);
        if (row['Project Key']) projectKeys.add(row['Project Key']);
        if (row['Servis']) servisValues.add(row['Servis']);
    });
    
    // Populate Timesheet Data tab filter dropdowns
    populateMultiSelect('project-filter', state.projects);
    populateMultiSelect('team-filter', state.teams);
    populateMultiSelect('role-filter', state.roles);
    populateMultiSelect('person-filter', Object.keys(state.people).sort());
    populateMultiSelect('activity-filter', Array.from(activities).sort());
    populateMultiSelect('issue-status-filter', Array.from(statuses).sort());
    populateMultiSelect('project-key-filter', Array.from(projectKeys).sort());
    populateMultiSelect('servis-filter', Array.from(servisValues).sort());
    
    // Populate Reports tab filter dropdowns
    populateMultiSelect('report-project-filter', state.projects);
    populateMultiSelect('report-team-filter', state.teams);
    populateMultiSelect('report-role-filter', state.roles);
    populateMultiSelect('report-person-filter', Object.keys(state.people).sort());
    populateMultiSelect('report-activity-filter', Array.from(activities).sort());
    populateMultiSelect('report-issue-status-filter', Array.from(statuses).sort());
    populateMultiSelect('report-project-key-filter', Array.from(projectKeys).sort());
    populateMultiSelect('report-servis-filter', Array.from(servisValues).sort());
}

function populateMultiSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) return; // Guard against null element
    
    const currentValues = Array.from(select.selectedOptions).map(o => o.value);
    
    // Special handling for servis filters - show display names
    const isServisFilter = id.includes('servis-filter');
    
    select.innerHTML = '<option value="">All</option>' +
        options.map(opt => {
            const displayValue = isServisFilter ? getServisDisplayName(opt) : opt;
            return `<option value="${escapeHtml(opt)}">${escapeHtml(displayValue)}</option>`;
        }).join('');
    
    // Restore selection
    Array.from(select.options).forEach(option => {
        if (currentValues.includes(option.value)) {
            option.selected = true;
        }
    });
}

function applyFilters() {
    // Reset pagination to first page
    state.pagination.filteredData.currentPage = 1;
    
    // Clear row selections when applying new filters
    state.selectedRows.clear();
    
    const filters = {
        projects: getSelectedValues('project-filter'),
        projectsNot: document.getElementById('project-filter-not')?.checked || false,
        teams: getSelectedValues('team-filter'),
        teamsNot: document.getElementById('team-filter-not')?.checked || false,
        roles: getSelectedValues('role-filter'),
        rolesNot: document.getElementById('role-filter-not')?.checked || false,
        people: getSelectedValues('person-filter'),
        peopleNot: document.getElementById('person-filter-not')?.checked || false,
        activities: getSelectedValues('activity-filter'),
        activitiesNot: document.getElementById('activity-filter-not')?.checked || false,
        statuses: getSelectedValues('issue-status-filter'),
        statusesNot: document.getElementById('issue-status-filter-not')?.checked || false,
        projectKeys: getSelectedValues('project-key-filter'),
        projectKeysNot: document.getElementById('project-key-filter-not')?.checked || false,
        servisValues: getSelectedValues('servis-filter'),
        servisValuesNot: document.getElementById('servis-filter-not')?.checked || false,
        issueSummary: document.getElementById('issue-summary-filter')?.value.toLowerCase() || '',
        issueSummaryNot: document.getElementById('issue-summary-not')?.checked || false,
        workDateStart: document.getElementById('work-date-start')?.value || '',
        workDateEnd: document.getElementById('work-date-end')?.value || ''
    };
    
    state.filteredData = state.timesheetData.filter(row => {
        // Match person with people mapping
        const fullName = row['Full name'];
        let personData = null;
        
        if (fullName) {
            // Find person in state.people by checking if full name contains the person key
            for (const [personKey, data] of Object.entries(state.people)) {
                if (fullName.includes(personKey)) {
                    personData = { ...data, name: personKey };
                    break;
                }
            }
        }
        
        // Get actual team and project with priority order:
        // 1. Override (manual edit)
        // 2. CSV data (Team/Project columns)
        // 3. Person mapping (fallback)
        let actualTeam = row._overrides?.team || row.Team || personData?.team;
        let actualProject = row._overrides?.project || row.Project || personData?.project;
        
        // Apply filters with NOT logic
        if (filters.projects.length) {
            const isInList = filters.projects.includes(actualProject);
            if (filters.projectsNot ? isInList : !isInList) return false;
        }
        if (filters.teams.length) {
            const isInList = filters.teams.includes(actualTeam);
            if (filters.teamsNot ? isInList : !isInList) return false;
        }
        if (filters.roles.length && personData) {
            const isInList = filters.roles.includes(personData.role);
            if (filters.rolesNot ? isInList : !isInList) return false;
        }
        if (filters.people.length && personData) {
            const isInList = filters.people.includes(personData.name);
            if (filters.peopleNot ? isInList : !isInList) return false;
        }
        if (filters.activities.length) {
            const isInList = filters.activities.includes(row['Activity Name']);
            if (filters.activitiesNot ? isInList : !isInList) return false;
        }
        if (filters.statuses.length) {
            const isInList = filters.statuses.includes(row['Issue Status']);
            if (filters.statusesNot ? isInList : !isInList) return false;
        }
        if (filters.projectKeys.length) {
            const isInList = filters.projectKeys.includes(row['Project Key']);
            if (filters.projectKeysNot ? isInList : !isInList) return false;
        }
        if (filters.servisValues.length) {
            const isInList = filters.servisValues.includes(row['Servis']);
            if (filters.servisValuesNot ? isInList : !isInList) return false;
        }
        
        // Work date filter
        if (filters.workDateStart || filters.workDateEnd) {
            const workDate = row['Work date'];
            if (workDate) {
                // Extract date part only (YYYY-MM-DD)
                const datePart = workDate.split(' ')[0];
                if (filters.workDateStart && datePart < filters.workDateStart) return false;
                if (filters.workDateEnd && datePart > filters.workDateEnd) return false;
            } else {
                // If no work date in record, filter it out when date filter is active
                return false;
            }
        }
        
        if (filters.issueSummary) {
            const summary = (row['Issue summary'] || '').toLowerCase();
            const matches = summary.includes(filters.issueSummary);
            // If NOT is checked, exclude matches. If NOT is not checked, include only matches.
            if (filters.issueSummaryNot) {
                if (matches) return false; // Exclude if matches
            } else {
                if (!matches) return false; // Exclude if doesn't match
            }
        }
        
        return true;
    });
    
    renderFilteredData();
    updateSummaryStats();
    updateSelectedCount();
}

function getSelectedValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    return Array.from(select.selectedOptions)
        .map(o => o.value)
        .filter(v => v !== '');
}

function toggleAdvancedFilters() {
    const advancedFilters = document.getElementById('advanced-filters');
    const toggleBtn = document.getElementById('toggle-advanced-filters');
    const badge = document.getElementById('advanced-filters-badge');
    
    if (advancedFilters.style.display === 'none') {
        advancedFilters.style.display = 'grid';
        if (badge && badge.style.display !== 'none') {
            toggleBtn.innerHTML = '− Advanced Filters ' + badge.outerHTML;
        } else {
            toggleBtn.textContent = '− Advanced Filters';
        }
    } else {
        advancedFilters.style.display = 'none';
        if (badge && badge.style.display !== 'none') {
            toggleBtn.innerHTML = '+ Advanced Filters ' + badge.outerHTML;
        } else {
            toggleBtn.textContent = '+ Advanced Filters';
        }
    }
}

function toggleReportAdvancedFilters() {
    const advancedFilters = document.getElementById('report-advanced-filters');
    const toggleBtn = document.getElementById('toggle-report-advanced-filters');
    const badge = document.getElementById('report-advanced-filters-badge');
    
    if (advancedFilters.style.display === 'none') {
        advancedFilters.style.display = 'grid';
        if (badge && badge.style.display !== 'none') {
            toggleBtn.innerHTML = '− Advanced Filters ' + badge.outerHTML;
        } else {
            toggleBtn.textContent = '− Advanced Filters';
        }
    } else {
        advancedFilters.style.display = 'none';
        if (badge && badge.style.display !== 'none') {
            toggleBtn.innerHTML = '+ Advanced Filters ' + badge.outerHTML;
        } else {
            toggleBtn.textContent = '+ Advanced Filters';
        }
    }
}

function updateFilterBadges() {
    const mainFilters = ['project-filter', 'team-filter', 'role-filter', 'activity-filter', 'servis-filter'];
    const advancedFilterSelects = ['person-filter', 'issue-status-filter', 'project-key-filter'];
    const issueSummary = document.getElementById('issue-summary-filter')?.value || '';
    const workDateStart = document.getElementById('work-date-start')?.value || '';
    const workDateEnd = document.getElementById('work-date-end')?.value || '';
    
    let mainCount = 0;
    let advancedCount = 0;
    
    mainFilters.forEach(id => {
        const values = getSelectedValues(id);
        mainCount += values.length;
    });
    
    // Count date filters as main filters
    if (workDateStart) mainCount++;
    if (workDateEnd) mainCount++;
    
    advancedFilterSelects.forEach(id => {
        const values = getSelectedValues(id);
        advancedCount += values.length;
    });
    
    if (issueSummary.trim()) advancedCount++;
    
    const totalCount = mainCount + advancedCount;
    const filtersBadge = document.getElementById('filters-badge');
    const advancedBadge = document.getElementById('advanced-filters-badge');
    
    if (filtersBadge) {
        if (totalCount > 0) {
            filtersBadge.textContent = totalCount;
            filtersBadge.style.display = 'inline-flex';
        } else {
            filtersBadge.style.display = 'none';
        }
    }
    
    if (advancedBadge) {
        if (advancedCount > 0) {
            advancedBadge.textContent = advancedCount;
            advancedBadge.style.display = 'inline-flex';
        } else {
            advancedBadge.style.display = 'none';
        }
    }
}

function updateReportFilterBadges() {
    const mainFilters = ['report-project-filter', 'report-team-filter', 'report-role-filter', 'report-activity-filter', 'report-servis-filter'];
    const advancedFilterSelects = ['report-person-filter', 'report-issue-status-filter', 'report-project-key-filter'];
    const issueSummary = document.getElementById('report-issue-summary-filter')?.value || '';
    const workDateStart = document.getElementById('report-work-date-start')?.value || '';
    const workDateEnd = document.getElementById('report-work-date-end')?.value || '';
    
    let mainCount = 0;
    let advancedCount = 0;
    
    mainFilters.forEach(id => {
        const values = getSelectedValues(id);
        mainCount += values.length;
    });
    
    // Count date filters as main filters
    if (workDateStart) mainCount++;
    if (workDateEnd) mainCount++;
    
    advancedFilterSelects.forEach(id => {
        const values = getSelectedValues(id);
        advancedCount += values.length;
    });
    
    if (issueSummary.trim()) advancedCount++;
    
    const totalCount = mainCount + advancedCount;
    const filtersBadge = document.getElementById('report-filters-badge');
    const advancedBadge = document.getElementById('report-advanced-filters-badge');
    
    if (filtersBadge) {
        if (totalCount > 0) {
            filtersBadge.textContent = totalCount;
            filtersBadge.style.display = 'inline-flex';
        } else {
            filtersBadge.style.display = 'none';
        }
    }
    
    if (advancedBadge) {
        if (advancedCount > 0) {
            advancedBadge.textContent = advancedCount;
            advancedBadge.style.display = 'inline-flex';
        } else {
            advancedBadge.style.display = 'none';
        }
    }
}

function clearFilters() {
    document.querySelectorAll('#tab-data select[multiple]').forEach(select => {
        Array.from(select.options).forEach(option => {
            option.selected = option.value === '';
        });
    });
    
    // Clear text inputs
    const issueSummaryFilter = document.getElementById('issue-summary-filter');
    if (issueSummaryFilter) issueSummaryFilter.value = '';
    
    const issueSummaryNot = document.getElementById('issue-summary-not');
    if (issueSummaryNot) issueSummaryNot.checked = false;
    
    // Clear date inputs
    const workDateStart = document.getElementById('work-date-start');
    if (workDateStart) workDateStart.value = '';
    
    const workDateEnd = document.getElementById('work-date-end');
    if (workDateEnd) workDateEnd.value = '';
    
    updateFilterBadges();
    applyFilters();
}

function clearReportFilters() {
    document.querySelectorAll('#tab-reports select[multiple]').forEach(select => {
        Array.from(select.options).forEach(option => {
            option.selected = option.value === '';
        });
    });
    
    // Clear text inputs
    const issueSummaryFilter = document.getElementById('report-issue-summary-filter');
    if (issueSummaryFilter) issueSummaryFilter.value = '';
    
    const issueSummaryNot = document.getElementById('report-issue-summary-not');
    if (issueSummaryNot) issueSummaryNot.checked = false;
    
    // Clear date inputs
    const reportWorkDateStart = document.getElementById('report-work-date-start');
    if (reportWorkDateStart) reportWorkDateStart.value = '';
    
    const reportWorkDateEnd = document.getElementById('report-work-date-end');
    if (reportWorkDateEnd) reportWorkDateEnd.value = '';
    
    updateReportFilterBadges();
}

function formatDateShort(dateString) {
    if (!dateString) return '-';
    
    // Get date part only (YYYY-MM-DD)
    const datePart = dateString.split(' ')[0];
    const date = new Date(datePart);
    
    if (isNaN(date.getTime())) return datePart;
    
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    
    return `${day} ${month} '${year}`;
}

function renderFilteredData() {
    const tbody = document.getElementById('data-tbody');
    
    if (state.filteredData.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="11">No data matches the filters</td></tr>';
        const paginationDiv = document.getElementById('data-pagination');
        if (paginationDiv) paginationDiv.innerHTML = '';
        updateSelectedCount();
        return;
    }
    
    // Pagination
    const { currentPage, itemsPerPage } = state.pagination.filteredData;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = state.filteredData.slice(start, end);
    
    tbody.innerHTML = paginated.map((row, idx) => {
        const actualIdx = start + idx;
        const fullName = row['Full name'] || '';
        // Extract person name: take text before "-", remove spaces
        const personName = fullName.split('-')[0].trim();
        
        let team = '-', project = '-';
        
        // Priority order:
        // 1. Check for overrides (manual edits)
        // 2. Check CSV data (Team and Project columns)
        // 3. Check person mapping (fallback)
        
        if (row._overrides) {
            team = row._overrides.team || '-';
            project = row._overrides.project || '-';
        } else if (row.Team || row.Project) {
            // Use data from CSV if available
            team = row.Team || '-';
            project = row.Project || '-';
        } else {
            // Fallback to person mapping
            for (const [personKey, data] of Object.entries(state.people)) {
                if (fullName && fullName.includes(personKey)) {
                    team = data.team || '-';
                    project = data.project || '-';
                    break;
                }
            }
        }
        
        // Format work date to show only date part (not time)
        const workDate = row['Work date'] || '';
        const formattedDate = formatDateShort(workDate);
        
        // Get Servis display name
        const servisDisplay = getServisDisplayName(row['Servis']);
        
        // Truncate issue summary for display
        const issueSummary = row['Issue summary'] || '';
        const truncatedSummary = issueSummary.length > 50 ? issueSummary.substring(0, 50) + '...' : issueSummary;
        
        const isSelected = state.selectedRows.has(actualIdx);
        
        return `
            <tr class="clickable-row" title="Click to view full details">
                <td onclick="event.stopPropagation(); toggleRowSelection(${actualIdx})">
                    <input type="checkbox" class="checkbox row-checkbox" data-idx="${actualIdx}" ${isSelected ? 'checked' : ''}>
                </td>
                <td onclick="showRowDetails(${actualIdx})">${escapeHtml(formattedDate)}</td>
                <td onclick="showRowDetails(${actualIdx})">${escapeHtml(servisDisplay)}</td>
                <td onclick="showRowDetails(${actualIdx})">${escapeHtml(row['Project Key'] || '')}</td>
                <td onclick="showRowDetails(${actualIdx})">${escapeHtml(personName)}</td>
                <td onclick="showRowDetails(${actualIdx})">${escapeHtml(row['Activity Name'] || '')}</td>
                <td onclick="showRowDetails(${actualIdx})">${escapeHtml(truncatedSummary)}</td>
                <td onclick="showRowDetails(${actualIdx})">${escapeHtml(row['Issue Status'] || '')}</td>
                <td onclick="showRowDetails(${actualIdx})">${parseFloat(row.Hours || 0).toFixed(1)}</td>
                <td onclick="showRowDetails(${actualIdx})">${escapeHtml(team)}</td>
                <td onclick="showRowDetails(${actualIdx})">${escapeHtml(project)}</td>
            </tr>
        `;
    }).join('');
    
    // Update select all checkbox state
    updateSelectAllCheckbox();
    updateSelectedCount();
    
    // Render pagination
    renderPagination('filteredData', state.filteredData.length);
}

function updateSummaryStats() {
    const uniquePeople = new Set();
    const uniqueIssues = new Set();
    let totalHours = 0;
    
    state.filteredData.forEach(row => {
        if (row['Full name']) uniquePeople.add(row['Full name']);
        if (row['Issue Key']) uniqueIssues.add(row['Issue Key']);
        totalHours += parseFloat(row.Hours) || 0;
    });
    
    document.getElementById('total-records').textContent = state.filteredData.length;
    document.getElementById('total-hours').textContent = totalHours.toFixed(1);
    document.getElementById('unique-people').textContent = uniquePeople.size;
    document.getElementById('unique-issues').textContent = uniqueIssues.size;
}

function showRowDetails(rowIndex) {
    const row = state.filteredData[rowIndex];
    if (!row) return;
    
    const fullName = row['Full name'] || '';
    const personName = fullName.split('-')[0].trim();
    let team = '-', project = '-';
    
    // Priority order:
    // 1. Check for overrides (manual edits)
    // 2. Check CSV data (Team and Project columns)
    // 3. Check person mapping (fallback)
    
    if (row._overrides) {
        team = row._overrides.team || '-';
        project = row._overrides.project || '-';
    } else if (row.Team || row.Project) {
        // Use data from CSV if available
        team = row.Team || '-';
        project = row.Project || '-';
    } else {
        // Fallback to person mapping
        for (const [personKey, data] of Object.entries(state.people)) {
            if (fullName && fullName.includes(personKey)) {
                team = data.team || '-';
                project = data.project || '-';
                break;
            }
        }
    }
    
    const epic = row.Epic || row['Epic Link'] || '-';
    
    const detailsHtml = `
        <div class="row-details">
            <div class="detail-row">
                <strong>Project Key:</strong>
                <span>${escapeHtml(row['Project Key'] || '')}</span>
            </div>
            <div class="detail-row">
                <strong>Person Name:</strong>
                <span>${escapeHtml(personName)}</span>
            </div>
            <div class="detail-row">
                <strong>Full Name:</strong>
                <span>${escapeHtml(fullName)}</span>
            </div>
            <div class="detail-row">
                <strong>Activity Name:</strong>
                <span>${escapeHtml(row['Activity Name'] || '')}</span>
            </div>
            <div class="detail-row">
                <strong>Epic:</strong>
                <span>${escapeHtml(epic)}</span>
            </div>
            <div class="detail-row">
                <strong>Issue Key:</strong>
                <span>${escapeHtml(row['Issue Key'] || '')}</span>
            </div>
            <div class="detail-row">
                <strong>Issue Summary:</strong>
                <span>${escapeHtml(row['Issue summary'] || '')}</span>
            </div>
            <div class="detail-row">
                <strong>Issue Status:</strong>
                <span>${escapeHtml(row['Issue Status'] || '')}</span>
            </div>
            <div class="detail-row">
                <strong>Efor:</strong>
                <span>${parseFloat(row.Hours || 0).toFixed(1)} hour</span>
            </div>
            <div class="detail-row">
                <strong>Work Description:</strong>
                <span>${escapeHtml(row['Work Description'] || row['work description'] || '-')}</span>
            </div>
            <div class="detail-row">
                <strong>Team:</strong>
                <span>${escapeHtml(team)}</span>
            </div>
            <div class="detail-row">
                <strong>Project:</strong>
                <span>${escapeHtml(project)}</span>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = 'Row Details';
    modalBody.innerHTML = detailsHtml;
    
    modal.classList.add('active');
    
    // Configure buttons for details view with edit option
    const saveBtn = document.getElementById('modal-save');
    const cancelBtn = document.getElementById('modal-cancel');
    saveBtn.textContent = 'Edit';
    saveBtn.style.display = 'inline-block';
    cancelBtn.textContent = 'Close';
    
    // Store the row index for editing
    modal.dataset.rowIndex = rowIndex;
    modal.dataset.mode = 'view';
    
    // Override save button to switch to edit mode
    saveBtn.onclick = () => {
        if (modal.dataset.mode === 'view') {
            showRowEdit(rowIndex);
        } else {
            saveRowEdit(rowIndex);
        }
    };
}

function showRowEdit(rowIndex) {
    const row = state.filteredData[rowIndex];
    if (!row) return;
    
    const fullName = row['Full name'] || '';
    const personName = fullName.split('-')[0].trim();
    let team = '-', project = '-';
    
    // Priority order:
    // 1. Check for overrides (manual edits)
    // 2. Check CSV data (Team and Project columns)
    // 3. Check person mapping (fallback)
    
    if (row._overrides) {
        team = row._overrides.team || '-';
        project = row._overrides.project || '-';
    } else if (row.Team || row.Project) {
        // Use data from CSV if available
        team = row.Team || '-';
        project = row.Project || '-';
    } else {
        // Fallback to person mapping
        for (const [personKey, data] of Object.entries(state.people)) {
            if (fullName && fullName.includes(personKey)) {
                team = data.team || '-';
                project = data.project || '-';
                break;
            }
        }
    }
    
    const epic = row.Epic || row['Epic Link'] || '';
    const workDescription = row['Work Description'] || row['work description'] || '';
    
    const editFormHtml = `
        <div class="row-details">
            <div class="detail-row">
                <label><strong>Project Key:</strong></label>
                <input type="text" id="edit-project-key" class="input" value="${escapeHtml(row['Project Key'] || '')}" disabled>
            </div>
            <div class="detail-row">
                <label><strong>Person Name:</strong></label>
                <input type="text" id="edit-person-name" class="input" value="${escapeHtml(personName)}" disabled>
            </div>
            <div class="detail-row">
                <label><strong>Activity Name:</strong></label>
                <input type="text" id="edit-activity-name" class="input" value="${escapeHtml(row['Activity Name'] || '')}" disabled>
            </div>
            <div class="detail-row">
                <label><strong>Epic:</strong></label>
                <input type="text" id="edit-epic" class="input" value="${escapeHtml(epic)}" disabled>
            </div>
            <div class="detail-row">
                <label><strong>Issue Key:</strong></label>
                <input type="text" id="edit-issue-key" class="input" value="${escapeHtml(row['Issue Key'] || '')}" disabled>
            </div>
            <div class="detail-row">
                <label><strong>Issue Summary:</strong></label>
                <input type="text" id="edit-issue-summary" class="input" value="${escapeHtml(row['Issue summary'] || '')}" disabled>
            </div>
            <div class="detail-row">
                <label><strong>Issue Status:</strong></label>
                <input type="text" id="edit-issue-status" class="input" value="${escapeHtml(row['Issue Status'] || '')}" disabled>
            </div>
            <div class="detail-row">
                <label><strong>Hours:</strong></label>
                <input type="number" id="edit-hours" class="input" value="${parseFloat(row.Hours || 0)}" step="0.1" disabled>
            </div>
            <div class="detail-row">
                <label><strong>Work Description:</strong></label>
                <textarea id="edit-work-description" class="input" rows="3" disabled>${escapeHtml(workDescription)}</textarea>
            </div>
            <div class="detail-row">
                <label><strong>Team (Override):</strong></label>
                <select id="edit-team" class="input">
                    <option value="">- Select Team -</option>
                    ${state.teams.map(t => `<option value="${escapeHtml(t)}" ${t === team ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
                </select>
            </div>
            <div class="detail-row">
                <label><strong>Project (Override):</strong></label>
                <select id="edit-project" class="input">
                    <option value="">- Select Project -</option>
                    ${state.projects.map(p => `<option value="${escapeHtml(p)}" ${p === project ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
                </select>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const saveBtn = document.getElementById('modal-save');
    const cancelBtn = document.getElementById('modal-cancel');
    
    modalTitle.textContent = 'Edit Row';
    modalBody.innerHTML = editFormHtml;
    modal.dataset.mode = 'edit';
    
    saveBtn.textContent = 'Save';
    cancelBtn.textContent = 'Cancel';
    
    // Override cancel to go back to view mode
    cancelBtn.onclick = () => {
        showRowDetails(rowIndex);
    };
}

function saveRowEdit(rowIndex) {
    const row = state.filteredData[rowIndex];
    if (!row) return;
    
    const teamInput = document.getElementById('edit-team');
    const projectInput = document.getElementById('edit-project');
    
    if (!teamInput || !projectInput) {
        console.error('Edit inputs not found');
        return;
    }
    
    const newTeam = teamInput.value.trim();
    const newProject = projectInput.value.trim();
    
    // Store overrides in the row data
    if (!row._overrides) row._overrides = {};
    row._overrides.team = newTeam;
    row._overrides.project = newProject;
    
    // Also update in original timesheetData
    const originalIndex = state.timesheetData.indexOf(row);
    if (originalIndex !== -1) {
        if (!state.timesheetData[originalIndex]._overrides) {
            state.timesheetData[originalIndex]._overrides = {};
        }
        state.timesheetData[originalIndex]._overrides.team = newTeam;
        state.timesheetData[originalIndex]._overrides.project = newProject;
    }
    
    // Re-render the table
    renderFilteredData();
    
    // Close modal
    closeModal();
}

function exportFilteredDataCSV() {
    if (state.filteredData.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Prepare headers (use first row to get all keys, exclude _overrides)
    const headers = Object.keys(state.filteredData[0]).filter(h => h !== '_overrides');
    
    // Add Team and Project columns if not present
    if (!headers.includes('Team')) headers.push('Team');
    if (!headers.includes('Project')) headers.push('Project');
    
    // Build CSV
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';
    
    state.filteredData.forEach(row => {
        // Get team and project from overrides first, then from person mapping
        const fullName = row['Full name'];
        let team = '', project = '';
        
        // Check for overrides first
        if (row._overrides) {
            team = row._overrides.team || '';
            project = row._overrides.project || '';
        }
        
        // If not in overrides, check person mapping
        if (!team || !project) {
            for (const [personKey, data] of Object.entries(state.people)) {
                if (fullName && fullName.includes(personKey)) {
                    if (!team) team = data.team || '';
                    if (!project) project = data.project || '';
                    break;
                }
            }
        }
        
        const values = headers.map(h => {
            if (h === 'Team') return `"${team}"`;
            if (h === 'Project') return `"${project}"`;
            const value = row[h] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        
        csv += values.join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered-timesheet-data.csv';
    a.click();
    URL.revokeObjectURL(url);
}

async function clearAllTimesheetData() {
    if (state.timesheetData.length === 0) {
        alert('No timesheet data to clear');
        return;
    }
    
    const recordCount = state.timesheetData.length;
    const confirmMessage = `⚠️ WARNING: This will permanently delete all ${recordCount} timesheet records!\n\nThis action cannot be undone.\n\nAre you sure you want to continue?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Double confirmation for safety
    if (!confirm('Final confirmation: Delete all timesheet data?')) {
        return;
    }
    
    // Clear the data
    state.timesheetData = [];
    state.filteredData = [];
    state.selectedRows.clear();
    state.importValidation = {
        skippedRows: [],
        headers: [],
        totalLines: 0,
        validRows: 0,
        invalidRows: 0
    };
    
    // Save to database
    await saveToIndexedDB();
    
    // Clear filters
    clearFilters();
    
    // Update UI
    renderFilteredData();
    updateSummaryStats();
    
    // Clear filter dropdowns
    document.getElementById('activity-filter').innerHTML = '<option value="">All Activities</option>';
    document.getElementById('issue-status-filter').innerHTML = '<option value="">All Statuses</option>';
    document.getElementById('project-key-filter').innerHTML = '<option value="">All Project Keys</option>';
    document.getElementById('servis-filter').innerHTML = '<option value="">All Servis</option>';
    document.getElementById('person-filter').innerHTML = '<option value="">All Persons</option>';
    
    // Clear report filters too
    document.getElementById('report-activity-filter').innerHTML = '<option value="">All Activities</option>';
    document.getElementById('report-issue-status-filter').innerHTML = '<option value="">All Statuses</option>';
    document.getElementById('report-project-key-filter').innerHTML = '<option value="">All Project Keys</option>';
    document.getElementById('report-servis-filter').innerHTML = '<option value="">All Servis</option>';
    document.getElementById('report-person-filter').innerHTML = '<option value="">All Persons</option>';
    
    alert(`✅ All ${recordCount} timesheet records have been deleted`);
}

// ============================================
// SERVIS MANAGEMENT
// ============================================

function getServisDisplayName(servisNumber) {
    if (!servisNumber) return '-';
    const mapping = state.servisMapping[servisNumber];
    return mapping ? `${servisNumber} - ${mapping}` : servisNumber;
}

function openServisModal() {
    const modal = document.getElementById('servis-modal');
    modal.style.display = 'flex';
    renderServisMappings();
    
    // Setup event listeners
    document.getElementById('servis-modal-close').onclick = closeServisModal;
    document.getElementById('servis-modal-close-btn').onclick = closeServisModal;
    document.getElementById('add-servis-mapping-btn').onclick = addServisMapping;
}

function closeServisModal() {
    document.getElementById('servis-modal').style.display = 'none';
    // Refresh filters to show updated names
    populateDataFilters();
    renderFilteredData();
}

function renderServisMappings() {
    const tbody = document.getElementById('servis-mapping-tbody');
    
    // Get all unique servis numbers from timesheet data
    const allServisNumbers = new Set();
    state.timesheetData.forEach(row => {
        if (row['Servis']) allServisNumbers.add(row['Servis']);
    });
    
    const servisArray = Array.from(allServisNumbers).sort();
    
    if (servisArray.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No Servis data found in timesheet records</td></tr>';
        return;
    }
    
    tbody.innerHTML = servisArray.map(servisNum => {
        const displayName = state.servisMapping[servisNum] || '';
        return `
            <tr>
                <td>${escapeHtml(servisNum)}</td>
                <td>
                    <input type="text" 
                           class="input" 
                           value="${escapeHtml(displayName)}" 
                           placeholder="Enter display name..."
                           onchange="updateServisMapping('${escapeHtml(servisNum)}', this.value)"
                           style="width: 100%;">
                </td>
                <td>
                    <button class="btn-icon" 
                            onclick="clearServisMapping('${escapeHtml(servisNum)}')" 
                            title="Clear mapping">
                        ✖
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateServisMapping(servisNumber, displayName) {
    if (displayName.trim()) {
        state.servisMapping[servisNumber] = displayName.trim();
    } else {
        delete state.servisMapping[servisNumber];
    }
    await saveToIndexedDB();
}

async function clearServisMapping(servisNumber) {
    delete state.servisMapping[servisNumber];
    await saveToIndexedDB();
    renderServisMappings();
}

function addServisMapping() {
    const servisNum = prompt('Enter Servis number:');
    if (!servisNum || !servisNum.trim()) return;
    
    const displayName = prompt('Enter display name:');
    if (!displayName || !displayName.trim()) return;
    
    state.servisMapping[servisNum.trim()] = displayName.trim();
    saveToIndexedDB();
    renderServisMappings();
}

// ============================================
// REPORTS TAB (tab-reports)
// ============================================

function syncReportFilters() {
    // Copy filter selections from data tab to reports tab
    const filterMap = [
        ['project-filter', 'report-project-filter'],
        ['team-filter', 'report-team-filter'],
        ['role-filter', 'report-role-filter'],
        ['person-filter', 'report-person-filter'],
        ['activity-filter', 'report-activity-filter'],
        ['issue-status-filter', 'report-issue-status-filter']
    ];
    
    filterMap.forEach(([sourceId, targetId]) => {
        const source = document.getElementById(sourceId);
        const target = document.getElementById(targetId);
        
        if (source && target) {
            // Populate target with same options
            const options = Array.from(source.options).map(o => o.value);
            populateMultiSelect(targetId.replace('report-', '').replace('-filter', ''), 
                               options.filter(o => o !== ''));
            
            // Copy selection
            const selectedValues = Array.from(source.selectedOptions).map(o => o.value);
            Array.from(target.options).forEach(option => {
                option.selected = selectedValues.includes(option.value);
            });
        }
    });
}

// Helper function to get ISO week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Helper function to get consistent color for a category
function getCategoryColor(category, allCategories) {
    // Get current theme colors
    const theme = document.getElementById('theme-select')?.value || 'Default';
    const colors = chartThemes[theme] || chartThemes['Default'];
    
    // Check if category has a custom color in state
    if (state.categoryColors && state.categoryColors[category]) {
        return state.categoryColors[category];
    }
    
    // Sort all categories to ensure consistent ordering
    const sortedCategories = Array.from(allCategories).sort();
    const index = sortedCategories.indexOf(category);
    
    return colors[index % colors.length];
}

// Helper function to aggregate data by time periods
function aggregateByTimePeriod(filteredData, granularity) {
    const periodMap = {};
    
    filteredData.forEach(row => {
        const workDate = row['Work date'];
        if (!workDate) return;
        
        const datePart = workDate.split(' ')[0]; // Get YYYY-MM-DD part
        const date = new Date(datePart);
        if (isNaN(date.getTime())) return;
        
        let periodKey;
        
        if (granularity === 'daily') {
            periodKey = datePart; // YYYY-MM-DD
        } else if (granularity === 'weekly') {
            // Get the Monday of the week
            const dayOfWeek = date.getDay();
            const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
            const monday = new Date(date.setDate(diff));
            periodKey = monday.toISOString().split('T')[0];
        } else if (granularity === 'monthly') {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            periodKey = `${year}-${month}`;
        } else if (granularity === 'quarterly') {
            const year = date.getFullYear();
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            periodKey = `${year}-Q${quarter}`;
        }
        
        if (!periodKey) return;
        
        // Get the key for the current report type
        let categoryKey;
        const fullName = row['Full name'];
        
        if (state.currentReportType === 'person') {
            for (const personKey of Object.keys(state.people)) {
                if (fullName && fullName.includes(personKey)) {
                    categoryKey = personKey;
                    break;
                }
            }
            if (!categoryKey) categoryKey = fullName || 'Unknown';
        } else if (state.currentReportType === 'team') {
            if (row._overrides && row._overrides.team) {
                categoryKey = row._overrides.team;
            } else if (row.Team) {
                categoryKey = row.Team;
            } else {
                for (const [personKey, data] of Object.entries(state.people)) {
                    if (fullName && fullName.includes(personKey)) {
                        categoryKey = data.team || 'Unassigned';
                        break;
                    }
                }
                if (!categoryKey) categoryKey = 'Unassigned';
            }
        } else if (state.currentReportType === 'project') {
            if (row._overrides && row._overrides.project) {
                categoryKey = row._overrides.project;
            } else if (row.Project) {
                categoryKey = row.Project;
            } else {
                for (const [personKey, data] of Object.entries(state.people)) {
                    if (fullName && fullName.includes(personKey)) {
                        categoryKey = data.project || 'Unassigned';
                        break;
                    }
                }
                if (!categoryKey) categoryKey = 'Unassigned';
            }
        } else if (state.currentReportType === 'role') {
            for (const [personKey, data] of Object.entries(state.people)) {
                if (fullName && fullName.includes(personKey)) {
                    categoryKey = data.role || 'Unassigned';
                    break;
                }
            }
            if (!categoryKey) categoryKey = 'Unassigned';
        } else if (state.currentReportType === 'activity') {
            categoryKey = row['Activity Name'] || 'Unknown';
        } else if (state.currentReportType === 'status') {
            categoryKey = row['Issue Status'] || 'Unknown';
        } else if (state.currentReportType === 'epic') {
            categoryKey = row['Epic'] || 'No Epic';
        } else if (state.currentReportType === 'projectKey') {
            categoryKey = row['Project Key'] || 'Unknown';
        } else if (state.currentReportType === 'issueKey') {
            categoryKey = row['Issue Key'] || 'Unknown';
        } else if (state.currentReportType === 'servis') {
            const servisNum = row['Servis'];
            categoryKey = servisNum ? getServisDisplayName(servisNum) : 'No Service';
        }
        
        if (!periodMap[periodKey]) {
            periodMap[periodKey] = { total: 0, breakdown: {} };
        }
        
        const hours = parseFloat(row.Hours) || 0;
        periodMap[periodKey].total += hours;
        
        if (!periodMap[periodKey].breakdown[categoryKey]) {
            periodMap[periodKey].breakdown[categoryKey] = 0;
        }
        periodMap[periodKey].breakdown[categoryKey] += hours;
    });
    
    // Convert to sorted array
    const periods = Object.keys(periodMap).sort();
    
    return periods.map(period => ({
        period,
        total: periodMap[period].total,
        breakdown: periodMap[period].breakdown
    }));
}

function generateReport() {
    // Check if there's any timesheet data
    if (state.timesheetData.length === 0) {
        alert('Please import timesheet data first (Timesheet Data tab)');
        return;
    }
    
    // Apply filters from reports tab
    const filters = {
        projects: getSelectedValues('report-project-filter'),
        projectsNot: document.getElementById('report-project-filter-not')?.checked || false,
        teams: getSelectedValues('report-team-filter'),
        teamsNot: document.getElementById('report-team-filter-not')?.checked || false,
        roles: getSelectedValues('report-role-filter'),
        rolesNot: document.getElementById('report-role-filter-not')?.checked || false,
        people: getSelectedValues('report-person-filter'),
        peopleNot: document.getElementById('report-person-filter-not')?.checked || false,
        activities: getSelectedValues('report-activity-filter'),
        activitiesNot: document.getElementById('report-activity-filter-not')?.checked || false,
        statuses: getSelectedValues('report-issue-status-filter'),
        statusesNot: document.getElementById('report-issue-status-filter-not')?.checked || false,
        projectKeys: getSelectedValues('report-project-key-filter'),
        projectKeysNot: document.getElementById('report-project-key-filter-not')?.checked || false,
        servisValues: getSelectedValues('report-servis-filter'),
        servisValuesNot: document.getElementById('report-servis-filter-not')?.checked || false,
        issueSummary: document.getElementById('report-issue-summary-filter')?.value.toLowerCase(),
        issueSummaryNot: document.getElementById('report-issue-summary-not')?.checked || false,
        workDateStart: document.getElementById('report-work-date-start')?.value || '',
        workDateEnd: document.getElementById('report-work-date-end')?.value || ''
    };
    
    // Filter data
    const filteredData = state.timesheetData.filter(row => {
        const fullName = row['Full name'];
        let personData = null;
        
        if (fullName) {
            for (const [personKey, data] of Object.entries(state.people)) {
                if (fullName.includes(personKey)) {
                    personData = { ...data, name: personKey };
                    break;
                }
            }
        }
        
        // Get actual team and project with priority order:
        // 1. Override (manual edit)
        // 2. CSV data (Team/Project columns)
        // 3. Person mapping (fallback)
        let actualTeam = row._overrides?.team || row.Team || personData?.team;
        let actualProject = row._overrides?.project || row.Project || personData?.project;
        
        // Apply filters with NOT logic
        if (filters.projects.length) {
            const isInList = filters.projects.includes(actualProject);
            if (filters.projectsNot ? isInList : !isInList) return false;
        }
        if (filters.teams.length) {
            const isInList = filters.teams.includes(actualTeam);
            if (filters.teamsNot ? isInList : !isInList) return false;
        }
        if (filters.roles.length && personData) {
            const isInList = filters.roles.includes(personData.role);
            if (filters.rolesNot ? isInList : !isInList) return false;
        }
        if (filters.people.length && personData) {
            const isInList = filters.people.includes(personData.name);
            if (filters.peopleNot ? isInList : !isInList) return false;
        }
        if (filters.activities.length) {
            const isInList = filters.activities.includes(row['Activity Name']);
            if (filters.activitiesNot ? isInList : !isInList) return false;
        }
        if (filters.statuses.length) {
            const isInList = filters.statuses.includes(row['Issue Status']);
            if (filters.statusesNot ? isInList : !isInList) return false;
        }
        if (filters.projectKeys.length) {
            const isInList = filters.projectKeys.includes(row['Project Key']);
            if (filters.projectKeysNot ? isInList : !isInList) return false;
        }
        if (filters.servisValues.length) {
            const isInList = filters.servisValues.includes(row['Servis']);
            if (filters.servisValuesNot ? isInList : !isInList) return false;
        }
        
        // Work date filter
        if (filters.workDateStart || filters.workDateEnd) {
            const workDate = row['Work date'];
            if (workDate) {
                const datePart = workDate.split(' ')[0];
                if (filters.workDateStart && datePart < filters.workDateStart) return false;
                if (filters.workDateEnd && datePart > filters.workDateEnd) return false;
            } else {
                return false;
            }
        }
        
        if (filters.issueSummary) {
            const summary = row['Issue summary']?.toLowerCase() || '';
            const matches = summary.includes(filters.issueSummary);
            // If NOT is checked, exclude matches. If NOT is not checked, include only matches.
            if (filters.issueSummaryNot) {
                if (matches) return false; // Exclude if matches
            } else {
                if (!matches) return false; // Exclude if doesn't match
            }
        }
        
        return true;
    });
    
    if (filteredData.length === 0) {
        alert('No data matches the selected filters');
        return;
    }
    
    // Aggregate data by report type
    const aggregated = {};
    
    filteredData.forEach(row => {
        let key;
        const fullName = row['Full name'];
        
        if (state.currentReportType === 'person') {
            // Find person key
            for (const personKey of Object.keys(state.people)) {
                if (fullName && fullName.includes(personKey)) {
                    key = personKey;
                    break;
                }
            }
            if (!key) key = fullName || 'Unknown';
        } else if (state.currentReportType === 'team') {
            // Priority: override > CSV data > person mapping
            if (row._overrides && row._overrides.team) {
                key = row._overrides.team;
            } else if (row.Team) {
                key = row.Team;
            } else {
                for (const [personKey, data] of Object.entries(state.people)) {
                    if (fullName && fullName.includes(personKey)) {
                        key = data.team || 'Unassigned';
                        break;
                    }
                }
                if (!key) key = 'Unassigned';
            }
        } else if (state.currentReportType === 'project') {
            // Priority: override > CSV data > person mapping
            if (row._overrides && row._overrides.project) {
                key = row._overrides.project;
            } else if (row.Project) {
                key = row.Project;
            } else {
                for (const [personKey, data] of Object.entries(state.people)) {
                    if (fullName && fullName.includes(personKey)) {
                        key = data.project || 'Unassigned';
                        break;
                    }
                }
                if (!key) key = 'Unassigned';
            }
        } else if (state.currentReportType === 'role') {
            for (const [personKey, data] of Object.entries(state.people)) {
                if (fullName && fullName.includes(personKey)) {
                    key = data.role || 'Unassigned';
                    break;
                }
            }
            if (!key) key = 'Unassigned';
        } else if (state.currentReportType === 'activity') {
            key = row['Activity Name'] || 'Unknown';
        } else if (state.currentReportType === 'status') {
            key = row['Issue Status'] || 'Unknown';
        } else if (state.currentReportType === 'epic') {
            key = row['Epic'] || 'No Epic';
        } else if (state.currentReportType === 'projectKey') {
            key = row['Project Key'] || 'Unknown';
        } else if (state.currentReportType === 'issueKey') {
            key = row['Issue Key'] || 'Unknown';
        } else if (state.currentReportType === 'servis') {
            const servisNum = row['Servis'];
            key = servisNum ? getServisDisplayName(servisNum) : 'No Service';
        }
        
        if (!aggregated[key]) aggregated[key] = 0;
        aggregated[key] += parseFloat(row.Hours) || 0;
    });
    
    // Sort by hours descending
    const sorted = Object.entries(aggregated)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20); // Top 20
    
    // Store report data for reordering (add visible property)
    state.reportData = sorted.map(([label, value]) => ({ label, value, visible: true }));
    
    console.log('Generated reportData with', state.reportData.length, 'items');
    
    // Also generate time series data for time-based charts
    const granularity = document.getElementById('time-granularity-select')?.value || 'monthly';
    state.timeSeriesData = aggregateByTimePeriod(filteredData, granularity);
    
    renderChart();
    renderReportDataList();
}

function renderChart() {
    const canvas = document.getElementById('report-chart');
    const ctx = canvas.getContext('2d');
    
    // Check chart type
    const chartType = state.currentChartType || 'donut';
    
    if (chartType === 'timeseries') {
        renderTimeSeriesChart();
        return;
    }
    
    // Filter only visible items from state.reportData
    const visibleData = state.reportData.filter(item => item.visible !== false);
    
    if (visibleData.length === 0) {
        // Clear chart if no visible data
        if (state.chart) {
            state.chart.destroy();
            state.chart = null;
        }
        return;
    }
    
    // Destroy existing chart
    if (state.chart) {
        state.chart.destroy();
    }
    
    const labels = visibleData.map(d => d.displayLabel || d.label);
    const values = visibleData.map(d => d.value);
    
    // Get all categories for consistent coloring
    const allCategories = state.reportData.map(d => d.label);
    
    // Get consistent colors for each visible category
    const colors = visibleData.map(d => getCategoryColor(d.label, allCategories));
    
    const total = values.reduce((sum, val) => sum + val, 0);
    
    state.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 4,
                hoverBorderWidth: 6,
                hoverBorderColor: '#f0f0f0',
                offset: 5,
                spacing: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            rotation: state.chartRotation,
            layout: {
                padding: {
                    top: 110,
                    right: 150,
                    bottom: 80,
                    left: 150
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                datalabels: {
                    color: '#1f2937',
                    font: {
                        family: state.chartFontFamily,
                        size: state.chartFontSize,
                        weight: '600'
                    },
                    formatter: function(value, context) {
                        const label = context.chart.data.labels[context.dataIndex];
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}\n${value.toFixed(1)}h (${percentage}%)`;
                    },
                    anchor: 'end',
                    align: 'end',
                    offset: 25,
                    clamp: false,
                    clip: false,
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                    textAlign: 'left'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toFixed(1)}h (${percentage}%)`;
                        }
                    },
                    bodyFont: {
                        family: state.chartFontFamily,
                        size: state.chartFontSize
                    },
                    titleFont: {
                        family: state.chartFontFamily,
                        size: state.chartFontSize + 2
                    }
                }
            }
        },
        plugins: [ChartDataLabels, {
            beforeDraw: function(chart) {
                const ctx = chart.ctx;
                const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                const total = chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold ${state.chartFontSize + 4}px ${state.chartFontFamily}`;
                ctx.fillStyle = '#1f2937';
                ctx.fillText(`${total.toFixed(1)}h`, centerX, centerY);
                ctx.restore();
            }
        }]
    });
}

function renderTimeSeriesChart() {
    const canvas = document.getElementById('report-chart');
    const ctx = canvas.getContext('2d');
    
    if (!state.timeSeriesData || state.timeSeriesData.length === 0) {
        if (state.chart) {
            state.chart.destroy();
            state.chart = null;
        }
        return;
    }
    
    // Destroy existing chart
    if (state.chart) {
        state.chart.destroy();
    }
    
    // Get all unique categories across all periods
    const allCategories = new Set();
    state.timeSeriesData.forEach(period => {
        Object.keys(period.breakdown).forEach(cat => allCategories.add(cat));
    });
    
    // Filter to only top categories from reportData (visible ones)
    const visibleCategories = state.reportData
        .filter(item => item.visible !== false)
        .map(item => item.label);
    
    const categories = Array.from(allCategories).filter(cat => 
        visibleCategories.includes(cat)
    );
    
    if (categories.length === 0) {
        if (state.chart) {
            state.chart.destroy();
            state.chart = null;
        }
        return;
    }
    
    // Get all categories from reportData for consistent coloring
    const allReportCategories = state.reportData.map(d => d.label);
    
    // Prepare datasets - one per category with consistent colors
    const datasets = categories.map((category) => {
        const color = getCategoryColor(category, allReportCategories);
        return {
            label: category,
            data: state.timeSeriesData.map(period => period.breakdown[category] || 0),
            backgroundColor: color,
            borderColor: color,
            borderWidth: 2,
            fill: false
        };
    });
    
    const labels = state.timeSeriesData.map(period => {
        // Format period label based on granularity
        const granularity = document.getElementById('time-granularity-select')?.value || 'monthly';
        if (granularity === 'daily') {
            return period.period; // Already YYYY-MM-DD
        } else if (granularity === 'weekly') {
            // Convert period to week number format "Week 1, 2025"
            const date = new Date(period.period);
            const weekNum = getWeekNumber(date);
            const year = date.getFullYear();
            return `Week ${weekNum}, ${year}`;
        } else if (granularity === 'monthly') {
            const [year, month] = period.period.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        } else if (granularity === 'quarterly') {
            return period.period; // Already YYYY-QX
        }
        return period.period;
    });
    
    state.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        font: {
                            family: state.chartFontFamily,
                            size: state.chartFontSize
                        }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours',
                        font: {
                            family: state.chartFontFamily,
                            size: state.chartFontSize + 2,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            family: state.chartFontFamily,
                            size: state.chartFontSize
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            family: state.chartFontFamily,
                            size: state.chartFontSize
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || 0;
                            return `${label}: ${value.toFixed(1)}h`;
                        },
                        footer: function(tooltipItems) {
                            let sum = 0;
                            tooltipItems.forEach(item => {
                                sum += item.parsed.y;
                            });
                            return `Total: ${sum.toFixed(1)}h`;
                        }
                    },
                    bodyFont: {
                        family: state.chartFontFamily,
                        size: state.chartFontSize
                    },
                    titleFont: {
                        family: state.chartFontFamily,
                        size: state.chartFontSize + 2
                    },
                    footerFont: {
                        family: state.chartFontFamily,
                        size: state.chartFontSize,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

function updateChartLegend(labels, values, colors) {
    const legendDiv = document.getElementById('chart-legend');
    
    const total = values.reduce((sum, v) => sum + v, 0);
    
    legendDiv.innerHTML = `
        <h3>Legend</h3>
        <div class="legend-items">
            ${labels.map((label, idx) => {
                const percent = total > 0 ? ((values[idx] / total) * 100).toFixed(1) : 0;
                return `
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: ${colors[idx % colors.length]}"></span>
                        <span class="legend-label">${escapeHtml(label)}</span>
                        <span class="legend-value">${values[idx].toFixed(1)}h (${percent}%)</span>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="legend-total">Total: ${total.toFixed(1)} hours</div>
    `;
}

function populateThemeSelector() {
    const select = document.getElementById('theme-select');
    if (!select) return;
    
    select.innerHTML = Object.keys(chartThemes)
        .map(theme => `<option value="${theme}">${theme}</option>`)
        .join('');
    
    // Set default theme
    if (!select.value) {
        select.value = 'Default';
    }
}

function renderReportDataList() {
    const dataList = document.getElementById('report-data-list');
    if (!dataList) {
        console.warn('report-data-list element not found');
        return;
    }
    
    if (!state.reportData || state.reportData.length === 0) {
        dataList.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 20px;">Generate a report to see data points</p>';
        return;
    }
    
    dataList.innerHTML = '';
    
    state.reportData.forEach((item, index) => {
        const dataItem = document.createElement('div');
        dataItem.className = 'report-data-item';
        if (item.visible === false) {
            dataItem.classList.add('hidden-item');
        }
        dataItem.draggable = true;
        dataItem.dataset.index = index;
        
        // Drag event listeners
        dataItem.addEventListener('dragstart', handleReportDragStart);
        dataItem.addEventListener('dragover', handleReportDragOver);
        dataItem.addEventListener('drop', handleReportDrop);
        dataItem.addEventListener('dragend', handleReportDragEnd);
        dataItem.addEventListener('dragenter', handleReportDragEnter);
        dataItem.addEventListener('dragleave', handleReportDragLeave);
        
        // Calculate percentage from all items (not just visible)
        const total = state.reportData.reduce((sum, d) => sum + d.value, 0);
        const percentage = ((item.value / total) * 100).toFixed(1);
        
        // Get current color for this category
        const allCategories = state.reportData.map(d => d.label);
        const currentColor = getCategoryColor(item.label, allCategories);
        
        const visibilityIcon = item.visible === false ? '👁️' : '👁️‍🗨️';
        const visibilityTitle = item.visible === false ? 'Show in chart' : 'Hide from chart';
        
        dataItem.innerHTML = `
            <div class="report-data-item-content">
                <input type="color" class="color-picker" data-index="${index}" value="${currentColor}" title="Change color">
                <span class="report-data-item-number">${index + 1}.</span>
                <span class="report-data-item-label">${escapeHtml(item.displayLabel || item.label)}</span>
                <span class="report-data-item-value">${item.value.toFixed(1)}h (${percentage}%)</span>
            </div>
            <div class="report-data-item-actions">
                <button class="btn-icon label-edit" data-index="${index}" title="Edit label">✏️</button>
                <button class="btn-icon visibility-toggle" data-index="${index}" title="${visibilityTitle}">${visibilityIcon}</button>
                <div class="report-data-item-drag">⋮⋮</div>
            </div>
        `;
        
        // Add color picker handler
        const colorPicker = dataItem.querySelector('.color-picker');
        colorPicker.addEventListener('change', (e) => {
            e.stopPropagation();
            changeCategoryColor(item.label, e.target.value);
        });
        
        // Add visibility toggle handler
        const toggleBtn = dataItem.querySelector('.visibility-toggle');
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDataPointVisibility(index);
        });
        
        // Add label edit handler
        const editBtn = dataItem.querySelector('.label-edit');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editDataPointLabel(index);
        });
        
        dataList.appendChild(dataItem);
    });
}

function changeCategoryColor(category, newColor) {
    // Save the custom color
    state.categoryColors[category] = newColor;
    // Re-render chart with new color
    renderChart();
    // Re-render data list to update all items
    renderReportDataList();
}

function toggleDataPointVisibility(index) {
    if (state.reportData[index]) {
        state.reportData[index].visible = !state.reportData[index].visible;
        renderChart();
        renderReportDataList();
    }
}

function editDataPointLabel(index) {
    const item = state.reportData[index];
    if (!item) return;
    
    const currentLabel = item.displayLabel || item.label;
    const newLabel = prompt('Edit label for chart display:', currentLabel);
    
    if (newLabel !== null && newLabel.trim() !== '') {
        state.reportData[index].displayLabel = newLabel.trim();
        renderChart();
        renderReportDataList();
    }
}

// Drag and drop handlers for report data list
let draggedReportIndex = null;

function handleReportDragStart(e) {
    draggedReportIndex = parseInt(e.currentTarget.dataset.index);
    e.currentTarget.style.opacity = '0.4';
}

function handleReportDragOver(e) {
    e.preventDefault();
    return false;
}

function handleReportDragEnter(e) {
    e.currentTarget.classList.add('drag-over');
}

function handleReportDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleReportDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const dropIndex = parseInt(e.currentTarget.dataset.index);
    
    if (draggedReportIndex !== null && draggedReportIndex !== dropIndex) {
        // Reorder data
        const item = state.reportData.splice(draggedReportIndex, 1)[0];
        state.reportData.splice(dropIndex, 0, item);
        
        // Re-render
        renderChart();
        renderReportDataList();
    }
    
    e.currentTarget.classList.remove('drag-over');
    return false;
}

function handleReportDragEnd(e) {
    e.currentTarget.style.opacity = '';
    document.querySelectorAll('.report-data-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedReportIndex = null;
}

function adjustFontSize(delta) {
    state.chartFontSize += delta;
    if (state.chartFontSize < 8) state.chartFontSize = 8;
    if (state.chartFontSize > 24) state.chartFontSize = 24;
    
    // Update display
    const fontSizeDisplay = document.getElementById('font-size-display');
    if (fontSizeDisplay) {
        fontSizeDisplay.textContent = state.chartFontSize;
    }
    
    // Update font family
    state.chartFontFamily = document.getElementById('font-family-select').value;
    
    if (state.reportData.length > 0) {
        renderChart(); // Re-render chart with new font size
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// IMPORT VALIDATION MODAL
// ============================================

function showImportValidationModal(validData, filename) {
    const modal = document.getElementById('validation-modal');
    const { skippedRows, headers, totalLines, validRows, invalidRows } = state.importValidation;
    
    // Build summary
    const summaryHtml = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid ${invalidRows > 0 ? '#f39c12' : '#10b981'};">
            <h3 style="margin-top: 0;">📊 Import Summary - ${escapeHtml(filename)}</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 10px;">
                <div><strong>Total Lines:</strong> ${totalLines}</div>
                <div style="color: #10b981;"><strong>✓ Valid Rows:</strong> ${validRows}</div>
                <div style="color: #ef4444;"><strong>✗ Skipped Rows:</strong> ${invalidRows}</div>
                <div><strong>Columns:</strong> ${headers.length}</div>
            </div>
            ${invalidRows > 0 ? `
                <div style="margin-top: 10px; padding: 10px; background: #fef3c7; border-radius: 4px;">
                    ⚠️ <strong>Warning:</strong> ${invalidRows} row(s) could not be imported due to formatting issues.
                    You can review and fix them below, or proceed with the valid rows only.
                </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('validation-summary').innerHTML = summaryHtml;
    
    // Build skipped rows table
    if (invalidRows > 0) {
        const skippedHtml = `
            <table class="entity-table" style="font-size: 12px;">
                <thead>
                    <tr>
                        <th style="width: 60px;">Line #</th>
                        <th style="width: 120px;">Expected Cols</th>
                        <th style="width: 120px;">Actual Cols</th>
                        <th>Reason</th>
                        <th style="min-width: 400px;">Raw Data (First 200 chars)</th>
                    </tr>
                </thead>
                <tbody>
                    ${skippedRows.map(row => `
                        <tr>
                            <td>${row.lineNumber}</td>
                            <td>${row.expectedColumns}</td>
                            <td>${row.actualColumns}</td>
                            <td style="color: #ef4444;">${escapeHtml(row.reason)}</td>
                            <td style="font-family: monospace; font-size: 11px; word-break: break-all;">
                                ${escapeHtml(row.rawLine.substring(0, 200))}${row.rawLine.length > 200 ? '...' : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('skipped-rows-container').innerHTML = skippedHtml;
    } else {
        document.getElementById('skipped-rows-container').innerHTML = '<p>✅ No skipped rows - all data is valid!</p>';
    }
    
    // Build valid rows preview (first 20 rows)
    const previewRows = validData.slice(0, 20);
    const validHtml = `
        <p style="margin-bottom: 10px;"><em>Showing first 20 of ${validRows} valid rows</em></p>
        <table class="entity-table" style="font-size: 11px;">
            <thead>
                <tr>
                    ${headers.slice(0, 10).map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                    ${headers.length > 10 ? '<th>...</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${previewRows.map(row => `
                    <tr>
                        ${headers.slice(0, 10).map(h => `<td>${escapeHtml(String(row[h] || '').substring(0, 50))}</td>`).join('')}
                        ${headers.length > 10 ? '<td>...</td>' : ''}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('valid-rows-preview').innerHTML = validHtml;
    
    // Setup event listeners
    document.getElementById('validation-modal-close').onclick = closeValidationModal;
    document.getElementById('validation-cancel').onclick = closeValidationModal;
    document.getElementById('validation-proceed').onclick = async () => {
        await finalizeImport(validData);
        closeValidationModal();
    };
    
    // Tab switching
    document.querySelectorAll('[data-validation-tab]').forEach(btn => {
        btn.onclick = () => switchValidationTab(btn.dataset.validationTab);
    });
    
    // Export skipped rows
    document.getElementById('export-skipped-btn').onclick = exportSkippedRows;
    document.getElementById('auto-fix-btn').onclick = () => {
        alert('Auto-fix feature coming soon! For now, please manually correct the CSV file and re-import.');
    };
    
    modal.style.display = 'flex';
}

function switchValidationTab(tabName) {
    document.querySelectorAll('[data-validation-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.validationTab === tabName);
    });
    
    document.getElementById('validation-tab-skipped').style.display = tabName === 'skipped' ? 'block' : 'none';
    document.getElementById('validation-tab-valid').style.display = tabName === 'valid' ? 'block' : 'none';
}

function closeValidationModal() {
    document.getElementById('validation-modal').style.display = 'none';
}

function exportSkippedRows() {
    const { skippedRows, headers } = state.importValidation;
    
    if (skippedRows.length === 0) {
        alert('No skipped rows to export');
        return;
    }
    
    // Create CSV with skipped row information
    let csv = 'Line Number,Expected Columns,Actual Columns,Reason,Raw Data\n';
    
    skippedRows.forEach(row => {
        const rawDataEscaped = row.rawLine.replace(/"/g, '""');
        csv += `${row.lineNumber},${row.expectedColumns},${row.actualColumns},"${row.reason}","${rawDataEscaped}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skipped-rows-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert(`Exported ${skippedRows.length} skipped rows to CSV`);
}

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================

window.editProject = editProject;
window.deleteProject = deleteProject;
window.editTeam = editTeam;
window.deleteTeam = deleteTeam;
window.editRole = editRole;
window.deleteRole = deleteRole;
window.editPerson = editPerson;
window.deletePerson = deletePerson;
window.changePage = changePage;
