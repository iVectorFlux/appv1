/**
 * InteractEd — Frontend Dashboard & Player Application
 */

// State
let allArtifacts = [];
let allTopics = [];
let allInteractives = [];
let interactiveStats = null;
let activeTab = 'testing';
let selectedSubject = '';
let selectedGrade = '';
let searchQuery = '';
let selectedTopicGrade = '';
let selectedTopicSubject = '';
let topicSearchQuery = '';
let selectedTestGrade = '';
let selectedTestSubject = '';
let selectedTestStatus = '';
let testSearchQuery = '';
let currentArtifact = null;
let embedFormat = 'iframe';

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupFilters();
  setupInteractiveTesting();
  setupTopics();
  setupModals();
  loadArtifacts();
  loadTopics();
  loadInteractives();

  const urlTab = new URLSearchParams(window.location.search).get('tab');
  if (urlTab) {
    document.querySelector(`.nav-tab[data-tab="${urlTab}"]`)?.click();
  }
});

// Navigation Tabs
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      switchView(target);
    });
  });

  document.getElementById('btnResetFilters')?.addEventListener('click', () => {
    selectedSubject = '';
    selectedGrade = '';
    searchQuery = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('gradeSelect').value = '';
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.pill[data-subject=""]').classList.add('active');
    filterAndRenderArtifacts();
  });
}

function switchView(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  if (tabName === 'testing') {
    document.getElementById('viewTesting').classList.add('active');
    loadInteractives();
  } else if (tabName === 'gallery') {
    document.getElementById('viewGallery').classList.add('active');
    loadArtifacts();
  } else if (tabName === 'topics') {
    document.getElementById('viewTopics').classList.add('active');
    if (allTopics.length === 0) loadTopics();
    else filterAndRenderTopics();
  }
}

// ============================================================
// ARTIFACTS API & GALLERY
// ============================================================
async function loadArtifacts() {
  try {
    const res = await fetch('/api/artifacts');
    const data = await res.json();
    if (data.success) {
      allArtifacts = data.artifacts;
      document.getElementById('artifactCountDisplay').textContent = `${allArtifacts.length} Artifacts`;
      filterAndRenderArtifacts();
    }
  } catch (err) {
    showToast('Failed to load artifacts: ' + err.message, 'error');
  }
}

function setupFilters() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');
  const subjectPills = document.querySelectorAll('.pill');
  const gradeSelect = document.getElementById('gradeSelect');

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    clearBtn.style.display = searchQuery ? 'block' : 'none';
    filterAndRenderArtifacts();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearBtn.style.display = 'none';
    filterAndRenderArtifacts();
  });

  subjectPills.forEach(pill => {
    pill.addEventListener('click', () => {
      subjectPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedSubject = pill.getAttribute('data-subject');
      filterAndRenderArtifacts();
    });
  });

  gradeSelect.addEventListener('change', (e) => {
    selectedGrade = e.target.value;
    filterAndRenderArtifacts();
  });
}

function filterAndRenderArtifacts() {
  const filtered = allArtifacts.filter(art => {
    const matchSubject = !selectedSubject || (art.subject && art.subject.toLowerCase() === selectedSubject.toLowerCase());
    const matchGrade = !selectedGrade || 
      art.grade_level === selectedGrade ||
      (selectedGrade === 'K-2' && (art.grade_level === 'Class 1' || art.grade_level === 'Class 2')) ||
      (selectedGrade === '3-5' && (art.grade_level === 'Class 3' || art.grade_level === 'Class 4' || art.grade_level === 'Class 5')) ||
      (selectedGrade === '6-8' && (art.grade_level === 'Class 6' || art.grade_level === 'Class 7' || art.grade_level === 'Class 8')) ||
      (selectedGrade === '9-12' && (art.grade_level === 'Class 9' || art.grade_level === 'Class 10' || art.grade_level === 'Class 11' || art.grade_level === 'Class 12'));
    const matchSearch = !searchQuery ||
      art.title.toLowerCase().includes(searchQuery) ||
      (art.description && art.description.toLowerCase().includes(searchQuery)) ||
      (art.tags && art.tags.some(t => t.toLowerCase().includes(searchQuery)));

    return matchSubject && matchGrade && matchSearch;
  });

  renderArtifactsGrid(filtered);
}

function renderArtifactsGrid(artifacts) {
  const grid = document.getElementById('artifactsGrid');
  const emptyState = document.getElementById('emptyState');

  if (artifacts.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  grid.innerHTML = artifacts.map(art => {
    const previewUrl = `/preview/${art.id}`;
    const tagsHtml = (art.tags || []).slice(0, 3).map(t => `<span class="tag-item">${escapeHtml(t)}</span>`).join('');
    
    return `
      <div class="artifact-card" data-id="${art.id}">
        <div class="card-preview-wrap" onclick="openPlayerModal('${art.id}')">
          <iframe class="card-iframe-preview" src="${previewUrl}" loading="lazy" scrolling="no"></iframe>
          <div class="card-overlay">
            <div class="overlay-play-btn">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="card-header-row">
            <div class="badge-group">
              <span class="badge badge-subject">${escapeHtml(art.subject || 'General')}</span>
              <span class="badge badge-grade">${escapeHtml(art.grade_level || 'K-12')}</span>
            </div>
          </div>
          <h3 class="card-title">${escapeHtml(art.title)}</h3>
          <p class="card-description">${escapeHtml(art.description || 'Interactive simulation and learning artifact.')}</p>
          <div class="card-tags">${tagsHtml}</div>
          <div class="card-actions">
            <button class="btn btn-sm btn-primary" onclick="openPlayerModal('${art.id}', 'mobile')" title="Test Mobile App Card View (375x540)">
              📱 Mobile
            </button>
            <button class="btn btn-sm btn-secondary" onclick="openPlayerModal('${art.id}', 'pill')" title="Test Pill View in Learning Feed">
              💊 Pill
            </button>
            <button class="btn btn-sm btn-outline" onclick="openPlayerModal('${art.id}', 'desktop')" title="Test Desktop Card View (880x490)">
              💻 Desktop
            </button>
            <div class="card-btn-group">
              <button class="icon-btn" onclick="openEmbedModal('${art.id}')" title="Get Embed Code">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// MODALS (PLAYER & EMBED)
// ============================================================
function setupModals() {
  // Player modal close
  document.getElementById('btnClosePlayerModal').addEventListener('click', closePlayerModal);
  document.getElementById('btnCloseEmbedModal').addEventListener('click', closeEmbedModal);

  // Close modals when clicking backdrop
  document.getElementById('playerModal').addEventListener('click', (e) => {
    if (e.target.id === 'playerModal') closePlayerModal();
  });
  document.getElementById('embedModal').addEventListener('click', (e) => {
    if (e.target.id === 'embedModal') closeEmbedModal();
  });

  // Device toggles in Player
  const devButtons = document.querySelectorAll('.dev-btn');
  devButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      applyPlayerPreset(preset);
    });
  });

  // Stage Pill click expands to mobile card view
  document.getElementById('stagePillButton')?.addEventListener('click', () => {
    showToast('Pill tapped! Expanding to Mobile Card View (375×540)...', 'info');
    applyPlayerPreset('mobile');
  });

  // Open standalone preview in new tab
  document.getElementById('btnOpenNewTab').addEventListener('click', () => {
    if (currentArtifact) {
      window.open(`/preview/${currentArtifact.id}`, '_blank');
    }
  });

  // Restart simulation
  document.getElementById('btnReloadPlayer').addEventListener('click', () => {
    const iframe = document.getElementById('playerIframe');
    if (iframe.src) iframe.src = iframe.src;
  });

  // Get embed from player
  document.getElementById('btnModalEmbed').addEventListener('click', () => {
    if (currentArtifact) openEmbedModal(currentArtifact.id);
  });
  document.getElementById('btnModalGetEmbed').addEventListener('click', () => {
    if (currentArtifact) openEmbedModal(currentArtifact.id);
  });

  // Embed format segmented controls
  document.getElementById('segIframe').addEventListener('click', () => setEmbedFormat('iframe'));
  document.getElementById('segDirectUrl').addEventListener('click', () => setEmbedFormat('url'));
  document.getElementById('segRawHtml').addEventListener('click', () => setEmbedFormat('raw'));

  document.getElementById('embedWidth').addEventListener('input', updateEmbedSnippet);
  document.getElementById('embedHeight').addEventListener('input', updateEmbedSnippet);

  // Copy embed snippet button
  document.getElementById('btnCopyCode').addEventListener('click', () => {
    const code = document.getElementById('embedCodeSnippet').textContent;
    navigator.clipboard.writeText(code).then(() => {
      showToast('Copied to clipboard!', 'success');
    });
  });
}

function applyPlayerPreset(preset) {
  const devButtons = document.querySelectorAll('.dev-btn');
  devButtons.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-preset') === preset);
  });

  const iframeContainer = document.getElementById('playerIframeContainer');
  const pillContainer = document.getElementById('playerPillContainer');

  if (preset === 'pill') {
    iframeContainer.style.display = 'none';
    pillContainer.style.display = 'flex';
  } else {
    pillContainer.style.display = 'none';
    iframeContainer.style.display = 'flex';

    if (preset === 'mobile') {
      iframeContainer.style.maxWidth = '375px';
      iframeContainer.style.height = '540px';
      iframeContainer.style.borderRadius = '24px';
      iframeContainer.style.border = '3px solid #334155';
      iframeContainer.style.boxShadow = '0 16px 40px rgba(0,0,0,0.6)';
    } else if (preset === 'desktop') {
      iframeContainer.style.maxWidth = '880px';
      iframeContainer.style.height = '490px';
      iframeContainer.style.borderRadius = '18px';
      iframeContainer.style.border = '1px solid #334155';
      iframeContainer.style.boxShadow = '0 16px 40px rgba(0,0,0,0.6)';
    } else if (preset === 'full') {
      iframeContainer.style.maxWidth = '100%';
      iframeContainer.style.height = '100%';
      iframeContainer.style.borderRadius = '0';
      iframeContainer.style.border = 'none';
      iframeContainer.style.boxShadow = 'none';
    }
  }
}

function openPlayerModal(id, initialPreset = 'mobile') {
  const artifact = allArtifacts.find(a => a.id === id) || allInteractives.find(i => i.id === id);
  if (!artifact) return;

  currentArtifact = artifact;
  document.getElementById('modalTitle').textContent = artifact.title;
  document.getElementById('modalSubject').textContent = artifact.subject || 'General';
  document.getElementById('modalGrade').textContent = artifact.grade_level || `Class ${artifact.class || 'K-12'}`;
  document.getElementById('modalDescription').textContent = artifact.description || artifact.concept || '';
  
  const tagsWrap = document.getElementById('modalTags');
  tagsWrap.innerHTML = (artifact.tags || []).map(t => `<span class="tag-item">${escapeHtml(t)}</span>`).join('');

  // Update Pill Demo Content
  const pillData = artifact.pill || (artifact.config && artifact.config.pill) || {};
  document.getElementById('stagePillIcon').textContent = pillData.icon || '⚡';
  document.getElementById('stagePillTitle').textContent = pillData.title || pillData.latex || artifact.title;

  const iframe = document.getElementById('playerIframe');
  iframe.src = `/preview/${artifact.id}`;

  document.getElementById('playerModal').style.display = 'flex';
  applyPlayerPreset(initialPreset);
}

function closePlayerModal() {
  document.getElementById('playerModal').style.display = 'none';
  document.getElementById('playerIframe').src = '';
  currentArtifact = null;
}

function openEmbedModal(id) {
  const artifact = allArtifacts.find(a => a.id === id);
  if (!artifact) return;

  currentArtifact = artifact;
  setEmbedFormat('iframe');
  document.getElementById('embedModal').style.display = 'flex';
}

function closeEmbedModal() {
  document.getElementById('embedModal').style.display = 'none';
}

function setEmbedFormat(format) {
  embedFormat = format;
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('iframeDimensionsRow').style.display = format === 'iframe' ? 'flex' : 'none';

  if (format === 'iframe') {
    document.getElementById('segIframe').classList.add('active');
  } else if (format === 'url') {
    document.getElementById('segDirectUrl').classList.add('active');
  } else if (format === 'raw') {
    document.getElementById('segRawHtml').classList.add('active');
  }

  updateEmbedSnippet();
}

async function updateEmbedSnippet() {
  if (!currentArtifact) return;

  const origin = window.location.origin;
  const previewUrl = `${origin}/preview/${currentArtifact.id}`;
  const width = document.getElementById('embedWidth').value || '100%';
  const height = document.getElementById('embedHeight').value || '600px';
  const codeEl = document.getElementById('embedCodeSnippet');

  if (embedFormat === 'iframe') {
    codeEl.textContent = `<iframe \n  src="${previewUrl}" \n  width="${width}" \n  height="${height}" \n  style="border:none; border-radius:12px; max-width:100%; aspect-ratio:4/3;" \n  allowfullscreen \n  loading="lazy" \n  title="${escapeAttr(currentArtifact.title)}">\n</iframe>`;
  } else if (embedFormat === 'url') {
    codeEl.textContent = previewUrl;
  } else if (embedFormat === 'raw') {
    try {
      const res = await fetch(`/api/artifacts/${currentArtifact.id}/html`);
      const data = await res.json();
      codeEl.textContent = data.html || '<!-- HTML loading -->';
    } catch (err) {
      codeEl.textContent = '<!-- Error loading raw HTML -->';
    }
  }
}

async function deleteArtifact(id, title) {
  if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

  try {
    const res = await fetch(`/api/artifacts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(`Artifact deleted: ${title}`, 'success');
      loadArtifacts();
    } else {
      showToast(data.error || 'Failed to delete artifact', 'error');
    }
  } catch (err) {
    showToast('Delete error: ' + err.message, 'error');
  }
}

// ============================================================
// LEGO BLOCK LIBRARY & REGISTRY


// ============================================================
// TOPICS EXPLORER (1,200 TOPICS)
// ============================================================
async function loadTopics() {
  try {
    const res = await fetch('/api/topics');
    const data = await res.json();
    if (data.success) {
      allTopics = data.topics;
      filterAndRenderTopics();
    }
  } catch (err) {
    console.warn('Failed to load topics:', err);
  }
}

function setupTopics() {
  const searchInput = document.getElementById('topicSearchInput');
  const clearBtn = document.getElementById('clearTopicSearch');
  const gradePills = document.querySelectorAll('#topicGradePills .pill');
  const subjectPills = document.querySelectorAll('#topicSubjectPills .pill');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      topicSearchQuery = e.target.value.toLowerCase().trim();
      clearBtn.style.display = topicSearchQuery ? 'block' : 'none';
      filterAndRenderTopics();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      topicSearchQuery = '';
      clearBtn.style.display = 'none';
      filterAndRenderTopics();
    });
  }

  gradePills.forEach(pill => {
    pill.addEventListener('click', () => {
      gradePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedTopicGrade = pill.getAttribute('data-grade');
      filterAndRenderTopics();
    });
  });

  subjectPills.forEach(pill => {
    pill.addEventListener('click', () => {
      subjectPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedTopicSubject = pill.getAttribute('data-subject');
      filterAndRenderTopics();
    });
  });
}

function filterAndRenderTopics() {
  const grid = document.getElementById('topicsGrid');
  const countDisplay = document.getElementById('topicResultCount');
  if (!grid) return;

  const filtered = allTopics.filter(t => {
    const matchGrade = !selectedTopicGrade || t.grade === parseInt(selectedTopicGrade, 10);
    const matchSubject = !selectedTopicSubject || t.subject.toLowerCase() === selectedTopicSubject.toLowerCase();
    const matchSearch = !topicSearchQuery ||
      t.title.toLowerCase().includes(topicSearchQuery) ||
      (t.concept && t.concept.toLowerCase().includes(topicSearchQuery)) ||
      (t.interactiveIdea && t.interactiveIdea.toLowerCase().includes(topicSearchQuery));

    return matchGrade && matchSubject && matchSearch;
  });

  if (countDisplay) {
    countDisplay.textContent = `Showing ${filtered.length} of ${allTopics.length} topics${selectedTopicGrade ? ` for Class ${selectedTopicGrade}` : ''}${selectedTopicSubject ? ` (${selectedTopicSubject.toUpperCase()})` : ''}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📚</div>
        <h3>No curriculum topics found</h3>
        <p>Try searching for a different keyword or adjusting your grade filter.</p>
      </div>
    `;
    return;
  }

  // Display first 150 matching topics with pagination/rendering efficiency
  const displayList = filtered.slice(0, 150);

  grid.innerHTML = displayList.map(t => `
    <div class="topic-card">
      <div>
        <div class="topic-card-header">
          <span class="badge badge-grade">Class ${t.grade}</span>
          <span class="badge badge-subject">${escapeHtml(t.subject)}</span>
        </div>
        <h4 class="topic-card-title">${escapeHtml(t.title)}</h4>
        <p class="topic-card-concept">${escapeHtml(t.concept)}</p>
        <div class="topic-card-idea">
          <strong>💡 Interactive Simulation:</strong> ${escapeHtml(t.interactiveIdea)}
        </div>
      </div>
      <div class="topic-card-actions">
        <span style="font-size: 11px; color: var(--text-faint); font-family: var(--font-mono);">${escapeHtml(t.id)}</span>
        <button class="btn btn-sm btn-primary" onclick="openPlayerModal('${t.id}')">
          ▶️ Launch Preview
        </button>
      </div>
    </div>
  `).join('') + (filtered.length > 150 ? `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;">Showing first 150 matches. Use search or grade filters to narrow down!</div>` : '');
}

// ============================================================
// INTERACTIVE TESTING CONSOLE (1,200 ARTIFACTS VERIFICATION)
// ============================================================
async function loadInteractives() {
  try {
    const [resList, resStats] = await Promise.all([
      fetch('/api/interactives'),
      fetch('/api/interactives/stats')
    ]);

    const dataList = await resList.json();
    const dataStats = await resStats.json();

    if (dataList.success) {
      allInteractives = dataList.interactives;
      filterAndRenderInteractives();
    }

    if (dataStats.success && dataStats.stats) {
      interactiveStats = dataStats.stats;
      document.getElementById('kpiTotal').textContent = interactiveStats.total.toLocaleString();
      document.getElementById('kpiAvailable').textContent = interactiveStats.availableCount.toLocaleString();
      document.getElementById('kpiPending').textContent = interactiveStats.pendingCount.toLocaleString();
    }
  } catch (err) {
    console.warn('Failed to load interactives:', err);
  }
}

function setupInteractiveTesting() {
  const searchInput = document.getElementById('testSearchInput');
  const clearBtn = document.getElementById('clearTestSearch');
  const statusBtns = document.querySelectorAll('#testStatusSeg .seg-btn');
  const subjectPills = document.querySelectorAll('#testSubjectPills .pill');
  const gradePills = document.querySelectorAll('#testGradePills .pill');
  const btnSync = document.getElementById('btnSyncSupabase');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      testSearchQuery = e.target.value.toLowerCase().trim();
      clearBtn.style.display = testSearchQuery ? 'block' : 'none';
      filterAndRenderInteractives();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      testSearchQuery = '';
      clearBtn.style.display = 'none';
      filterAndRenderInteractives();
    });
  }

  statusBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      statusBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTestStatus = btn.getAttribute('data-status');
      filterAndRenderInteractives();
    });
  });

  subjectPills.forEach(pill => {
    pill.addEventListener('click', () => {
      subjectPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedTestSubject = pill.getAttribute('data-subject');
      filterAndRenderInteractives();
    });
  });

  gradePills.forEach(pill => {
    pill.addEventListener('click', () => {
      gradePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedTestGrade = pill.getAttribute('data-grade');
      filterAndRenderInteractives();
    });
  });

  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      btnSync.disabled = true;
      btnSync.innerHTML = '⏳ Syncing to Supabase...';
      try {
        const res = await fetch('/api/interactives/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`Successfully synced ${data.syncedCount || data.total} records to Supabase 'interactives' table!`, 'success');
          loadInteractives();
        } else {
          showToast(data.error || 'Sync failed', 'error');
        }
      } catch (err) {
        showToast('Sync error: ' + err.message, 'error');
      } finally {
        btnSync.disabled = false;
        btnSync.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Sync to Supabase Cloud`;
      }
    });
  }
}

function filterAndRenderInteractives() {
  const grid = document.getElementById('testingGrid');
  const countDisplay = document.getElementById('testResultsCount');
  if (!grid) return;

  const filtered = allInteractives.filter(item => {
    const matchClass = !selectedTestGrade || item.class === parseInt(selectedTestGrade, 10);
    const matchSubject = !selectedTestSubject || item.subject.toLowerCase() === selectedTestSubject.toLowerCase();
    const matchStatus = !selectedTestStatus || String(item.is_available) === selectedTestStatus;
    const matchSearch = !testSearchQuery ||
      item.title.toLowerCase().includes(testSearchQuery) ||
      item.id.toLowerCase().includes(testSearchQuery) ||
      (item.concept && item.concept.toLowerCase().includes(testSearchQuery)) ||
      (item.interactive_idea && item.interactive_idea.toLowerCase().includes(testSearchQuery)) ||
      (Array.isArray(item.tags) && item.tags.some(t => {
        const s = String(t).toLowerCase();
        return s.includes(testSearchQuery) || s.replace(/-/g, ' ').includes(testSearchQuery) || s.includes(testSearchQuery.replace(/\s+/g, '-'));
      }));

    return matchClass && matchSubject && matchStatus && matchSearch;
  });

  if (countDisplay) {
    const subjLabel = selectedTestSubject ? ` [${selectedTestSubject.charAt(0).toUpperCase() + selectedTestSubject.slice(1)}]` : '';
    countDisplay.textContent = `Showing ${filtered.length} of ${allInteractives.length} records in table 'interactives'${selectedTestGrade ? ` (Class ${selectedTestGrade})` : ''}${subjLabel}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🧪</div>
        <h3>No matching interactives found in database</h3>
        <p>Try adjusting your search query, class, or availability filter.</p>
      </div>
    `;
    return;
  }

  // Display top matches for performance
  const displayList = filtered.slice(0, 120);

  grid.innerHTML = displayList.map(item => {
    const isAvail = item.is_available === true;
    const origin = window.location.origin;
    const previewUrl = `${origin}/preview/${item.id}`;
    const iframeSnippet = `<iframe src="${previewUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

    return `
      <div class="test-card ${isAvail ? 'test-card-ready' : 'test-card-pending'}" data-id="${item.id}">
        <div>
          <div class="topic-card-header">
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="badge badge-grade">Class ${item.class}</span>
              <span class="badge badge-subject">${escapeHtml(item.subject)}</span>
              <span style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted);">${escapeHtml(item.id)}</span>
            </div>
            ${isAvail ?
              `<span class="test-badge-ready"><span class="pulse-dot" style="width:6px;height:6px;"></span> READY TO TEST</span>` :
              `<span class="test-badge-pending">⚪ NOT BUILT YET</span>`
            }
          </div>

          <h3 class="topic-card-title">${escapeHtml(item.title)}</h3>
          <p class="topic-card-concept">${escapeHtml(item.concept || 'Interactive educational concept.')}</p>

          ${(Array.isArray(item.tags) && item.tags.length > 0) ? `
            <div class="test-card-tags">
              ${item.tags.slice(0, 5).map(t => `<span class="test-tag-pill" onclick="filterByTag('${escapeAttr(t)}')" title="Filter by #${escapeAttr(t)}">#${escapeHtml(t)}</span>`).join('')}
              ${item.tags.length > 5 ? `<span class="test-tag-more" title="${escapeAttr(item.tags.slice(5).join(', '))}">+${item.tags.length - 5} more</span>` : ''}
            </div>
          ` : ''}

          ${isAvail ? `
            <div class="test-pill-preview-wrap">
              <button class="interactive-pill-btn" onclick="openPlayerModal('${item.id}', 'pill')" title="Test Pill View in Learning Feed">
                <span class="pill-icon-circle">${(item.pill && item.pill.icon) || '⚡'}</span>
                <span class="pill-formula-text">${escapeHtml((item.pill && (item.pill.title || item.pill.latex)) || item.title)}</span>
                <span class="pill-action-tag">Pill View 💊</span>
              </button>
            </div>
            <div class="test-snippet-box">
              <span>${escapeHtml(iframeSnippet)}</span>
              <button class="btn btn-sm" onclick="copyIframeCode('${escapeAttr(iframeSnippet)}')" title="Copy iframe snippet" style="padding:2px 6px; font-size:10px; background:rgba(0,229,255,0.15); color:#00E5FF; border:none; border-radius:4px; cursor:pointer;">Copy</button>
            </div>
          ` : `
            <div class="topic-card-idea">
              <strong>💡 Proposed Interactive:</strong> ${escapeHtml(item.interactive_idea || 'Visual controls and simulation.')}
            </div>
          `}
        </div>

        <div class="test-card-actions">
          ${isAvail ? `
            <button class="btn btn-sm btn-primary" onclick="openPlayerModal('${item.id}', 'mobile')" style="flex:1;">
              📱 Mobile Card (375×540)
            </button>
            <button class="btn btn-sm btn-secondary" onclick="openPlayerModal('${item.id}', 'desktop')">
              💻 Desktop
            </button>
            <button class="icon-btn" onclick="openEmbedModal('${item.id}')" title="Get Full Embed Code">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </button>
          ` : `
            <div style="font-size:11px; color:var(--text-faint); display:flex; align-items:center; gap:4px;">
              <span>⚪ In Curriculum (Pending Authoring)</span>
            </div>
          `}
        </div>
      </div>
    `;
  }).join('') + (filtered.length > 120 ? `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 18px; font-size: 13px;">Showing first 120 records. Use filters or search to narrow down!</div>` : '');
}

function testInteractive(id) {
  const item = allInteractives.find(i => i.id === id);
  if (!item || !item.is_available) {
    showToast('This interactive artifact has not been built yet!', 'error');
    return;
  }

  // Open in Player Modal
  openPlayerModal(id);
}

function copyIframeCode(snippet) {
  navigator.clipboard.writeText(snippet).then(() => {
    showToast('Iframe code copied to clipboard!', 'success');
  });
}

function filterByTag(tag) {
  const searchInput = document.getElementById('testSearchInput');
  const clearBtn = document.getElementById('clearTestSearch');
  if (searchInput) {
    searchInput.value = tag;
    testSearchQuery = tag.toLowerCase().trim();
    if (clearBtn) clearBtn.style.display = 'block';
    filterAndRenderInteractives();
    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast(`Filtering by tag: #${tag}`, 'info');
  }
}
window.filterByTag = filterByTag;

// ============================================================
// UTILS & TOAST

// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
