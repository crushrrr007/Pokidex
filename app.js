// PokeAPI Configuration
const API_BASE = "https://pokeapi.co/api/v2";
let POKEMON_PER_PAGE = 20;

// State
let currentPage = 1;
let totalPokemon = 0;
let allPokemon = [];
let filteredPokemon = [];
let currentTypeFilter = "";
let allTypes = [];

// DOM Elements - will be initialized after DOM loads
let pokemonGrid, searchInput, searchBtn, prevBtn, nextBtn, firstBtn, lastBtn, loading;
let pageNumbersContainer, resultsInfo, perPageSelect;
let modal, modalBody, modalClose, modalOverlay;
let comparisonSection,
  comparePokemon1,
  comparePokemon2,
  compareExecuteBtn,
  comparisonResult;
let sidebar,
  sidebarToggle,
  mobileMenuBtn,
  filterTypesContainer,
  closeComparisonBtn,
  backToTopBtn;
let navItems, sidebarPanels;

// Initialize DOM elements
function initDOMElements() {
  pokemonGrid = document.getElementById("pokemon-grid");
  searchInput = document.getElementById("search-input");
  searchBtn = document.getElementById("search-btn");
  prevBtn = document.getElementById("prev-btn");
  nextBtn = document.getElementById("next-btn");
  firstBtn = document.getElementById("first-btn");
  lastBtn = document.getElementById("last-btn");
  pageNumbersContainer = document.getElementById("page-numbers");
  resultsInfo = document.getElementById("results-info");
 
  // Custom Dropdown Elements
  perPageSelect = document.getElementById("per-page-dropdown"); // Wrapper
 
  loading = document.getElementById("loading");
  modal = document.getElementById("modal");
  modalBody = document.getElementById("modal-body");
  modalClose = document.getElementById("modal-close-btn");
  modalOverlay = document.getElementById("modal-overlay");
  comparisonSection = document.getElementById("comparison-section");
  comparePokemon1 = document.getElementById("compare-pokemon1");
  comparePokemon2 = document.getElementById("compare-pokemon2");
  compareExecuteBtn = document.getElementById("compare-execute-btn");
  comparisonResult = document.getElementById("comparison-result");
  closeComparisonBtn = document.getElementById("close-comparison");
  backToTopBtn = document.getElementById("back-to-top");

  // Sidebar elements
  sidebar = document.getElementById("sidebar");
  sidebarToggle = document.getElementById("sidebar-toggle");
  mobileMenuBtn = document.getElementById("mobile-menu-btn");
  filterTypesContainer = document.getElementById("filter-types");
  navItems = document.querySelectorAll(".nav-item");
  sidebarPanels = document.querySelectorAll(".sidebar-panel");
}

// Initialize the app
async function init() {
  initDOMElements();
  await loadTypes();
  await loadAllPokemon();
  setupEventListeners();
  setupSidebar();
  setupCustomDropdowns();
}

function setupCustomDropdowns() {
  // Per Page Dropdown
  const perPageDropdown = document.getElementById('per-page-dropdown');
  if (perPageDropdown) {
    const selected = perPageDropdown.querySelector('.dropdown-selected-btn');
    const optionsContainer = perPageDropdown.querySelector('.dropdown-options');
    const options = perPageDropdown.querySelectorAll('.dropdown-option');
    const selectedText = selected.querySelector('span');

    // Toggle dropdown
    selected.addEventListener('click', (e) => {
      e.stopPropagation();
      perPageDropdown.classList.toggle('open');
    });

    // Handle option click
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.dataset.value;
       
        // Update UI
        selectedText.textContent = `Per Page: ${value}`;
        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        perPageDropdown.classList.remove('open');
       
        // Update logic
        POKEMON_PER_PAGE = parseInt(value);
        currentPage = 1;
        displayPokemonPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!perPageDropdown.contains(e.target)) {
        perPageDropdown.classList.remove('open');
      }
    });
  }
}

// Load all Pokemon types for the filter buttons
async function loadTypes() {
  try {
    const response = await fetch(`${API_BASE}/type`);
    const data = await response.json();

    allTypes = data.results.filter(
      (type) => !["unknown", "shadow"].includes(type.name),
    );

    // Create filter buttons
    if (filterTypesContainer) {
      allTypes.forEach((type) => {
        const btn = document.createElement("button");
        btn.className = "type-filter-btn";
        btn.dataset.type = type.name;
        btn.textContent = capitalizeFirst(type.name);
        btn.addEventListener("click", () => handleTypeFilterClick(type.name));
        filterTypesContainer.appendChild(btn);
      });
    }
  } catch (error) {
    console.error("Error loading types:", error);
  }
}

// Load all Pokemon (basic info)
async function loadAllPokemon() {
  try {
    const response = await fetch(`${API_BASE}/pokemon?limit=1000&offset=0`);
    const data = await response.json();

    totalPokemon = data.count;
    allPokemon = data.results.map((pokemon, index) => ({
      ...pokemon,
      id: index + 1,
    }));
    filteredPokemon = [...allPokemon];

    displayPokemonPage();
  } catch (error) {
    console.error("Error loading Pokemon:", error);
    pokemonGrid.innerHTML =
      '<div class="error-message">Failed to load Pokemon. Please try again later.</div>';
  }
}

// Display current page of Pokemon
async function displayPokemonPage() {
  // Show skeletons immediately
  showSkeletons();
 
  const startIndex = (currentPage - 1) * POKEMON_PER_PAGE;
  const endIndex = startIndex + POKEMON_PER_PAGE;
  const pokemonToShow = filteredPokemon.slice(startIndex, endIndex);
 
  if (pokemonToShow.length === 0) {
    pokemonGrid.innerHTML = '<div class="no-results"><h3>No Pokemon found</h3><p>Try adjusting your search or filter.</p></div>';
    updatePagination();
    return;
  }
 
  // Fetch details for each Pokemon in parallel
  const pokemonDetails = await Promise.all(
    pokemonToShow.map(pokemon => fetchPokemonDetails(pokemon.name))
  );
 
  // Clear grid before appending real cards
  pokemonGrid.innerHTML = '';
 
  pokemonDetails.forEach((pokemon, index) => {
    if (pokemon) {
      const card = createPokemonCard(pokemon);
      // Staggered animation delay
      card.style.animationDelay = `${index * 50}ms`;
      pokemonGrid.appendChild(card);
    }
  });
 
  updatePagination();
}

function showSkeletons() {
  pokemonGrid.innerHTML = '';
  for (let i = 0; i < POKEMON_PER_PAGE; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-types">
        <div class="skeleton-type"></div>
        <div class="skeleton-type"></div>
      </div>
    `;
    pokemonGrid.appendChild(skeleton);
  }
}

// Fetch detailed Pokemon data
async function fetchPokemonDetails(nameOrId) {
  try {
    const response = await fetch(
      `${API_BASE}/pokemon/${nameOrId.toString().toLowerCase()}`,
    );
    if (!response.ok) throw new Error("Pokemon not found");
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${nameOrId}:`, error);
    return null;
  }
}

// Create a Pokemon card element
function createPokemonCard(pokemon) {
  const card = document.createElement("div");
  card.className = "pokemon-card";
  card.onclick = () => showPokemonDetail(pokemon.id);

  const sprite =
    pokemon.sprites.other?.["official-artwork"]?.front_default ||
    pokemon.sprites.front_default;

  const typesHTML = pokemon.types
    .map(
      (t) =>
        `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`,
    )
    .join("");

  card.innerHTML = `
        <span class="pokemon-id">#${pokemon.id.toString().padStart(3, "0")}</span>
        <img src="${sprite}" alt="${pokemon.name}" loading="lazy">
        <h3>${pokemon.name}</h3>
        <div class="types">${typesHTML}</div>
    `;

  return card;
}

// Show Pokemon detail modal
async function showPokemonDetail(pokemonId) {
  openModal();
  modalBody.innerHTML =
    '<div class="loading"><div class="pokeball-loader"></div><p>Loading...</p></div>';

  try {
    const pokemon = await fetchPokemonDetails(pokemonId);
    if (!pokemon) throw new Error("Failed to load Pokemon");

    const sprite =
      pokemon.sprites.other?.["official-artwork"]?.front_default ||
      pokemon.sprites.front_default;

    const typesHTML = pokemon.types
      .map(
        (t) =>
          `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`,
      )
      .join("");

    const statsHTML = pokemon.stats
      .map((stat) => {
        const percentage = Math.min((stat.base_stat / 255) * 100, 100);
        const color = getStatColor(stat.base_stat);
        return `
                <div class="stat-item">
                    <span class="stat-name">${formatStatName(stat.stat.name)}</span>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
                    </div>
                    <span class="stat-value">${stat.base_stat}</span>
                </div>
            `;
      })
      .join("");

    const abilitiesHTML = pokemon.abilities
      .map(
        (a) =>
          `<span class="ability-badge">${a.ability.name.replace("-", " ")}${a.is_hidden ? " (Hidden)" : ""}</span>`,
      )
      .join("");

    const movesHTML = pokemon.moves
      .slice(0, 20)
      .map(
        (m) =>
          `<span class="move-badge">${m.move.name.replace(/-/g, " ")}</span>`,
      )
      .join("");

    const spritesHTML = Object.entries(pokemon.sprites)
      .filter(([key, value]) => value && typeof value === "string")
      .slice(0, 8)
      .map(
        ([key, url]) =>
          `<img src="${url}" alt="${key}" title="${key.replace(/_/g, " ")}">`,
      )
      .join("");

    modalBody.innerHTML = `
            <div class="pokemon-detail">
                <div class="detail-header">
                    <img src="${sprite}" alt="${pokemon.name}">
                    <span class="pokemon-number">#${pokemon.id.toString().padStart(3, "0")}</span>
                    <h2>${pokemon.name}</h2>
                    <div class="types">${typesHTML}</div>
                </div>
               
                <div class="detail-section">
                    <h4>Basic Info</h4>
                    <div class="detail-info">
                        <div>
                            <span>Height</span>
                            <span>${(pokemon.height / 10).toFixed(1)} m</span>
                        </div>
                        <div>
                            <span>Weight</span>
                            <span>${(pokemon.weight / 10).toFixed(1)} kg</span>
                        </div>
                        <div>
                            <span>Base Experience</span>
                            <span>${pokemon.base_experience || "N/A"}</span>
                        </div>
                        <div>
                            <span>Species</span>
                            <span>${capitalizeFirst(pokemon.species.name)}</span>
                        </div>
                    </div>
                </div>
               
                <div class="detail-section">
                    <h4>Base Stats</h4>
                    <div class="stats-grid">${statsHTML}</div>
                </div>
               
                <div class="detail-section">
                    <h4>Abilities</h4>
                    <div class="abilities-list">${abilitiesHTML}</div>
                </div>
               
                <div class="detail-section">
                    <h4>Moves (showing first 20)</h4>
                    <div class="moves-list">${movesHTML}</div>
                </div>
               
                <div class="detail-section">
                    <h4>Sprites</h4>
                    <div class="sprites-grid">${spritesHTML}</div>
                </div>
            </div>
        `;
  } catch (error) {
    modalBody.innerHTML =
      '<div class="error-message">Failed to load Pokemon details.</div>';
  }
}

// Search Pokemon
async function searchPokemon() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    filteredPokemon = currentTypeFilter
      ? await filterByType(currentTypeFilter)
      : [...allPokemon];
    currentPage = 1;
    displayPokemonPage();
    return;
  }

  // Check if it's an exact match (name or ID)
  const exactMatch = allPokemon.find(
    (p) => p.name === query || p.id.toString() === query,
  );

  if (exactMatch) {
    const pokemon = await fetchPokemonDetails(query);
    if (pokemon) {
      showPokemonDetail(pokemon.id);
      return;
    }
  }

  // Filter by partial name match
  filteredPokemon = allPokemon.filter(
    (p) => p.name.includes(query) || p.id.toString().includes(query),
  );

  if (currentTypeFilter) {
    const typeFiltered = await filterByType(currentTypeFilter);
    const typeFilteredNames = new Set(typeFiltered.map((p) => p.name));
    filteredPokemon = filteredPokemon.filter((p) =>
      typeFilteredNames.has(p.name),
    );
  }

  currentPage = 1;
  displayPokemonPage();
}

// Filter Pokemon by type
async function filterByType(typeName) {
  if (!typeName) return [...allPokemon];

  try {
    const response = await fetch(`${API_BASE}/type/${typeName}`);
    const data = await response.json();

    const pokemonOfType = data.pokemon.map((p) => p.pokemon.name);
    return allPokemon.filter((p) => pokemonOfType.includes(p.name));
  } catch (error) {
    console.error("Error filtering by type:", error);
    return [...allPokemon];
  }
}

// Compare two Pokemon
async function comparePokemon() {
  const pokemon1Name = comparePokemon1.value.trim().toLowerCase();
  const pokemon2Name = comparePokemon2.value.trim().toLowerCase();

  if (!pokemon1Name || !pokemon2Name) {
    comparisonResult.innerHTML =
      '<div class="error-message">Please enter two Pokemon to compare.</div>';
    return;
  }

  comparisonResult.innerHTML =
    '<div class="loading"><div class="pokeball-loader"></div><p>Loading comparison...</p></div>';

  try {
    const [pokemon1, pokemon2] = await Promise.all([
      fetchPokemonDetails(pokemon1Name),
      fetchPokemonDetails(pokemon2Name),
    ]);

    if (!pokemon1 || !pokemon2) {
      throw new Error("One or both Pokemon not found");
    }

    const total1 = pokemon1.stats.reduce((sum, s) => sum + s.base_stat, 0);
    const total2 = pokemon2.stats.reduce((sum, s) => sum + s.base_stat, 0);

    comparisonResult.innerHTML = `
            ${createCompareCard(pokemon1, total1 > total2)}
            ${createCompareCard(pokemon2, total2 > total1)}
        `;
  } catch (error) {
    comparisonResult.innerHTML =
      '<div class="error-message">Failed to compare Pokemon. Please check the names/IDs and try again.</div>';
  }
}

// Create comparison card
function createCompareCard(pokemon, isWinner) {
  const sprite =
    pokemon.sprites.other?.["official-artwork"]?.front_default ||
    pokemon.sprites.front_default;

  const typesHTML = pokemon.types
    .map(
      (t) =>
        `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`,
    )
    .join("");

  const statsHTML = pokemon.stats
    .map((stat) => {
      const percentage = Math.min((stat.base_stat / 255) * 100, 100);
      const color = getStatColor(stat.base_stat);
      return `
            <div class="stat-row">
                <span class="stat-name">${formatStatName(stat.stat.name)}</span>
                <div class="stat-bar">
                    <div class="stat-fill" style="width: ${percentage}%; background: ${color};"></div>
                </div>
                <span class="stat-value">${stat.base_stat}</span>
            </div>
        `;
    })
    .join("");

  const totalStats = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);

  return `
        <div class="compare-card ${isWinner ? "winner" : ""}">
            <img src="${sprite}" alt="${pokemon.name}">
            <h3>${pokemon.name} ${isWinner ? "(Winner!)" : ""}</h3>
            <div class="types" style="display:flex;justify-content:center;gap:0.5rem;margin:0.5rem 0;">${typesHTML}</div>
            <p style="text-align:center;color:#666;">Total Base Stats: <strong>${totalStats}</strong></p>
            <div class="stat-comparison">${statsHTML}</div>
        </div>
    `;
}

// Update pagination controls
function updatePagination() {
  const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
  const startItem = (currentPage - 1) * POKEMON_PER_PAGE + 1;
  const endItem = Math.min(currentPage * POKEMON_PER_PAGE, filteredPokemon.length);
 
  // Update results info
  if (filteredPokemon.length === 0) {
    resultsInfo.textContent = "No Pokemon found";
  } else {
    resultsInfo.textContent = `Showing ${startItem}-${endItem} of ${filteredPokemon.length} Pokemon`;
  }

  // Update button states
  prevBtn.disabled = currentPage <= 1;
  firstBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
  lastBtn.disabled = currentPage >= totalPages;

  // Generate page numbers
  generatePageNumbers(totalPages);
}

function generatePageNumbers(totalPages) {
  pageNumbersContainer.innerHTML = '';
 
  if (totalPages <= 1) return;

  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Add first page and ellipsis if needed
  if (startPage > 1) {
    addPageButton(1);
    if (startPage > 2) {
      addEllipsis();
    }
  }

  // Add page numbers
  for (let i = startPage; i <= endPage; i++) {
    addPageButton(i);
  }

  // Add last page and ellipsis if needed
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      addEllipsis();
    }
    addPageButton(totalPages);
  }
}

function addPageButton(pageNum) {
  const btn = document.createElement('button');
  btn.className = `page-num ${pageNum === currentPage ? 'active' : ''}`;
  btn.textContent = pageNum;
  btn.addEventListener('click', () => {
    if (currentPage !== pageNum) {
      currentPage = pageNum;
      displayPokemonPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  pageNumbersContainer.appendChild(btn);
}

function addEllipsis() {
  const span = document.createElement('span');
  span.className = 'page-num ellipsis';
  span.textContent = '...';
  pageNumbersContainer.appendChild(span);
}

// Setup event listeners
function setupEventListeners() {
  if (searchBtn) {
    searchBtn.addEventListener("click", searchPokemon);
  }
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") searchPokemon();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        displayPokemonPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
      if (currentPage < totalPages) {
        currentPage++;
        displayPokemonPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (firstBtn) {
    firstBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage = 1;
        displayPokemonPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (lastBtn) {
    lastBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
      if (currentPage < totalPages) {
        currentPage = totalPages;
        displayPokemonPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  // Back to Top Button
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
   
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add("visible");
      } else {
        backToTopBtn.classList.remove("visible");
      }
    });
  }

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      displayPokemonPage();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredPokemon.length / POKEMON_PER_PAGE);
    if (currentPage < totalPages) {
      currentPage++;
      displayPokemonPage();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // Modal close button
  if (modalClose) {
    modalClose.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }

  // Modal overlay (background) click
  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  }

  // Escape key to close modal
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });

  // Compare button
  if (compareExecuteBtn) {
    compareExecuteBtn.addEventListener("click", comparePokemon);
  }
  if (comparePokemon1) {
    comparePokemon1.addEventListener("keypress", (e) => {
      if (e.key === "Enter") comparePokemon();
    });
  }
  if (comparePokemon2) {
    comparePokemon2.addEventListener("keypress", (e) => {
      if (e.key === "Enter") comparePokemon();
    });
  }

  // Close comparison button
  if (closeComparisonBtn) {
    closeComparisonBtn.addEventListener("click", () => {
      comparisonSection.classList.add("hidden");
    });
  }
}

// Setup Sidebar
function setupSidebar() {
  // Toggle sidebar collapse
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-collapsed");
    });
  }

  // Mobile menu toggle
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // Navigation items
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.dataset.section;

      // Update active nav item
      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      // Show corresponding panel
      sidebarPanels.forEach((panel) => panel.classList.remove("active"));
      const targetPanel = document.getElementById(`panel-${section}`);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }

      // If compare is selected, show comparison section
      if (section === "compare") {
        comparisonSection.classList.remove("hidden");
      }
    });
  });

  // Close sidebar on outside click (mobile)
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 1024) {
      if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    }
  });
}

// Handle type filter button click
async function handleTypeFilterClick(typeName) {
    // Update active button
    const buttons = filterTypesContainer.querySelectorAll('.type-filter-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === typeName || (typeName === '' && btn.dataset.type === ''));
    });
   
    currentTypeFilter = typeName;
    // showLoading(); // Removed, handled by displayPokemonPage skeletons
   
    if (typeName) {
        filteredPokemon = await filterByType(typeName);
    } else {
        filteredPokemon = [...allPokemon];
    }
   
    // Apply search filter if exists
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
        filteredPokemon = filteredPokemon.filter(p =>
            p.name.includes(query) || p.id.toString().includes(query)
        );
    }
   
    currentPage = 1;
    displayPokemonPage();
   
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 1024) {
        sidebar.classList.remove('open');
    }
}

// Utility functions
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatStatName(name) {
  const statNames = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    speed: "Speed",
  };
  return statNames[name] || capitalizeFirst(name);
}

function getStatColor(value) {
  if (value < 50) return "#f44336";
  if (value < 80) return "#ff9800";
  if (value < 100) return "#ffeb3b";
  if (value < 130) return "#8bc34a";
  return "#4caf50";
}

// Modal control functions
function openModal() {
  modal.classList.remove("hidden");
  // Stop Lenis scrolling when modal is open
  if (window.lenis) {
    window.lenis.stop();
  }
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (modal) {
    modal.classList.add("hidden");
  }
  // Resume Lenis scrolling when modal is closed
  if (window.lenis) {
    window.lenis.start();
  }
  document.body.style.overflow = "";
}

// Initialize Lenis smooth scroll
function initLenis() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: "vertical",
    gestureDirection: "vertical",
    smooth: true,
    smoothTouch: false,
    touchMultiplier: 2,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  // Store lenis instance globally for scroll control
  window.lenis = lenis;
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initLenis();
  init();
});
