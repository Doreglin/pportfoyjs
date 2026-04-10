// ==========================================
// PORTFOLIO CANVAS BUILDER (Div Render & Drop Fixes)
// ==========================================

let savedData = JSON.parse(localStorage.getItem('vanillaCanvasFreeBuilder_v23')) || {};

let state = {
  sections: savedData.sections || [],
  globalFont: savedData.globalFont || "'Inter', sans-serif",
  zoom: 0.5, 
  selectedSectionId: null,
  selectedElementId: null,
  isPreview: false,
  previewDevice: 'desktop', 
  leftTab: 'add', 
  
  draggedType: null,
  draggedSectionId: null,
  draggedElementId: null,
  dragOffsetX: 0, 
  dragOffsetY: 0 
};

// --- PANO (CLIPBOARD) VE GEÇMİŞ (HISTORY) ---
let clipboard = null;
let history = [];
let historyIndex = -1;

function initHistory() {
  history = [JSON.stringify({ sections: state.sections, globalFont: state.globalFont })];
  historyIndex = 0;
}

function pushToHistory() {
  const snapSnap = JSON.stringify({ sections: state.sections, globalFont: state.globalFont });
  if (historyIndex >= 0 && history[historyIndex] === snapSnap) return; 
  history = history.slice(0, historyIndex + 1);
  history.push(snapSnap);
  historyIndex++;
}

window.undo = function() {
  if (state.isPreview || historyIndex <= 0) return;
  historyIndex--;
  const snapSnap = JSON.parse(history[historyIndex]);
  state.sections = snapSnap.sections;
  state.globalFont = snapSnap.globalFont;
  state.selectedSectionId = null; 
  state.selectedElementId = null;
  localStorage.setItem('vanillaCanvasFreeBuilder_v23', history[historyIndex]);
  renderLeftPanel(); renderMiddlePanel(); renderRightPanel();
};

window.redo = function() {
  if (state.isPreview || historyIndex >= history.length - 1) return;
  historyIndex++;
  const snapSnap = JSON.parse(history[historyIndex]);
  state.sections = snapSnap.sections;
  state.globalFont = snapSnap.globalFont;
  state.selectedSectionId = null;
  state.selectedElementId = null;
  localStorage.setItem('vanillaCanvasFreeBuilder_v23', history[historyIndex]);
  renderLeftPanel(); renderMiddlePanel(); renderRightPanel();
};

window.handleImageUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    alert("Uyarı: Yüklediğiniz resim 3MB'tan büyük! Yüksek boyutlu resimler projeyi yavaşlatabilir veya kayıt edilmesini engelleyebilir. Devam ediliyor...");
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Image = e.target.result;
    updateSelectedData('url', base64Image, false, true);
  };
  reader.readAsDataURL(file);
};

window.copySelected = function() {
  if (state.selectedElementId) {
    const section = state.sections.find(s => s.id === state.selectedSectionId);
    const el = section.elements.find(e => e.id === state.selectedElementId);
    if (!el) return;

    const elementsToCopy = [];
    const collectDescendants = (parentId) => {
      const children = section.elements.filter(child => child.parentId === parentId);
      children.forEach(child => {
        elementsToCopy.push(child);
        collectDescendants(child.id);
      });
    };
    elementsToCopy.push(el);
    collectDescendants(el.id);

    clipboard = { type: 'element', rootId: el.id, elements: JSON.parse(JSON.stringify(elementsToCopy)) };
  } else if (state.selectedSectionId) {
    const section = state.sections.find(s => s.id === state.selectedSectionId);
    if (!section) return;
    clipboard = { type: 'section', data: JSON.parse(JSON.stringify(section)) };
  }
};

window.pasteClipboard = function() {
  if (!clipboard || state.isPreview) return;

  if (clipboard.type === 'element' && state.selectedSectionId) {
    const section = state.sections.find(s => s.id === state.selectedSectionId);
    if (!section) return;

    const idMap = {};
    const pastedElements = [];
    
    clipboard.elements.forEach(e => { idMap[e.id] = Date.now() + Math.random(); });

    clipboard.elements.forEach(e => {
      const newEl = JSON.parse(JSON.stringify(e));
      newEl.id = idMap[e.id];
      if (e.id === clipboard.rootId) {
        newEl.x = snap(newEl.x + 20); 
        newEl.y = snap(newEl.y + 20);
        if (newEl.parentId && !section.elements.some(existing => existing.id === newEl.parentId)) {
          newEl.parentId = null; 
        }
      } else {
        newEl.parentId = idMap[e.parentId] || newEl.parentId; 
      }
      pastedElements.push(newEl);
    });

    section.elements.push(...pastedElements);
    state.selectedElementId = idMap[clipboard.rootId];
    saveState(true); renderLeftPanel(); renderMiddlePanel(); renderRightPanel();

  } else if (clipboard.type === 'section') {
    const newSec = JSON.parse(JSON.stringify(clipboard.data));
    newSec.id = Date.now() + Math.random();
    
    if (state.sections.length > 0) {
      const lastSec = state.sections[state.sections.length - 1];
      newSec.y = snap(lastSec.y + lastSec.height + 20);
    } else { newSec.y += 20; }
    
    const idMap = {};
    newSec.elements.forEach(e => {
      const newId = Date.now() + Math.random();
      idMap[e.id] = newId; e.id = newId;
    });
    newSec.elements.forEach(e => {
      if (e.parentId && idMap[e.parentId]) e.parentId = idMap[e.parentId];
    });

    state.sections.push(newSec);
    state.selectedSectionId = newSec.id;
    state.selectedElementId = null;
    saveState(true); renderLeftPanel(); renderMiddlePanel(); renderRightPanel();
  }
};

window.duplicateSelected = function() {
  if (state.isPreview) return;
  window.copySelected();
  window.pasteClipboard();
};

window.addEventListener('keydown', (e) => {
  if (state.isPreview) return;
  const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
  
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey && !isInputActive) { e.preventDefault(); window.undo(); }
    if ((e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !isInputActive) { e.preventDefault(); window.redo(); }
    if (e.key === 'c' || e.key === 'C') { if(!isInputActive) { e.preventDefault(); window.copySelected(); } }
    if (e.key === 'v' || e.key === 'V') { if(!isInputActive) { e.preventDefault(); window.pasteClipboard(); } }
    if (e.key === 'd' || e.key === 'D') { if(!isInputActive) { e.preventDefault(); window.duplicateSelected(); } }
  }
  
  if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputActive) {
    e.preventDefault();
    if (state.selectedElementId) window.removeElement(state.selectedSectionId, state.selectedElementId);
    else if (state.selectedSectionId) window.removeSection(state.selectedSectionId);
  }
});

window.exportProject = function() {
  const projectData = {
    sections: state.sections,
    globalFont: state.globalFont
  };
  const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portfolio-canvas-yedek.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.importProject = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.sections) {
        state.sections = data.sections;
        state.globalFont = data.globalFont || "'Inter', sans-serif";
        state.selectedSectionId = null;
        state.selectedElementId = null;
        saveState(true);
        renderLeftPanel();
        renderMiddlePanel();
        renderRightPanel();
        alert('✅ Proje başarıyla yüklendi!');
      } else {
        alert('❌ Geçersiz proje dosyası. Doğru dosyayı seçtiğinizden emin olun.');
      }
    } catch (err) {
      alert('❌ Dosya okunurken hata oluştu: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = ''; 
};

const allowedElements = {
  navbar: ['title', 'text', 'img'], 
  hero: ['title', 'text', 'div'],
  about: ['title', 'text', 'img', 'div'],
  projects: ['title', 'text', 'img', 'button', 'div'],
  contact: ['title', 'text', 'img', 'button', 'div']
};

const defaultSectionData = {
  navbar: { bgColor: '#ffffff', height: 80, width: 1400 }, 
  hero: { bgColor: '#1e293b', height: 800, width: 1400 },
  about: { bgColor: '#f3f4f6', height: 600, width: 1400 },
  projects: { bgColor: '#ffffff', height: 1000, width: 1400 },
  contact: { bgColor: '#4f46e5', height: 800, width: 1400 }
};

const appContainer = document.getElementById('app');
appContainer.innerHTML = `
  <header class="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm z-20">
    <h1 class="text-xl font-bold text-gray-800 tracking-tight">Portfolio Canvas Pro</h1>
    
    <div id="toolbar-edit" class="flex items-center gap-3" style="display: flex;">
      <div class="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 mr-2">
        <button onclick="changeZoom(-0.1)" class="px-3 py-1 font-bold text-gray-600 hover:text-indigo-600 hover:bg-white rounded transition-colors" title="Uzaklaş">-</button>
        <span id="zoom-level-text" class="text-xs font-bold w-12 text-center text-gray-700">50%</span>
        <button onclick="changeZoom(0.1)" class="px-3 py-1 font-bold text-gray-600 hover:text-indigo-600 hover:bg-white rounded transition-colors" title="Yakınlaş">+</button>
      </div>

      <div class="flex items-center gap-1 border-r border-gray-300 pr-3 mr-1">
        <button onclick="undo()" class="px-2 py-1 text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-white rounded transition-colors text-lg" title="Geri Al (Ctrl+Z)">↩</button>
        <button onclick="redo()" class="px-2 py-1 text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-white rounded transition-colors text-lg" title="İleri Al (Ctrl+Y)">↪</button>
      </div>

      <div class="flex items-center gap-1 border-r border-gray-300 pr-3 mr-1">
        <button onclick="exportProject()" class="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors shadow-sm" title="Projeyi JSON olarak kaydet">💾 Kaydet</button>
        <button onclick="document.getElementById('import-file').click()" class="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors shadow-sm" title="Kayıtlı projeyi yükle">📂 Yükle</button>
        <input type="file" id="import-file" style="display:none" accept=".json" onchange="importProject(event)">
      </div>

      <button onclick="clearCanvas()" class="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors">Kanvası Temizle</button>
      <button onclick="exportToHTML()" class="px-5 py-2 text-sm font-bold bg-green-600 text-white hover:bg-green-700 rounded transition-colors shadow-sm">📥 HTML İndir</button>
      <button onclick="togglePreview()" class="px-5 py-2 rounded text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm">Preview Modu</button>
    </div>

    <div id="toolbar-preview" class="flex items-center gap-3" style="display: none;">
      <div class="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 mr-2" id="device-toggles">
        <button onclick="setDevice('desktop')" class="device-btn px-3 py-1 rounded text-xl transition-all bg-white shadow" title="Masaüstü">💻</button>
        <button onclick="setDevice('tablet')" class="device-btn px-3 py-1 rounded text-xl transition-all hover:bg-gray-200" title="Tablet">📱</button>
        <button onclick="setDevice('mobile')" class="device-btn px-3 py-1 rounded text-xl transition-all hover:bg-gray-200" title="Mobil">📱</button>
      </div>
      <button onclick="exportToHTML()" class="px-5 py-2 text-sm font-bold bg-green-600 text-white hover:bg-green-700 rounded transition-colors shadow-sm">📥 HTML İndir</button>
      <button onclick="togglePreview()" class="px-5 py-2 rounded text-sm font-bold bg-gray-800 text-white hover:bg-gray-900 transition-all shadow-sm">Düzenleyiciye Dön</button>
    </div>
  </header>

  <div class="flex-1 flex overflow-hidden">
    <aside id="left-panel" class="w-64 bg-white border-r flex flex-col z-10 shadow-sm overflow-hidden"></aside>
    <main id="middle-panel" class="flex-1 overflow-auto bg-gray-200 relative scroll-smooth"></main>
    <aside id="right-panel" class="w-80 bg-white border-l p-5 overflow-y-auto shadow-sm z-10"></aside>
  </div>
`;

const leftPanel = document.getElementById('left-panel');
const middlePanel = document.getElementById('middle-panel');
const rightPanel = document.getElementById('right-panel');

const SNAP_SIZE = 10;
const snap = (val) => Math.round(val / SNAP_SIZE) * SNAP_SIZE;

function saveState(recordHistory = true) {
  localStorage.setItem('vanillaCanvasFreeBuilder_v23', JSON.stringify({ sections: state.sections, globalFont: state.globalFont }));
  if (recordHistory) pushToHistory();
}

initHistory();

function loadGlobalFont() {
  const fontId = 'dynamic-google-font';
  let link = document.getElementById(fontId);
  if (!link) {
    link = document.createElement('link'); link.id = fontId; link.rel = 'stylesheet'; document.head.appendChild(link);
  }
  const fontName = state.globalFont.split(',')[0].replace(/'/g, '').trim();
  const googleFonts = ['Inter', 'Poppins', 'Roboto', 'Playfair Display', 'Merriweather', 'Oswald', 'Courier New'];
  if (googleFonts.includes(fontName) && fontName !== 'Courier New') {
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;600;700;800&display=swap`;
  }
}

window.changeZoom = function(amount) {
  if (state.isPreview) return; 
  state.zoom = Math.max(0.2, Math.min(2, parseFloat((state.zoom + amount).toFixed(1))));
  document.getElementById('zoom-level-text').innerText = Math.round(state.zoom * 100) + '%';
  renderMiddlePanel();
};

window.setDevice = function(device) {
  state.previewDevice = device;
  const btns = document.querySelectorAll('.device-btn');
  if(btns.length > 0) {
    btns[0].className = `device-btn px-3 py-1 rounded text-xl transition-all ${device === 'desktop' ? 'bg-white shadow' : 'hover:bg-gray-200'}`;
    btns[1].className = `device-btn px-3 py-1 rounded text-xl transition-all ${device === 'tablet' ? 'bg-white shadow' : 'hover:bg-gray-200'}`;
    btns[2].className = `device-btn px-3 py-1 rounded text-xl transition-all ${device === 'mobile' ? 'bg-white shadow' : 'hover:bg-gray-200'}`;
  }
  renderMiddlePanel();
};

window.addSectionToCanvas = function(type, clientX, clientY) {
  const containerRect = middlePanel.querySelector('#canvas-zone').getBoundingClientRect();
  const defWidth = defaultSectionData[type].width;
  const defHeight = defaultSectionData[type].height;
  
  const x = snap((clientX - containerRect.left) / state.zoom);
  const y = snap((clientY - containerRect.top) / state.zoom); 

  const newSection = { 
    id: Date.now(), type: type, x: x, y: y, 
    width: defWidth, height: defHeight, bgColor: defaultSectionData[type].bgColor, 
    elements: [], isLocked: false 
  };
  
  state.sections.push(newSection);
  saveState(true); selectSection(newSection.id); renderMiddlePanel();
};

window.addElementFromDrag = function(sectionId, type, x, y, parentId = null) {
  const section = state.sections.find(s => s.id === sectionId);
  if(!section) return;

  const snappedX = snap(x);
  const snappedY = snap(y);

  const newEl = { 
    id: Date.now(), type, x: snappedX, y: snappedY, parentId, opacity: 1, fontFamily: 'inherit', 
    borderWidth: 0, borderColor: '#000000',
    hasHover: false, hoverColor: '#4f46e5', hoverBgColor: '#e0e7ff',
    isLocked: false
  };

  if (type === 'title') {
    Object.assign(newEl, { content: 'Yeni Başlık', fontSize: 48, color: '#111827' });
  } else if (type === 'text') {
    Object.assign(newEl, { content: 'Açıklama metni...', fontSize: 16, color: '#4b5563' });
  } else if (type === 'button') {
    Object.assign(newEl, { content: 'Tıklayın', fontSize: 16, bgColor: '#4f46e5', color: '#ffffff', padding: 16, borderRadius: 8, shadowSize: 0, shadowColor: '#000000' });
  } else if (type === 'img') {
    Object.assign(newEl, { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400', width: 200, height: 100, bgColor: '#e5e7eb', borderRadius: 8, shadowSize: 0, shadowColor: '#000000' });
  } else if (type === 'div') { 
    Object.assign(newEl, { bgColor: '#e5e7eb', width: 400, height: 300, borderRadius: 12, shadowSize: 0, shadowColor: '#000000' });
  }

  section.elements.push(newEl);
  state.selectedElementId = newEl.id;
  state.selectedSectionId = section.id;
  saveState(true); renderMiddlePanel(); renderRightPanel();
};

window.removeSection = function(id, e) {
  if (e) e.stopPropagation();
  state.sections = state.sections.filter(s => s.id !== id);
  state.selectedSectionId = null; state.selectedElementId = null;
  saveState(true); renderLeftPanel(); renderMiddlePanel(); renderRightPanel();
};

window.removeElement = function(sectionId, elementId, e) {
  if (e) e.stopPropagation();
  const section = state.sections.find(s => s.id === sectionId);
  if(section) {
    section.elements = section.elements.filter(el => el.id !== elementId && el.parentId !== elementId);
  }
  state.selectedElementId = null;
  saveState(true); renderMiddlePanel(); renderRightPanel();
};

window.selectSection = function(id) {
  if (state.isPreview) return;
  state.selectedSectionId = id; state.selectedElementId = null; 
  renderLeftPanel(); renderMiddlePanel(); renderRightPanel();
};

window.selectElement = function(elementId, e) {
  if (state.isPreview) return;
  e.stopPropagation(); 
  state.selectedElementId = elementId;
  const section = state.sections.find(s => s.elements.some(el => el.id === elementId));
  if(section) state.selectedSectionId = section.id;
  renderLeftPanel(); renderMiddlePanel(); renderRightPanel();
};

window.toggleLock = function(type, id, e) {
  e.stopPropagation();
  if (type === 'section') {
    const sec = state.sections.find(s => s.id === id);
    if(sec) sec.isLocked = !sec.isLocked;
  } else {
    const section = state.sections.find(s => s.elements.some(el => el.id === id));
    if(section) {
      const el = section.elements.find(e => e.id === id);
      if (el) el.isLocked = !el.isLocked;
    }
  }
  saveState(true); renderLeftPanel(); renderMiddlePanel();
};

window.reorderLayer = function(type, draggedId, targetId) {
  if (draggedId === targetId) return;
  if (type === 'section') {
    const dragIdx = state.sections.findIndex(s => s.id === draggedId);
    const targIdx = state.sections.findIndex(s => s.id === targetId);
    const [item] = state.sections.splice(dragIdx, 1);
    state.sections.splice(targIdx, 0, item);
  } else {
    const sec = state.sections.find(s => s.elements.some(e => e.id === draggedId));
    if (sec) {
      const dragIdx = sec.elements.findIndex(e => e.id === draggedId);
      const targIdx = sec.elements.findIndex(e => e.id === targetId);
      const [item] = sec.elements.splice(dragIdx, 1);
      sec.elements.splice(targIdx, 0, item);
    }
  }
  saveState(true); renderLeftPanel(); renderMiddlePanel();
};

function updateSelectedData(key, value, isCheckbox = false, recordHistory = false) {
  if (state.selectedElementId) {
    const section = state.sections.find(s => s.id === state.selectedSectionId);
    const el = section.elements.find(e => e.id === state.selectedElementId);
    if(el) {
      if (isCheckbox) el[key] = value;
      else if (['fontSize', 'width', 'height', 'padding', 'borderRadius', 'shadowSize', 'borderWidth', 'x', 'y'].includes(key)) el[key] = parseInt(value) || 0;
      else if (key === 'opacity') el[key] = parseFloat(value);
      else el[key] = value;
    }
  } 
  else if (state.selectedSectionId) {
    const section = state.sections.find(s => s.id === state.selectedSectionId);
    if(section) section[key] = (key === 'width' || key === 'height') ? parseInt(value) : value;
  }
  saveState(recordHistory); renderMiddlePanel();
}

window.alignElement = function(alignment) {
  if (!state.selectedElementId || !state.selectedSectionId) return;
  const section = state.sections.find(s => s.id === state.selectedSectionId);
  const el = section.elements.find(e => e.id === state.selectedElementId);
  if (!el || el.isLocked) return; 

  let parentW = section.width; let parentH = section.height;
  if (el.parentId) {
    const parent = section.elements.find(e => e.id === el.parentId);
    if (parent) { parentW = parent.width; parentH = parent.height; }
  }

  const domEl = document.getElementById('el-' + el.id);
  if (!domEl) return;
  const rect = domEl.getBoundingClientRect();
  const elW = rect.width / state.zoom; const elH = rect.height / state.zoom;

  if (alignment === 'left') el.x = 0;
  if (alignment === 'center') el.x = snap((parentW - elW) / 2);
  if (alignment === 'right') el.x = snap(parentW - elW);
  if (alignment === 'top') el.y = 0;
  if (alignment === 'middle') el.y = snap((parentH - elH) / 2);
  if (alignment === 'bottom') el.y = snap(parentH - elH);

  saveState(true); renderMiddlePanel(); renderRightPanel();
}

function getHoverEvents(el) {
  if (!el.hasHover) return '';
  let enter = ''; let leave = '';
  if (el.type === 'title' || el.type === 'text') {
    enter = `this.style.color='${el.hoverColor}';`; leave = `this.style.color='${el.color}';`;
  } else if (el.type === 'button') {
    enter = `this.style.color='${el.hoverColor}'; this.style.backgroundColor='${el.hoverBgColor}';`;
    leave = `this.style.color='${el.color}'; this.style.backgroundColor='${el.bgColor}';`;
  } else if (el.type === 'img' || el.type === 'div') {
    enter = `this.style.backgroundColor='${el.hoverBgColor}';`; leave = `this.style.backgroundColor='${el.bgColor}';`;
  }
  return `onmouseenter="${enter}" onmouseleave="${leave}"`;
}

window.setLeftTab = function(tab) {
  state.leftTab = tab;
  renderLeftPanel();
};

function renderLeftPanel() {
  leftPanel.innerHTML = `
    <div class="flex border-b border-gray-200 mb-3 bg-white z-10 sticky top-0">
      <button onclick="setLeftTab('add')" class="flex-1 py-3 text-xs font-bold transition-all ${state.leftTab === 'add' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'}">Araçlar</button>
      <button onclick="setLeftTab('layers')" class="flex-1 py-3 text-xs font-bold transition-all ${state.leftTab === 'layers' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800'}">Katmanlar</button>
    </div>
    <div id="left-panel-content" class="flex-1 overflow-y-auto pr-1"></div>
  `;

  const content = document.getElementById('left-panel-content');

  if (state.leftTab === 'add') {
    if (!state.selectedSectionId) {
      content.innerHTML += '<h2 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 pb-2">Ana Bölümler</h2>';
      ['navbar', 'hero', 'about', 'projects', 'contact'].forEach(type => {
        content.innerHTML += `
          <div draggable="true" ondragstart="event.dataTransfer.setData('source', 'leftPanelSection'); event.dataTransfer.setData('type', '${type}');" class="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 hover:border-indigo-400 rounded-lg text-sm text-gray-700 font-bold cursor-grab active:cursor-grabbing mb-3 shadow-sm hover:shadow transition-all capitalize group">
            <span>🔲 ${type}</span>
            <span class="text-gray-400 group-hover:text-indigo-500 text-lg">≡</span>
          </div>
        `;
      });
      content.innerHTML += `<p class="text-xs text-gray-400 mt-4 leading-relaxed">Eklemek istediğiniz bölümü kanvasa sürükleyin. İçeriğini doldurmak için kanvastaki bölüme tıklayın.</p>`;
    } else {
      const section = state.sections.find(s => s.id === state.selectedSectionId);
      if(!section) return;

      content.innerHTML += `
        <div class="flex items-center justify-between mb-4 border-b pb-2">
          <h2 class="text-xs font-bold text-indigo-600 uppercase tracking-wider">${section.type} Araçları</h2>
          <button onclick="state.selectedSectionId = null; renderLeftPanel();" class="text-xs text-gray-400 hover:text-gray-800 font-bold px-2 py-1 bg-gray-100 rounded">Geri</button>
        </div>
      `;

      const allowed = allowedElements[section.type];
      allowed.forEach(elType => {
        const icons = { title: 'T', text: '📝', img: '🖼️', button: '🔘', div: '📦' };
        content.innerHTML += `
          <div draggable="true" ondragstart="event.dataTransfer.setData('source', 'leftPanelElement'); event.dataTransfer.setData('type', '${elType}');" class="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 hover:border-indigo-400 rounded-lg text-sm text-gray-700 font-bold cursor-grab active:cursor-grabbing mb-3 shadow-sm hover:shadow transition-all capitalize group">
            <span>${icons[elType]} ${elType}</span>
            <span class="text-gray-400 group-hover:text-indigo-500 text-lg">≡</span>
          </div>
        `;
      });
      content.innerHTML += `<p class="text-xs text-gray-400 mt-4 leading-relaxed">Öğeleri tutup ortadaki <strong class="capitalize">${section.type}</strong> alanının içine sürükleyin.</p>`;
    }
  } 
  else {
    if (state.sections.length === 0) {
      content.innerHTML = `<p class="text-xs text-gray-400 text-center mt-10">Henüz hiç katman yok.</p>`;
      return;
    }

    const buildLayerTree = (parentId, elements, depth) => {
      let html = '';
      const children = elements.filter(e => e.parentId === parentId);
      children.forEach(el => {
        const isSel = state.selectedElementId === el.id;
        const icons = { title: 'T', text: '📝', img: '🖼️', button: '🔘', div: '📦' };
        html += `
          <div draggable="true" 
               ondragstart="event.dataTransfer.setData('layerDrag', 'element'); event.dataTransfer.setData('layerId', ${el.id});" 
               ondragover="event.preventDefault();" 
               ondrop="event.stopPropagation(); const type=event.dataTransfer.getData('layerDrag'); if(type==='element'){ window.reorderLayer('element', parseInt(event.dataTransfer.getData('layerId')), ${el.id}); }"
               class="flex items-center justify-between p-2 mb-1 rounded-md cursor-pointer transition-colors border border-transparent ${isSel ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50'}"
               style="margin-left: ${depth * 16}px"
               onclick="selectElement(${el.id}, event)">
            <div class="flex items-center gap-2 overflow-hidden">
              <span class="text-gray-400 text-xs cursor-grab">≡</span>
              <span class="text-xs">${icons[el.type]}</span>
              <span class="text-xs font-semibold text-gray-700 truncate capitalize">${el.type} ${el.isLocked ? '(Kilitli)' : ''}</span>
            </div>
            <button onclick="toggleLock('element', ${el.id}, event)" class="text-xs text-gray-400 hover:text-indigo-600 transition-colors" title="Kilitle/Çöz">
              ${el.isLocked ? '🔒' : '🔓'}
            </button>
          </div>
        `;
        html += buildLayerTree(el.id, elements, depth + 1);
      });
      return html;
    };

    state.sections.forEach((sec) => {
      const isSel = state.selectedSectionId === sec.id && !state.selectedElementId;
      content.innerHTML += `
        <div class="mb-3">
          <div draggable="true" 
               ondragstart="event.dataTransfer.setData('layerDrag', 'section'); event.dataTransfer.setData('layerId', ${sec.id});" 
               ondragover="event.preventDefault();" 
               ondrop="event.stopPropagation(); const type=event.dataTransfer.getData('layerDrag'); if(type==='section'){ window.reorderLayer('section', parseInt(event.dataTransfer.getData('layerId')), ${sec.id}); }"
               class="flex items-center justify-between p-2 bg-gray-100 rounded-md cursor-pointer border ${isSel ? 'border-indigo-400 shadow-sm' : 'border-gray-200'} transition-all"
               onclick="selectSection(${sec.id})">
            <div class="flex items-center gap-2">
              <span class="text-gray-500 text-xs cursor-grab">≡</span>
              <span class="text-xs font-bold text-gray-800 capitalize">🔲 Bölüm: ${sec.type}</span>
            </div>
            <button onclick="toggleLock('section', ${sec.id}, event)" class="text-xs text-gray-500 hover:text-indigo-600" title="Kilitle/Çöz">
              ${sec.isLocked ? '🔒' : '🔓'}
            </button>
          </div>
          <div class="mt-1 border-l-2 border-gray-200 ml-2 pl-1">
            ${buildLayerTree(null, sec.elements, 0)}
          </div>
        </div>
      `;
    });
  }
}

// ---------------- HTML EXPORT MOTORU ----------------
window.exportToHTML = function() {
  const fontName = state.globalFont.split(',')[0].replace(/'/g, '').trim();
  let fontLink = '';
  const googleFonts = ['Inter', 'Poppins', 'Roboto', 'Playfair Display', 'Merriweather', 'Oswald'];
  if (googleFonts.includes(fontName)) {
    fontLink = `<link href="https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;600;700;800&display=swap" rel="stylesheet">`;
  }

  const buildElementHTML = (el, section) => {
    const getShadow = (e) => e.shadowSize > 0 ? `box-shadow: 0px 10px ${e.shadowSize}px ${e.shadowColor || '#000000'}80;` : '';
    const getBorder = (e) => `border: ${e.borderWidth || 0}px solid ${e.borderColor || '#000000'}; box-sizing: border-box;`;
    const transitionStyle = "transition: all 0.3s ease;";

    let inlineStyle = `position: absolute; left: ${el.x}px; top: ${el.y}px; opacity: ${el.opacity}; font-family: ${el.fontFamily !== 'inherit' ? el.fontFamily : 'inherit'};`;
    
    // YENİ: Div ve Img boyutlarının export tarafında da eksiksiz işlenmesi
    if (el.type === 'div' || el.type === 'img') {
      inlineStyle += ` width: ${el.width}px; height: ${el.height}px;`;
    }

    let innerHTML = '';
    if (el.type === 'title') {
      innerHTML = `<h1 style="font-size:${el.fontSize}px; color:${el.color}; font-weight:${el.fontWeight}; margin:0; line-height:1.2; ${getBorder(el)} ${transitionStyle}" ${getHoverEvents(el)}>${el.content}</h1>`;
    } else if (el.type === 'text') {
      innerHTML = `<p style="font-size:${el.fontSize}px; color:${el.color}; margin:0; line-height:1.5; white-space:pre-wrap; ${getBorder(el)} ${transitionStyle}" ${getHoverEvents(el)}>${el.content}</p>`;
    } else if (el.type === 'button') {
      innerHTML = `<button style="font-size:${el.fontSize}px; background-color:${el.bgColor}; color:${el.color}; padding:${el.padding}px ${el.padding * 2}px; border-radius:${el.borderRadius}px; ${getShadow(el)} ${getBorder(el)} ${transitionStyle}" class="font-bold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer outline-none border-none" ${getHoverEvents(el)}>${el.content}</button>`;
    } else if (el.type === 'img') {
      innerHTML = `<img src="${el.url}" style="width:100%; height:100%; background-color:${el.bgColor}; border-radius:${el.borderRadius}px; object-fit:cover; ${getShadow(el)} ${getBorder(el)} ${transitionStyle}" alt="Görsel" ${getHoverEvents(el)}/>`;
    } else if (el.type === 'div') {
      let children = section.elements.filter(child => child.parentId === el.id);
      let childrenHTML = children.map(child => buildElementHTML(child, section)).join('');
      innerHTML = `<div style="background-color:${el.bgColor}; width:100%; height:100%; border-radius:${el.borderRadius}px; ${getShadow(el)} ${getBorder(el)} ${transitionStyle}" ${getHoverEvents(el)}>${childrenHTML}</div>`;
    }
    return `<div style="${inlineStyle}">${innerHTML}</div>`;
  };

  const sectionsToRender = [...state.sections].sort((a, b) => a.y - b.y);
  let bodyContent = sectionsToRender.map(sec => {
    let rootElements = sec.elements.filter(el => !el.parentId);
    let elementsHTML = rootElements.map(el => buildElementHTML(el, sec)).join('');

    return `
      <section class="section-wrapper" style="position: relative; width: 100%; min-height: ${sec.height}px; background-color: ${sec.bgColor}; overflow: hidden; display: flex; justify-content: center;">
        <div class="section-inner" data-width="${sec.width}" data-height="${sec.height}" style="position: relative; width: ${sec.width}px; height: ${sec.height}px; max-width: 100%; margin: 0 auto; transform-origin: top center;">
          ${elementsHTML}
        </div>
      </section>
    `;
  }).join('');

  const htmlTemplate = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Benim Portfolyom</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${fontLink}
  <style>
    body { font-family: ${state.globalFont}; margin: 0; padding: 0; background-color: #f8fafc; overflow-x: hidden; }
    .section-wrapper { transition: height 0.2s ease; }
    .section-inner { transition: transform 0.2s ease; }
  </style>
</head>
<body>
  ${bodyContent}
  <script>
    function scaleSections() {
      const wrappers = document.querySelectorAll('.section-wrapper');
      wrappers.forEach(wrapper => {
        const inner = wrapper.querySelector('.section-inner');
        const targetWidth = parseInt(inner.getAttribute('data-width'));
        const scale = Math.min(1, window.innerWidth / targetWidth);
        inner.style.transform = 'scale(' + scale + ')';
        wrapper.style.height = (parseInt(inner.getAttribute('data-height')) * scale) + 'px';
        wrapper.style.minHeight = (parseInt(inner.getAttribute('data-height')) * scale) + 'px';
      });
    }
    window.addEventListener('resize', scaleSections);
    scaleSections(); 
  </script>
</body>
</html>`;

  const blob = new Blob([htmlTemplate], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'portfolio.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ---------------- ORTA PANEL (KANVAS) ----------------
function renderMiddlePanel() {
  loadGlobalFont(); 
  middlePanel.innerHTML = '';
  
  const container = document.createElement('div');
  container.id = "canvas-zone";
  container.style.fontFamily = state.globalFont;
  
  let currentDeviceWidth = middlePanel.clientWidth;

  if (state.isPreview) {
    if (state.previewDevice === 'mobile') currentDeviceWidth = 375;
    else if (state.previewDevice === 'tablet') currentDeviceWidth = 768;
    
    container.style.width = state.previewDevice === 'desktop' ? '100%' : `${currentDeviceWidth}px`;
    container.style.margin = '0 auto';
    container.style.overflow = 'hidden';
    container.style.transform = 'scale(1)';
    container.className = `bg-white flex flex-col transition-all duration-300 ${state.previewDevice !== 'desktop' ? 'shadow-2xl my-10 rounded-3xl border-[12px] border-gray-900' : ''}`;
  } else {
    container.style.transform = `scale(${state.zoom})`;
    container.style.transformOrigin = 'top left';
    container.style.width = '6000px'; 
    container.style.height = '6000px'; 
    container.style.backgroundImage = 'radial-gradient(#cbd5e1 2px, transparent 2px)';
    container.style.backgroundSize = '40px 40px';
    container.style.backgroundColor = '#f8fafc';
    container.className = 'relative transition-transform duration-200';
  }

  container.addEventListener('click', (e) => {
    if (e.target === container || e.target.id === 'middle-panel') {
      state.selectedSectionId = null; state.selectedElementId = null;
      renderLeftPanel(); renderMiddlePanel(); renderRightPanel();
    }
  });

  container.addEventListener('dragover', e => e.preventDefault());
  container.addEventListener('drop', e => {
    e.preventDefault();
    if (e.dataTransfer.getData('source') === 'leftPanelSection') {
      addSectionToCanvas(e.dataTransfer.getData('type'), e.clientX, e.clientY);
    }
  });

  if (state.sections.length === 0) {
    container.innerHTML += `<div class="h-full w-full absolute top-0 left-0 flex flex-col items-center justify-center p-20 text-gray-400 pointer-events-none" style="transform: scale(${1/state.zoom})"><div class="text-6xl mb-4">📥</div>Kanvasa bir bölüm sürükleyin.</div>`;
  }

  const sectionsToRender = state.isPreview ? [...state.sections].sort((a, b) => a.y - b.y) : state.sections;

  sectionsToRender.forEach(section => {
    const isSecSelected = state.selectedSectionId === section.id && !state.isPreview;
    const wrapper = document.createElement('div');
    
    let responsiveScale = 1;
    if (state.isPreview) {
      responsiveScale = Math.min(1, currentDeviceWidth / section.width);
      wrapper.style.position = "relative"; 
      wrapper.style.width = "100%"; 
      wrapper.style.height = `${section.height * responsiveScale}px`;
    } else {
      wrapper.style.position = "absolute"; 
      wrapper.style.width = `${section.width}px`; 
      wrapper.style.height = `${section.height}px`;
      wrapper.style.left = `${section.x}px`; 
      wrapper.style.top = `${section.y}px`;
    }

    wrapper.className = `transition-all bg-white overflow-hidden flex justify-center ${!state.isPreview && isSecSelected ? 'border-[3px] border-indigo-500 shadow-2xl z-10' : !state.isPreview ? 'border-[3px] border-transparent hover:border-gray-400 shadow-lg' : ''}`;
    wrapper.style.backgroundColor = section.bgColor;

    const innerContent = document.createElement('div');
    innerContent.style.width = `${section.width}px`;
    innerContent.style.height = `${section.height}px`;
    innerContent.style.position = 'relative';

    if (state.isPreview) {
      innerContent.style.transform = `scale(${responsiveScale})`;
      innerContent.style.transformOrigin = 'top center';
      innerContent.style.margin = "0 auto";
    }

    if (!state.isPreview) {
      const typeLabel = document.createElement('div');
      typeLabel.className = "absolute top-2 left-2 bg-black/20 text-white text-xs px-2 py-1 rounded capitalize pointer-events-none z-0";
      typeLabel.innerText = section.type + (section.isLocked ? ' 🔒' : '');
      innerContent.appendChild(typeLabel);
    }

    const domNodes = {};

    section.elements.forEach(el => {
      const isElSelected = state.selectedElementId === el.id && !state.isPreview;
      const elDiv = document.createElement('div');
      elDiv.id = `el-${el.id}`;
      elDiv.style.position = 'absolute';
      elDiv.style.left = `${el.x}px`; 
      elDiv.style.top = `${el.y}px`;
      elDiv.style.opacity = el.opacity;
      elDiv.style.fontFamily = el.fontFamily !== 'inherit' ? el.fontFamily : 'inherit';
      
      // YENİ: Kapsayıcı (wrapper) elDiv'in boyutlarını içerik kadar sabitliyoruz ki Hover/Drag olayları bozulmasın
      if (el.type === 'div' || el.type === 'img') {
        elDiv.style.width = `${el.width}px`;
        elDiv.style.height = `${el.height}px`;
      }
      
      elDiv.className = `group ${!state.isPreview && isElSelected ? 'outline outline-[3px] outline-indigo-500 z-20' : !state.isPreview ? 'hover:outline hover:outline-2 hover:outline-gray-400 z-10' : ''}`;
      if (!state.isPreview && !el.isLocked) elDiv.style.cursor = 'move';

      const getShadow = (element) => element.shadowSize > 0 ? `box-shadow: 0px 10px ${element.shadowSize}px ${element.shadowColor || '#000000'}80;` : '';
      const getBorder = (element) => `border: ${element.borderWidth || 0}px solid ${element.borderColor || '#000000'}; box-sizing: border-box;`;
      const transitionStyle = "transition: all 0.3s ease;";

      if (el.type === 'title') {
        elDiv.innerHTML = `<h1 style="font-size:${el.fontSize}px; color:${el.color}; font-weight:${el.fontWeight}; margin:0; line-height:1.2; ${getBorder(el)} ${transitionStyle}" ${getHoverEvents(el)}>${el.content}</h1>`;
      } else if (el.type === 'text') {
        elDiv.innerHTML = `<p style="font-size:${el.fontSize}px; color:${el.color}; margin:0; line-height:1.5; white-space:pre-wrap; ${getBorder(el)} ${transitionStyle}" ${getHoverEvents(el)}>${el.content}</p>`;
      } else if (el.type === 'button') {
        elDiv.innerHTML = `<button style="font-size:${el.fontSize}px; background-color:${el.bgColor}; color:${el.color}; padding:${el.padding}px ${el.padding * 2}px; border-radius:${el.borderRadius}px; ${getShadow(el)} ${getBorder(el)} ${transitionStyle}" class="font-bold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer outline-none border-none">${el.content}</button>`;
      } else if (el.type === 'img') {
        // İçeriği %100 yapıyoruz çünkü dış wrapper (elDiv) artık boyutları tutuyor
        elDiv.innerHTML = `<img src="${el.url}" style="width:100%; height:100%; background-color:${el.bgColor}; border-radius:${el.borderRadius}px; object-fit:cover; ${getShadow(el)} ${getBorder(el)} ${transitionStyle}" class="${state.isPreview ? '' : 'pointer-events-none w-full h-full'}" alt="Görsel" ${getHoverEvents(el)}/>`;
      } else if (el.type === 'div') {
        // YENİ: Div içindeki renkli bölüm %100 boyut alır. pointer-events-none sayesinde sürükleme ve tıklama dış wrapper'da (elDiv) hatasız işlenir!
        elDiv.innerHTML = `<div class="${state.isPreview ? '' : 'pointer-events-none'}" style="background-color:${el.bgColor}; width:100%; height:100%; border-radius:${el.borderRadius}px; ${getShadow(el)} ${getBorder(el)} ${transitionStyle}" ${getHoverEvents(el)}></div>`;
      }

      if (!state.isPreview && isElSelected && !el.isLocked) {
        const btnScale = 1 / state.zoom;
        elDiv.innerHTML += `<div onclick="removeElement(${section.id}, ${el.id}, event)" style="transform: scale(${btnScale}); transform-origin: top right;" class="absolute -top-4 -right-4 bg-red-500 text-white w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shadow-lg cursor-pointer hover:bg-red-600 z-50">✕</div>`;
      }

      if (!state.isPreview && !el.isLocked) {
        elDiv.draggable = true;
        elDiv.addEventListener('dragstart', e => {
          e.stopPropagation(); 
          state.draggedType = 'element'; state.draggedSectionId = section.id; state.draggedElementId = el.id;
          
          state.dragOffsetX = 0; 
          state.dragOffsetY = 0;
          
          e.dataTransfer.setData('source', 'canvasMoveElement');
          setTimeout(() => elDiv.classList.add('opacity-50'), 0);
        });
        elDiv.addEventListener('dragend', () => {
          elDiv.classList.remove('opacity-50');
          saveState(true); 
        });
        
        if (el.type === 'div') {
          elDiv.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); });
          elDiv.addEventListener('drop', e => {
            e.preventDefault(); e.stopPropagation();
            const source = e.dataTransfer.getData('source');
            const rect = elDiv.getBoundingClientRect(); 
            
            if (source === 'leftPanelElement') { 
              const type = e.dataTransfer.getData('type');
              const x = (e.clientX - rect.left) / state.zoom; 
              const y = (e.clientY - rect.top) / state.zoom;
              addElementFromDrag(section.id, type, snap(Math.max(0, x)), snap(Math.max(0, y)), el.id); 
            } 
            else if (source === 'canvasMoveElement') { 
              const movedEl = section.elements.find(e => e.id === state.draggedElementId);
              if (movedEl && movedEl.id !== el.id) {
                movedEl.parentId = el.id; 
                movedEl.x = snap(Math.max(0, (e.clientX - rect.left) / state.zoom - state.dragOffsetX));
                movedEl.y = snap(Math.max(0, (e.clientY - rect.top) / state.zoom - state.dragOffsetY));
                saveState(true); renderMiddlePanel();
              }
            }
          });
        }
      }

      elDiv.addEventListener('click', e => selectElement(el.id, e));
      domNodes[el.id] = elDiv;
    });

    section.elements.forEach(el => {
      if (el.parentId && domNodes[el.parentId]) {
        domNodes[el.parentId].appendChild(domNodes[el.id]);
      } else {
        innerContent.appendChild(domNodes[el.id]);
      }
    });

    if (!state.isPreview) {
      innerContent.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); });
      innerContent.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation();
        const source = e.dataTransfer.getData('source');
        const innerRect = innerContent.getBoundingClientRect(); 

        if (source === 'leftPanelElement') { 
          const type = e.dataTransfer.getData('type');
          const x = (e.clientX - innerRect.left) / state.zoom; 
          const y = (e.clientY - innerRect.top) / state.zoom;
          addElementFromDrag(section.id, type, snap(Math.max(0, x)), snap(Math.max(0, y)), null); 
        } 
        else if (source === 'canvasMoveElement') { 
          const newX = (e.clientX - innerRect.left) / state.zoom - state.dragOffsetX;
          const newY = (e.clientY - innerRect.top) / state.zoom - state.dragOffsetY;
          const el = section.elements.find(e => e.id === state.draggedElementId);
          if (el) { 
            el.parentId = null; 
            el.x = snap(Math.max(0, newX)); 
            el.y = snap(Math.max(0, newY)); 
          }
          saveState(true); renderMiddlePanel();
        }
      });
    }

    wrapper.appendChild(innerContent);
    
    if (!state.isPreview && !section.isLocked) {
      wrapper.draggable = true;
      wrapper.addEventListener('dragstart', (e) => { 
        if (state.draggedType === 'element') return; 
        state.draggedType = 'section'; state.draggedSectionId = section.id;
        
        state.dragOffsetX = 0; 
        state.dragOffsetY = 0;
        
        e.dataTransfer.setData('source', 'canvasMoveSection');
        setTimeout(() => wrapper.classList.add('opacity-40'), 0);
      });
      wrapper.addEventListener('dragend', () => {
        wrapper.classList.remove('opacity-40');
        saveState(true);
      });
      
      container.addEventListener('drop', e => {
        if (e.dataTransfer.getData('source') === 'canvasMoveSection') {
          const containerRect = container.getBoundingClientRect();
          const newX = (e.clientX - containerRect.left) / state.zoom - state.dragOffsetX;
          const newY = (e.clientY - containerRect.top) / state.zoom - state.dragOffsetY;
          
          const sec = state.sections.find(s => s.id === state.draggedSectionId);
          if(sec) { sec.x = snap(Math.max(0, newX)); sec.y = snap(Math.max(0, newY)); }
          saveState(true); renderMiddlePanel();
        }
      });
    }

    wrapper.addEventListener('click', () => selectSection(section.id));
    container.appendChild(wrapper);
  });

  middlePanel.appendChild(container);
}

function renderRightPanel() {
  if (!state.selectedSectionId && !state.selectedElementId) {
    rightPanel.innerHTML = `
      <div class="h-full flex flex-col">
        <h2 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 border-b pb-2">Genel Ayarlar</h2>
        <div class="space-y-6">
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
            <label class="block text-sm font-semibold text-gray-800 mb-2">🎨 Site Yazı Tipi (Font)</label>
            <select id="set-global-font" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 bg-white">
              <option value="'Inter', sans-serif" ${state.globalFont.includes('Inter') ? 'selected' : ''}>Inter (Modern & Temiz)</option>
              <option value="'Poppins', sans-serif" ${state.globalFont.includes('Poppins') ? 'selected' : ''}>Poppins (Yuvarlak & Samimi)</option>
              <option value="'Roboto', sans-serif" ${state.globalFont.includes('Roboto') ? 'selected' : ''}>Roboto (Klasik & Okunaklı)</option>
              <option value="'Playfair Display', serif" ${state.globalFont.includes('Playfair') ? 'selected' : ''}>Playfair Display (Zarif Serif)</option>
              <option value="'Merriweather', serif" ${state.globalFont.includes('Merriweather') ? 'selected' : ''}>Merriweather (Geleneksel Serif)</option>
              <option value="'Oswald', sans-serif" ${state.globalFont.includes('Oswald') ? 'selected' : ''}>Oswald (Dar & Kalın Başlıklar)</option>
              <option value="'Courier New', monospace" ${state.globalFont.includes('Courier') ? 'selected' : ''}>Courier New (Yazılımcı Tarzı)</option>
            </select>
          </div>
          <div class="text-center text-gray-400 mt-10 text-sm">Ayarları görmek için tuvaldeki bir bölüme veya öğeye tıklayın.</div>
        </div>
      </div>
    `;
    document.getElementById('set-global-font').addEventListener('change', (e) => {
      state.globalFont = e.target.value; saveState(true); renderMiddlePanel(); 
    });
    return;
  }

  const section = state.sections.find(s => s.id === state.selectedSectionId);
  if (!section) return;

  if (state.selectedElementId) {
    const el = section.elements.find(e => e.id === state.selectedElementId);
    if (!el) return;

    let html = `
      <div class="flex items-center justify-between mb-4 border-b pb-2">
        <h2 class="text-xs font-bold text-indigo-600 uppercase tracking-wider">Öğe Ayarları (${el.type}) ${el.isLocked ? '🔒' : ''}</h2>
      </div>
    `;

    const alignHtml = `
      <div class="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-2">Hizalama & Konum</label>
        <div class="grid grid-cols-6 gap-1 mb-3">
          <button onclick="alignElement('left')" class="p-1 bg-white border border-gray-300 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-lg flex items-center justify-center ${el.isLocked ? 'opacity-50 cursor-not-allowed' : ''}" title="Sola Hizala">⇤</button>
          <button onclick="alignElement('center')" class="p-1 bg-white border border-gray-300 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-lg flex items-center justify-center ${el.isLocked ? 'opacity-50 cursor-not-allowed' : ''}" title="Yatay Ortala">↔</button>
          <button onclick="alignElement('right')" class="p-1 bg-white border border-gray-300 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-lg flex items-center justify-center ${el.isLocked ? 'opacity-50 cursor-not-allowed' : ''}" title="Sağa Hizala">⇥</button>
          <button onclick="alignElement('top')" class="p-1 bg-white border border-gray-300 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-lg flex items-center justify-center ${el.isLocked ? 'opacity-50 cursor-not-allowed' : ''}" title="Üste Hizala">⇡</button>
          <button onclick="alignElement('middle')" class="p-1 bg-white border border-gray-300 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-lg flex items-center justify-center ${el.isLocked ? 'opacity-50 cursor-not-allowed' : ''}" title="Dikey Ortala">↕</button>
          <button onclick="alignElement('bottom')" class="p-1 bg-white border border-gray-300 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-lg flex items-center justify-center ${el.isLocked ? 'opacity-50 cursor-not-allowed' : ''}" title="Alta Hizala">⇟</button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex items-center text-xs"><span class="w-4 text-gray-500 font-bold">X:</span> <input type="number" id="set-x" value="${el.x}" class="w-full border rounded px-2 py-1 bg-white" ${el.isLocked ? 'disabled' : ''} /></div>
          <div class="flex items-center text-xs"><span class="w-4 text-gray-500 font-bold">Y:</span> <input type="number" id="set-y" value="${el.y}" class="w-full border rounded px-2 py-1 bg-white" ${el.isLocked ? 'disabled' : ''} /></div>
        </div>
      </div>
    `;

    html += alignHtml + `<div class="space-y-4 ${el.isLocked ? 'opacity-50 pointer-events-none' : ''}">`;

    const opacityHtml = `
      <div>
        <label class="block text-xs font-semibold text-gray-700 mb-1 flex justify-between"><span>Şeffaflık (Opacity)</span> <span>${el.opacity}</span></label>
        <input id="set-opacity" type="range" min="0.1" max="1" step="0.1" value="${el.opacity}" class="w-full accent-indigo-600">
      </div>
    `;
    const fontHtml = `
      <div>
        <label class="block text-xs font-semibold text-gray-700 mb-1">Özel Font</label>
        <select id="set-fontfamily" class="w-full border rounded px-2 py-1 text-xs focus:ring-indigo-500 bg-white">
          <option value="inherit" ${el.fontFamily === 'inherit' ? 'selected' : ''}>-- Genel Font --</option>
          <option value="'Inter', sans-serif" ${el.fontFamily.includes('Inter') ? 'selected' : ''}>Inter</option>
          <option value="'Courier New', monospace" ${el.fontFamily.includes('Courier') ? 'selected' : ''}>Courier New</option>
          <option value="'Playfair Display', serif" ${el.fontFamily.includes('Playfair') ? 'selected' : ''}>Playfair</option>
        </select>
      </div>
    `;
    const shadowHtml = `
      <div class="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 mt-3">
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1 flex justify-between"><span>Gölge (Blur)</span> <span>${el.shadowSize || 0}px</span></label>
          <input id="set-shadowsize" type="range" min="0" max="100" step="1" value="${el.shadowSize || 0}" class="w-full accent-indigo-600">
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Gölge Rengi</label>
          <input id="set-shadowcolor" type="color" value="${el.shadowColor || '#000000'}" class="w-full h-8 border rounded cursor-pointer">
        </div>
      </div>
    `;
    const borderHtml = `
      <div class="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 mt-3">
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1 flex justify-between"><span>Kenarlık Kalınlığı</span> <span>${el.borderWidth || 0}px</span></label>
          <input id="set-borderwidth" type="range" min="0" max="20" step="1" value="${el.borderWidth || 0}" class="w-full accent-indigo-600">
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Kenarlık Rengi</label>
          <input id="set-bordercolor" type="color" value="${el.borderColor || '#000000'}" class="w-full h-8 border rounded cursor-pointer">
        </div>
      </div>
    `;
    const hoverHtml = `
      <div class="border-t border-gray-100 pt-3 mt-3 bg-indigo-50/50 p-2 rounded">
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-bold text-indigo-800">Hover Efekti (Üzerine Gelince)</label>
          <input id="set-hashover" type="checkbox" ${el.hasHover ? 'checked' : ''} class="w-4 h-4 text-indigo-600 rounded cursor-pointer">
        </div>
        ${el.hasHover ? `
          <div class="grid grid-cols-2 gap-2 mt-2">
            ${['title', 'text', 'button'].includes(el.type) ? `
              <div>
                <label class="block text-[10px] font-semibold text-gray-600 mb-1">Yazı Rengi</label>
                <input id="set-hovercolor" type="color" value="${el.hoverColor || '#4f46e5'}" class="w-full h-8 border rounded cursor-pointer">
              </div>
            ` : ''}
            ${['button', 'img', 'div'].includes(el.type) ? `
              <div>
                <label class="block text-[10px] font-semibold text-gray-600 mb-1">Arka Plan Rengi</label>
                <input id="set-hoverbgcolor" type="color" value="${el.hoverBgColor || '#e0e7ff'}" class="w-full h-8 border rounded cursor-pointer">
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;

    if (el.type === 'img') {
      html += `
        <div class="bg-indigo-50/50 p-3 rounded border border-indigo-100 mb-3">
          <label class="block text-xs font-bold text-indigo-800 mb-2">Görsel Kaynağı</label>
          
          <button onclick="document.getElementById('img-upload-${el.id}').click()" class="w-full bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold py-2 rounded text-xs transition-colors shadow-sm mb-2">
            📁 Bilgisayardan Resim Yükle
          </button>
          <input type="file" id="img-upload-${el.id}" class="hidden" accept="image/*" onchange="handleImageUpload(event)">
          
          <div class="flex items-center justify-center gap-2 mb-2">
            <div class="h-px bg-gray-300 flex-1"></div>
            <span class="text-[10px] text-gray-400 font-bold">VEYA URL GİR</span>
            <div class="h-px bg-gray-300 flex-1"></div>
          </div>
          
          <input id="set-url" type="text" value="${el.url.startsWith('data:image') ? 'Sistemden Yüklendi (Base64)' : el.url}" ${el.url.startsWith('data:image') ? 'disabled' : ''} class="w-full border rounded px-3 py-2 text-xs bg-white text-gray-600 placeholder-gray-400">
        </div>
      `;
    }

    if (el.type === 'title' || el.type === 'text') {
      html += `
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">İçerik (Metin)</label>
          <textarea id="set-content" rows="3" class="w-full border rounded px-3 py-2 text-sm focus:ring-indigo-500 bg-gray-50 resize-none">${el.content}</textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1 flex justify-between"><span>Büyüklük (Boyut)</span> <span>${el.fontSize}px</span></label>
          <input id="set-fontsize" type="range" min="12" max="120" step="1" value="${el.fontSize}" class="w-full accent-indigo-600">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="block text-xs font-semibold text-gray-700 mb-1">Rengi</label><input id="set-color" type="color" value="${el.color}" class="w-full h-8 border rounded cursor-pointer"></div>
          ${fontHtml}
        </div>
      `;
    }

    if (el.type === 'button') {
      html += `
        <div><label class="block text-sm font-semibold text-gray-700 mb-1">Buton Yazısı</label><input id="set-content" type="text" value="${el.content}" class="w-full border rounded px-3 py-2 text-sm"></div>
        <div><label class="block text-xs font-semibold text-gray-700 mb-1 flex justify-between"><span>Yazı Büyüklüğü</span> <span>${el.fontSize}px</span></label><input id="set-fontsize" type="range" min="10" max="48" step="1" value="${el.fontSize}" class="w-full accent-indigo-600"></div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="block text-xs font-semibold text-gray-700 mb-1">Yazı Rengi</label><input id="set-color" type="color" value="${el.color}" class="w-full h-8 border rounded cursor-pointer"></div>
          <div><label class="block text-xs font-semibold text-gray-700 mb-1">Arka Plan Rengi</label><input id="set-bgcolor" type="color" value="${el.bgColor}" class="w-full h-8 border rounded cursor-pointer"></div>
        </div>
        <div><label class="block text-xs font-semibold text-gray-700 mb-1 flex justify-between"><span>Kenar Yuvarlama</span> <span>${el.borderRadius}px</span></label><input id="set-borderradius" type="range" min="0" max="50" step="1" value="${el.borderRadius}" class="w-full accent-indigo-600"></div>
      `;
    }

    if (el.type === 'img') {
      html += `
        <div class="grid grid-cols-2 gap-2">
          <div><label class="block text-xs font-semibold text-gray-700 mb-1">Genişlik (px)</label><input id="set-width" type="number" value="${el.width}" class="w-full border rounded px-2 py-1 text-sm"></div>
          <div><label class="block text-xs font-semibold text-gray-700 mb-1">Yükseklik (px)</label><input id="set-height" type="number" value="${el.height}" class="w-full border rounded px-2 py-1 text-sm"></div>
        </div>
        <div><label class="block text-xs font-semibold text-gray-700 mb-1">Arka Plan Rengi (Boşluklar için)</label><input id="set-bgcolor" type="color" value="${el.bgColor}" class="w-full h-8 border rounded cursor-pointer"></div>
        <div><label class="block text-xs font-semibold text-gray-700 mb-1 flex justify-between"><span>Kenar Yuvarlama</span> <span>${el.borderRadius}px</span></label><input id="set-borderradius" type="range" min="0" max="150" step="1" value="${el.borderRadius}" class="w-full accent-indigo-600"></div>
      `;
    }

    if (el.type === 'div') {
      html += `
        <div><label class="block text-sm font-semibold text-gray-700 mb-1">Arka Plan Rengi</label><input id="set-bgcolor" type="color" value="${el.bgColor}" class="w-full h-10 border rounded cursor-pointer shadow-sm"></div>
        <div class="grid grid-cols-2 gap-2 mt-3">
          <div><label class="block text-xs font-semibold text-gray-700 mb-1">Genişlik (px)</label><input id="set-width" type="number" value="${el.width}" class="w-full border rounded px-2 py-1 text-sm"></div>
          <div><label class="block text-xs font-semibold text-gray-700 mb-1">Yükseklik (px)</label><input id="set-height" type="number" value="${el.height}" class="w-full border rounded px-2 py-1 text-sm"></div>
        </div>
        <div class="mt-3"><label class="block text-xs font-semibold text-gray-700 mb-1 flex justify-between"><span>Kenar Yuvarlama</span> <span>${el.borderRadius}px</span></label><input id="set-borderradius" type="range" min="0" max="500" step="1" value="${el.borderRadius}" class="w-full accent-indigo-600"></div>
      `;
    }

    if (el.type !== 'img') {
       html += opacityHtml + borderHtml + hoverHtml;
    } else {
       html += opacityHtml + borderHtml + shadowHtml + hoverHtml;
    }
    
    if (el.type === 'div' || el.type === 'button') {
        html += shadowHtml;
    }

    html += `</div>`;
    
    html += `
      <div class="grid grid-cols-2 gap-2 mt-8 border-t border-gray-200 pt-4 ${el.isLocked ? 'opacity-50 pointer-events-none' : ''}">
        <button onclick="duplicateSelected()" class="w-full bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white px-3 py-2 rounded font-bold transition-colors shadow-sm text-xs">📄 Çoğalt (Ctrl+D)</button>
        <button onclick="removeElement(${section.id}, ${el.id})" class="w-full bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-3 py-2 rounded font-bold transition-colors shadow-sm text-xs">🗑️ Sil (Del)</button>
      </div>
    `;

    rightPanel.innerHTML = html;

    const hoverCheck = document.getElementById('set-hashover');
    if (hoverCheck) hoverCheck.addEventListener('change', (e) => updateSelectedData('hasHover', e.target.checked, true, true));

    ['content', 'fontSize', 'color', 'bgColor', 'padding', 'borderRadius', 'url', 'width', 'height', 'opacity', 'fontFamily', 'shadowSize', 'shadowColor', 'borderWidth', 'borderColor', 'hoverColor', 'hoverBgColor', 'x', 'y'].forEach(key => {
      const input = document.getElementById(`set-${key.toLowerCase()}`);
      if(input) {
        input.addEventListener('input', (e) => {
          updateSelectedData(key, e.target.value, false, false);
          if (input.type === 'range') e.target.previousElementSibling.querySelector('span:last-child').innerText = e.target.value + (key === 'opacity' ? '' : 'px');
        });
        input.addEventListener('change', (e) => updateSelectedData(key, e.target.value, false, true));
      }
    });
  } 
  
  else {
    rightPanel.innerHTML = `
      <h2 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 border-b pb-2">Bölüm Ayarları (${section.type}) ${section.isLocked ? '🔒' : ''}</h2>
      <div class="space-y-4 ${section.isLocked ? 'opacity-50 pointer-events-none' : ''}">
        <div><label class="block text-sm font-semibold text-gray-700 mb-1">Arka Plan Rengi</label><input id="set-bgcolor" type="color" value="${section.bgColor}" class="w-full h-10 border rounded cursor-pointer shadow-sm"></div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1 flex justify-between"><span>İçerik Genişliği (Responsive Sınır)</span> <span>${section.width}px</span></label>
          <input id="set-width" type="range" min="400" max="1600" step="10" value="${section.width}" class="w-full accent-indigo-600">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1 flex justify-between"><span>Yükseklik (Height)</span> <span>${section.height}px</span></label>
          <input id="set-height" type="range" min="100" max="1500" step="10" value="${section.height}" class="w-full accent-indigo-600">
        </div>
        
        <div class="grid grid-cols-2 gap-2 mt-8 border-t border-gray-200 pt-4">
          <button onclick="duplicateSelected()" class="w-full bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white px-3 py-2 rounded font-bold transition-colors shadow-sm text-xs">📄 Çoğalt (Ctrl+D)</button>
          <button onclick="removeSection(${section.id}, event)" class="w-full bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-3 py-2 rounded font-bold transition-colors shadow-sm text-xs">🗑️ Sil (Del)</button>
        </div>
      </div>
    `;

    document.getElementById('set-bgcolor').addEventListener('input', e => updateSelectedData('bgColor', e.target.value, false, false));
    document.getElementById('set-bgcolor').addEventListener('change', e => updateSelectedData('bgColor', e.target.value, false, true));
    
    document.getElementById('set-width').addEventListener('input', e => { updateSelectedData('width', e.target.value, false, false); e.target.previousElementSibling.querySelector('span:last-child').innerText = e.target.value + 'px'; });
    document.getElementById('set-width').addEventListener('change', e => updateSelectedData('width', e.target.value, false, true));
    
    document.getElementById('set-height').addEventListener('input', e => { updateSelectedData('height', e.target.value, false, false); e.target.previousElementSibling.querySelector('span:last-child').innerText = e.target.value + 'px'; });
    document.getElementById('set-height').addEventListener('change', e => updateSelectedData('height', e.target.value, false, true));
  }
}

window.togglePreview = () => {
  state.isPreview = !state.isPreview;
  document.getElementById('toolbar-edit').style.display = state.isPreview ? 'none' : 'flex';
  document.getElementById('toolbar-preview').style.display = state.isPreview ? 'flex' : 'none';
  if (!state.isPreview) { state.selectedSectionId = null; state.selectedElementId = null; renderLeftPanel(); renderRightPanel(); }
  renderMiddlePanel();
};

window.clearCanvas = () => {
  if (confirm('Tüm tasarımı temizlemek istediğinize emin misiniz?')) {
    state.sections = []; state.selectedSectionId = null; state.selectedElementId = null;
    saveState(true); renderLeftPanel(); renderMiddlePanel(); renderRightPanel();
  }
};

renderLeftPanel();
renderMiddlePanel();
renderRightPanel();