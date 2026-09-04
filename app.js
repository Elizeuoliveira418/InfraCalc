import { db } from './db.js';

// Global application state
let circuitCables = [];
let activeTab = 'condutos';
let activeTheme = 'dark';
// Custom DB state for CRUD
let customDb = {
  cabos: [],
  condutos: []
};



// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  loadCustomDb();
  initTheme();
  loadState();
  initTabs();
  initCrudTab();
  initConduitTab();
  initThemeToggle();
  initPdfExport();

  // Restore active main tab
  const savedTab = localStorage.getItem('activeTab');
  if (savedTab) {
    const tabEl = document.querySelector(`.nav-item[data-tab="${savedTab}"]`);
    if (tabEl) tabEl.click();
  } else {
    // Default click condutos
    document.querySelector('.nav-item[data-tab="condutos"]').click();
  }
  
  // Restore active CRUD sub-tab
  const savedCrudTab = localStorage.getItem('activeCrudTab');
  if (savedCrudTab && savedTab === 'crud') {
    const crudTabEl = document.getElementById(savedCrudTab);
    if (crudTabEl) crudTabEl.click();
  }
});

// Theme Initialization and Toggle
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    activeTheme = 'light';
    document.body.classList.add('light-theme');
  } else {
    activeTheme = 'dark';
    document.body.classList.remove('light-theme');
  }
}

function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  toggleBtn.addEventListener('click', () => {
    if (activeTheme === 'dark') {
      activeTheme = 'light';
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      activeTheme = 'dark';
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }
  });
}

// Tab Switching Lógica
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  const pageTitle = document.getElementById('page-title');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      
      // Remove active class from nav items and add to clicked
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Toggle tab contents visibility
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-content-${tabId}`).classList.add('active');
      
      // Update page title and save state
      activeTab = tabId;
      localStorage.setItem('activeTab', tabId);
      if (tabId === 'condutos') pageTitle.textContent = 'Dimensionamento de Condutos';
      else if (tabId === 'crud') pageTitle.textContent = 'Cadastros Base';
    });
  });
}

// Save & Load state to localStorage
function saveState() {
  localStorage.setItem('circuitCables', JSON.stringify(circuitCables));
}

function loadState() {
  const savedCables = localStorage.getItem('circuitCables');
  if (savedCables) {
    try {
      circuitCables = JSON.parse(savedCables);
    } catch (e) {
      circuitCables = [];
    }
  }
}


/* ================= ABAS LOGIC ================= */

// 1. CONDUTOS TAB
function initConduitTab() {
  const categorySelect = document.getElementById('cable-category');
  const typeSelect = document.getElementById('cable-type');
  const sizeSelect = document.getElementById('cable-size');
  const form = document.getElementById('cable-form');
  const familySelect = document.getElementById('conduit-family');
  const clearBtn = document.getElementById('clear-cables-btn');
  const occRules = document.getElementsByName('occ-rule');
  
  // Populate categories change trigger
  categorySelect.addEventListener('change', () => {
    populateCableTypes();
    updateCableSizeLabel();
  });
  
  typeSelect.addEventListener('change', () => {
    populateCableSizes();
  });
  
  // Initial population
  populateCableTypes();
  populateConduitFamilies();
  updateCableSizeLabel();
  
  // Handle form add cable
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const category = categorySelect.value;
    const type = typeSelect.value;
    const size = sizeSelect.value;
    const qty = parseInt(document.getElementById('cable-qty').value);
    
    // Find cable diameter
    let de = 0;
    try {
      de = db.cabos[category].sizes[size][type];
    } catch (err) {
      de = 0;
    }
    
    if (!de || isNaN(de)) {
      alert("Cabo não encontrado ou bitola indisponível para este tipo.");
      return;
    }
    
    // Calculate area: qty * (PI * DE^2) / 4
    const area = qty * (Math.PI * Math.pow(de, 2)) / 4;
    
    // Check if cable already exists in circuit, if so merge quantity
    const existingIdx = circuitCables.findIndex(c => c.category === category && c.type === type && c.size === size);
    if (existingIdx > -1) {
      circuitCables[existingIdx].qty += qty;
      circuitCables[existingIdx].area = circuitCables[existingIdx].qty * (Math.PI * Math.pow(de, 2)) / 4;
    } else {
      circuitCables.push({
        id: Date.now() + Math.random().toString(36).substr(2, 5),
        category,
        type,
        size,
        qty,
        de,
        area
      });
    }
    
    saveState();
    renderCables();
    calculateConduits();
    form.reset();
    document.getElementById('cable-qty').value = 1;
    categorySelect.value = category;
    populateCableTypes();
    typeSelect.value = type;
    populateCableSizes();
    sizeSelect.value = size;
  });
  
  // Clear button
  clearBtn.addEventListener('click', () => {
    if (confirm("Deseja realmente limpar toda a lista de cabos?")) {
      circuitCables = [];
      saveState();
      renderCables();
      calculateConduits();
    }
  });
  
  // Occupancy rule toggle
  occRules.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const customContainer = document.getElementById('custom-occ-container');
      if (e.target.value === 'custom') {
        customContainer.style.display = 'block';
      } else {
        customContainer.style.display = 'none';
      }
      calculateConduits();
    });
  });
  
  const customOccInput = document.getElementById('custom-occ-value');
  if (customOccInput) {
    customOccInput.addEventListener('input', () => {
      if (document.querySelector('input[name="occ-rule"]:checked').value === 'custom') {
        calculateConduits();
      }
    });
  }
  
  familySelect.addEventListener('change', () => {
    calculateConduits();
  });
  
  // Initial renders
  renderCables();
  calculateConduits();
}

function updateCableSizeLabel() {
  const category = document.getElementById('cable-category').value;
  const label = document.getElementById('label-cable-size');
  if (label) {
    label.textContent = category === 'energia' ? 'Seção Nominal' : 'Nº de Pares';
  }
}

function populateCableTypes() {
  const categorySelect = document.getElementById('cable-category');
  if (!categorySelect) return;
  const category = categorySelect.value;
  const typeSelect = document.getElementById('cable-type');
  if (!typeSelect) return;
  typeSelect.innerHTML = '';
  
  const headers = (db.cabos && db.cabos[category]) ? (db.cabos[category].headers || []) : [];
  headers.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = h;
    typeSelect.appendChild(opt);
  });
  
  populateCableSizes();
}

function populateCableSizes() {
  const categorySelect = document.getElementById('cable-category');
  const typeSelect = document.getElementById('cable-type');
  const sizeSelect = document.getElementById('cable-size');
  if (!categorySelect || !typeSelect || !sizeSelect) return;
  
  const category = categorySelect.value;
  const type = typeSelect.value;
  sizeSelect.innerHTML = '';
  
  if (!db.cabos || !db.cabos[category] || !db.cabos[category].sizes || !type) return;
  
  const sizes = Object.keys(db.cabos[category].sizes);
  
  // Filter sizes that have valid data for this cable type
  sizes.forEach(s => {
    const val = db.cabos[category].sizes[s][type];
    if (val !== null && val !== undefined && val !== "") {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      sizeSelect.appendChild(opt);
    }
  });
}

function populateConduitFamilies() {
  const familySelect = document.getElementById('conduit-family');
  familySelect.innerHTML = '';
  
  db.condutos.familias.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.prefix;
    opt.textContent = f.name;
    familySelect.appendChild(opt);
  });
}

function renderCables() {
  const list = document.getElementById('cables-list');
  list.innerHTML = '';
  
  if (circuitCables.length === 0) {
    list.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Nenhum cabo adicionado ao circuito.</td></tr>`;
    return;
  }
  
  circuitCables.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge ${c.category === 'energia' ? 'btn-primary' : 'btn-success'}">${c.category.toUpperCase()}</span></td>
      <td>${c.type}</td>
      <td>${c.size}</td>
      <td>${c.qty}</td>
      <td>${Number(c.de).toFixed(1)} mm</td>
      <td>${Number(c.area).toFixed(1)} mm²</td>
      <td>
        <button class="btn-remove-cable" data-id="${c.id}" title="Remover cabo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </td>
    `;
    list.appendChild(tr);
  });
  
  // Add remove event listeners
  document.querySelectorAll('.btn-remove-cable').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      circuitCables = circuitCables.filter(c => c.id !== id);
      saveState();
      renderCables();
      calculateConduits();
    });
  });
}

function calculateConduits() {
  // Sum quantities and areas
  const totalQty = circuitCables.reduce((acc, curr) => acc + curr.qty, 0);
  const totalArea = circuitCables.reduce((acc, curr) => acc + curr.area, 0);
  
  // Update metrics UI
  document.getElementById('summary-total-qty').textContent = totalQty;
  document.getElementById('summary-total-area').innerHTML = `${totalArea.toFixed(1)} <span class="unit">mm²</span>`;
  
  // Determine occupancy limit
  const ruleType = document.querySelector('input[name="occ-rule"]:checked').value;
  let occupancyLimit = 0.40; // Default 40%
  
  if (ruleType === 'nbr') {
    if (totalQty === 0) occupancyLimit = 0.00;
    else if (totalQty === 1) occupancyLimit = 0.53;
    else if (totalQty === 2) occupancyLimit = 0.31;
    else occupancyLimit = 0.40;
  } else if (ruleType === 'telecom') {
    occupancyLimit = 0.20; // Custom/telecom 20%
  } else if (ruleType === 'custom') {
    const customVal = parseFloat(document.getElementById('custom-occ-value').value) || 40;
    occupancyLimit = customVal / 100;
  }
  
  document.getElementById('summary-occupancy-limit').textContent = `${(occupancyLimit * 100).toFixed(0)}%`;
  
  // Calculate conduit suitability
  const familyPrefix = document.getElementById('conduit-family').value;
  const resultList = document.getElementById('conduits-result-list');
  resultList.innerHTML = '';
  
  if (circuitCables.length === 0) {
    resultList.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Adicione cabos ao circuito para calcular os condutos.</td></tr>`;
    return;
  }
  
  // Filter conduit items by selected family prefix
  const familyItems = db.condutos.itens.filter(item => item.prefix === familyPrefix);
  
  if (familyItems.length === 0) {
    resultList.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Nenhum eletroduto disponível nesta família.</td></tr>`;
    return;
  }
  
  // Sizing calculation for each item
  let recommendedIdx = -1; // Smallest size that fits in 1 conduit
  
  const calculatedItems = familyItems.map((item, idx) => {
    const au = item.au;
    const permittedArea = au * occupancyLimit;
    const qtyNeeded = permittedArea > 0 ? Math.ceil(totalArea / permittedArea) : 0;
    const realOccupancy = permittedArea > 0 ? (totalArea / (qtyNeeded * permittedArea)) * 100 : 0;
    
    return {
      item,
      au,
      permittedArea,
      qtyNeeded,
      realOccupancy
    };
  });
  
  // Find the smallest size where qtyNeeded == 1
  for (let i = 0; i < calculatedItems.length; i++) {
    if (calculatedItems[i].qtyNeeded === 1) {
      recommendedIdx = i;
      break;
    }
  }
  
  // Render results
  calculatedItems.forEach((calc, idx) => {
    const { item, au, permittedArea, qtyNeeded, realOccupancy } = calc;
    const tr = document.createElement('tr');
    
    let statusHtml = '';
    let statusClass = '';
    
    if (qtyNeeded === 1) {
      statusClass = idx === recommendedIdx ? 'row-highlight' : '';
      statusHtml = `<span class="status-indicator approved"></span>Aprovado`;
    } else {
      statusClass = 'row-overloaded';
      statusHtml = `<span class="status-indicator warning"></span>Bitola Pequena (${qtyNeeded} condutos)`;
    }
    
    const barWidth = Math.min(100, realOccupancy);
    const barColor = realOccupancy <= 100 ? '#10b981' : '#ef4444';
    const barHtml = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
        <div style="width: 120px; height: 16px; background: #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);">
          <div style="width: ${barWidth}%; height: 100%; background: ${barColor}; transition: width 0.3s ease;"></div>
        </div>
        <span style="font-weight: 600; font-size: inherit;">${realOccupancy.toFixed(1)}%</span>
      </div>
    `;

    tr.className = statusClass;
    tr.innerHTML = `
      <td class="text-center bold" style="font-size: 1.1em; color: var(--accent-color);">${qtyNeeded}</td>
      <td class="bold">${statusHtml}</td>
      <td class="bold" style="color: var(--accent-color);">${item.bitola}</td>
      <td class="bold" style="color: var(--accent-color);">${item.dn}</td>
      <td>${Number(au).toFixed(1)}</td>
      <td>${Number(permittedArea).toFixed(1)}</td>
      <td class="text-center">${barHtml}</td>
    `;
    
    resultList.appendChild(tr);
  });

}


/* ================= EXPORT PDF ================= */
function initPdfExport() {
  const exportBtn = document.getElementById('export-pdf-btn');
  exportBtn.addEventListener('click', () => {
    if (circuitCables.length === 0) {
      alert("Não é possível exportar um relatório vazio. Adicione cabos ao circuito.");
      return;
    }
    
    // Build a temporary wrapper containing the report details beautifully formatted
    const tempDiv = document.createElement('div');
    tempDiv.className = 'pdf-report-print';
    
    // Fetch data for heading
    const totalQty = circuitCables.reduce((acc, curr) => acc + curr.qty, 0);
    const totalArea = circuitCables.reduce((acc, curr) => acc + curr.qty * (Math.PI * Math.pow(curr.de, 2)) / 4, 0);
    
    const ruleType = document.querySelector('input[name="occ-rule"]:checked').value;
    let occupancyLimit = 0.40;
    if (ruleType === 'nbr') {
      if (totalQty === 1) occupancyLimit = 0.53;
      else if (totalQty === 2) occupancyLimit = 0.31;
      else occupancyLimit = 0.40;
    } else {
      occupancyLimit = 0.20;
    }
    
    const familyPrefix = document.getElementById('conduit-family').value;
    const familyName = db.condutos.familias.find(f => f.prefix === familyPrefix)?.name || familyPrefix;
    const familyStandard = db.condutos.familias.find(f => f.prefix === familyPrefix)?.standard || '';
    
    // Construct HTML for report
    let cablesHtml = '';
    circuitCables.forEach((c, idx) => {
      cablesHtml += `
        <tr>
          <td>#${idx + 1}</td>
          <td>${c.category.toUpperCase()}</td>
          <td>${c.type}</td>
          <td>${c.size}</td>
          <td>${c.qty}</td>
          <td>${Number(c.de).toFixed(1)} mm</td>
          <td>${Number(c.area).toFixed(1)} mm²</td>
        </tr>
      `;
    });
    
    // Add conduits calculations
    let conduitsHtml = '';
    const familyItems = db.condutos.itens.filter(item => item.prefix === familyPrefix);
    let recommendedIdx = -1;
    
    const calcList = familyItems.map(item => {
      const au = item.au;
      const permittedArea = au * occupancyLimit;
      const qtyNeeded = permittedArea > 0 ? Math.ceil(totalArea / permittedArea) : 0;
      const realOccupancy = permittedArea > 0 ? (totalArea / (qtyNeeded * permittedArea)) * 100 : 0;
      return { item, au, permittedArea, qtyNeeded, realOccupancy };
    });
    
    for (let i = 0; i < calcList.length; i++) {
      if (calcList[i].qtyNeeded === 1) {
        recommendedIdx = i;
        break;
      }
    }
    
    calcList.forEach((calc, idx) => {
      const isRec = idx === recommendedIdx;
      conduitsHtml += `
        <tr style="${isRec ? 'background-color: #d1fae5; font-weight: bold; border: 2px solid #059669;' : ''}">
          <td style="text-align:center; font-weight:bold; color:#3b82f6;">${calc.qtyNeeded}</td>
          <td>${isRec ? '★ RECOMENDADO' : calc.qtyNeeded === 1 ? 'Adequado' : 'Subdimensionado'}</td>
          <td style="color:#3b82f6; font-weight:bold;">${calc.item.bitola}</td>
          <td style="color:#3b82f6; font-weight:bold;">${calc.item.dn}</td>
          <td>${Number(calc.au).toFixed(1)}</td>
          <td>${Number(calc.permittedArea).toFixed(1)}</td>
          <td>${calc.realOccupancy.toFixed(1)}%</td>
        </tr>
      `;
    });
    
    tempDiv.innerHTML = `
      <div style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333;">
        <!-- Header -->
        <table style="width: 100%; border: none; margin-bottom: 30px;">
          <tr>
            <td>
              <h1 style="margin: 0; color: #1e3a8a; font-size: 24px; font-weight: 700;">RELATÓRIO TÉCNICO DE DIMENSIONAMENTO</h1>
              <p style="margin: 5px 0 0 0; color: #222; font-size: 12px; text-transform: uppercase;">Memória de Cálculo de Infraestrutura de Condutos</p>
            </td>
            <td style="text-align: right; vertical-align: top; color: #222; font-size: 12px;">
              <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
              <p><strong>Norma Base:</strong> NBR 5410 / NBR 15465</p>
            </td>
          </tr>
        </table>
        
        <!-- Circuit Summary -->
        <h3 style="border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; color: #1e3a8a; font-size: 14px; text-transform: uppercase; margin-top: 20px;">1. Sumário do Circuito</h3>
        <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; width: 33%; background: #f3f4f6; border: 1px solid #e5e7eb;"><strong>Quantidade de Cabos:</strong> ${totalQty}</td>
            <td style="padding: 8px; width: 33%; background: #f3f4f6; border: 1px solid #e5e7eb;"><strong>Área Total Ocupada:</strong> ${totalArea.toFixed(1)} mm²</td>
            <td style="padding: 8px; width: 33%; background: #f3f4f6; border: 1px solid #e5e7eb;"><strong>Limite Ocupação NBR:</strong> ${(occupancyLimit * 100).toFixed(0)}%</td>
          </tr>
        </table>
        
        <!-- Cable Details -->
        <h3 style="border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; color: #1e3a8a; font-size: 14px; text-transform: uppercase; margin-top: 30px;">2. Condutores Adicionados</h3>
        <table style="width: 100%; margin-top: 10px; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #1e3a8a; color: white; text-align: left;">
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Item</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Categoria</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Cabo / Tipo</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Seção / Pares</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Qtd</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Diâmetro (DE)</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Área Total</th>
            </tr>
          </thead>
          <tbody>
            ${cablesHtml}
          </tbody>
        </table>
        
        <!-- Sizing Results -->
        <h3 style="border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; color: #1e3a8a; font-size: 14px; text-transform: uppercase; margin-top: 30px;">3. Dimensionamento de Condutos - Família: ${familyName}</h3>
        <p style="font-size: 11px; color: #222; margin: 5px 0 10px 0;">Padrão técnico: <strong>${familyStandard}</strong></p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #1e3a8a; color: white; text-align: left;">
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Qtd Condutos</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Status</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Bitola (Pol)</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">DN (mm)</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Área Útil</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Área Permissível</th>
              <th style="padding: 8px; border: 1px solid #e5e7eb;">Ocupação Real</th>
            </tr>
          </thead>
          <tbody>
            ${conduitsHtml}
          </tbody>
        </table>
        
        <!-- Footer / Signature -->
        <div style="margin-top: 60px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 11px; color: #222;">
          <table style="width: 100%; border: none;">
            <tr>
              <td>INFRAESTRUTURA SIZING APP - Memória de Cálculo Automática</td>
              <td style="text-align: right;">Aprovado conforme critérios da NBR 5410</td>
            </tr>
          </table>
        </div>
      </div>
    `;
    
    // Options for html2pdf
    const opt = {
      margin:       0.5,
      filename:     `Relatorio-Dimensionamento-Condutos-${new Date().toISOString().slice(0,10)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Generate PDF
    html2pdf().from(tempDiv).set(opt).save().catch(err => {
      console.error(err);
      alert("Erro ao exportar PDF. Por favor, tente novamente.");
    });
  });
}

async function loadCustomDb() {
  const saved = localStorage.getItem('customDb');
  let loaded = false;
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && ((parsed.cabos && parsed.cabos.length > 0) || (parsed.condutos && parsed.condutos.length > 0))) {
        customDb = {
          cabos: parsed.cabos || [],
          condutos: parsed.condutos || []
        };
        // Garantir que nenhum item em customDb.condutos tenha dn inválido
        customDb.condutos.forEach(item => {
          if (item.dn === null || item.dn === undefined || Number.isNaN(item.dn)) {
            item.dn = item.de_ext || item.bitola || '-';
          }
        });
        loaded = true;
      }
    } catch (e) {
      console.error("Failed to parse customDb", e);
    }
  }

  // Se não há dados no localStorage, carrega a base padrão de db.json
  if (!loaded) {
    try {
      const response = await fetch('/db.json');
      if (response.ok) {
        const data = await response.json();
        customDb = convertDbJsonToCustomDb(data);
        localStorage.setItem('customDb', JSON.stringify(customDb));
      }
    } catch (err) {
      console.error("Erro ao carregar db.json inicial:", err);
    }
  }

  rebuildDbFromCustom();
  populateCableTypes();
  populateConduitFamilies();
}

/**
 * Reconstrói o objeto db em memória a partir de customDb.
 * customDb é a única fonte de dados — o db.js é apenas o esqueleto vazio.
 */
function rebuildDbFromCustom() {
  // Reset db to empty skeleton
  db.cabos.energia.headers = [];
  db.cabos.energia.sizes = {};
  db.cabos.telecom = db.cabos.telecom || { headers: [], sizes: {} };
  db.cabos.telecom.headers = [];
  db.cabos.telecom.sizes = {};
  db.condutos.familias = [];
  db.condutos.itens = [];

  // Rebuild cabos
  customDb.cabos.forEach(c => {
    const cat = c.cat;
    if (!db.cabos[cat]) {
      db.cabos[cat] = { headers: [], sizes: {} };
    }
    if (!db.cabos[cat].headers.includes(c.tipo)) {
      db.cabos[cat].headers.push(c.tipo);
    }
    if (!db.cabos[cat].sizes[c.sec]) {
      db.cabos[cat].sizes[c.sec] = {};
    }
    db.cabos[cat].sizes[c.sec][c.tipo] = parseFloat(c.de);
  });

  // Rebuild condutos
  customDb.condutos.forEach(c => {
    const familyExists = db.condutos.familias.some(f => f.prefix === c.familia);
    if (!familyExists) {
      db.condutos.familias.push({
        prefix: c.familia,
        name: c.familiaName || c.familia,
        standard: c.familiaStandard || 'Personalizado'
      });
    }
    let displayDn = c.dn;
    if (displayDn === null || displayDn === undefined || displayDn === '' || displayDn === 'NaN' || Number.isNaN(displayDn)) {
      displayDn = c.de_ext || c.bitola || '-';
    }
    db.condutos.itens.push({
      prefix: c.familia,
      bitola: c.bitola,
      dn: displayDn,
      au: parseFloat(c.au) || 0
    });
  });
  db.condutos.itens.sort((a, b) => a.au - b.au);
}

/**
 * Converte o formato hierárquico do db.json para o formato flat do customDb.
 * Usado ao carregar a "Base Padrão".
 */
function convertDbJsonToCustomDb(dbJson) {
  const result = {
    cabos: [],
    condutos: []
  };

  // Convert cabos
  if (dbJson.cabos) {
    Object.keys(dbJson.cabos).forEach(cat => {
      const catData = dbJson.cabos[cat];
      const headers = catData.headers || [];
      const sizes = catData.sizes || {};
      Object.keys(sizes).forEach(sec => {
        headers.forEach(tipo => {
          const de = sizes[sec][tipo];
          if (de !== null && de !== undefined && de !== '') {
            result.cabos.push({
              id: `${cat}_${sec}_${tipo}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
              cat,
              tipo,
              sec,
              de: parseFloat(de)
            });
          }
        });
      });
    });
  }

  // Convert condutos
  if (dbJson.condutos) {
    const familias = dbJson.condutos.familias || [];
    const itens = dbJson.condutos.itens || [];
    itens.forEach(item => {
      const familia = familias.find(f => f.prefix === item.prefix);
      let dnVal = item.dn;
      if (dnVal === null || dnVal === undefined || dnVal === 'NaN' || Number.isNaN(dnVal)) {
        dnVal = item.de_ext || item.bitola || '-';
      }
      result.condutos.push({
        id: `conduto_${item.prefix}_${item.bitola}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
        familia: item.prefix,
        familiaName: familia ? familia.name : item.prefix,
        familiaStandard: familia ? familia.standard : 'Personalizado',
        bitola: item.bitola,
        dn: dnVal,
        au: item.au
      });
    });
  }

  return result;
}

/* ================= CRUD MODULE ================= */

function initCrudTab() {
  const subTabs = [
    { btn: document.getElementById('btn-sub-crud-cabos'), section: document.getElementById('crud-section-cabos'), id: 'btn-sub-crud-cabos' },
    { btn: document.getElementById('btn-sub-crud-condutos'), section: document.getElementById('crud-section-condutos'), id: 'btn-sub-crud-condutos' }
  ];
  
  if (!subTabs[0].btn) return;
  
  subTabs.forEach(tab => {
    tab.btn.addEventListener('click', () => {
      subTabs.forEach(t => {
        t.btn.classList.remove('active');
        t.section.classList.add('hidden');
      });
      tab.btn.classList.add('active');
      tab.section.classList.remove('hidden');
      localStorage.setItem('activeCrudTab', tab.id);
    });
  });
  
  document.getElementById('crud-form-cabo').addEventListener('submit', (e) => {
    e.preventDefault();
    const cabo = {
      id: Date.now().toString(),
      cat: document.getElementById('crud-cabo-cat').value,
      tipo: document.getElementById('crud-cabo-tipo').value.trim(),
      sec: document.getElementById('crud-cabo-sec').value.trim(),
      de: parseFloat(document.getElementById('crud-cabo-de').value)
    };
    customDb.cabos.push(cabo);
    saveCustomDbAndReload();
  });
  
  document.getElementById('crud-form-conduto').addEventListener('submit', (e) => {
    e.preventDefault();
    const conduto = {
      id: Date.now().toString(),
      familia: document.getElementById('crud-conduto-familia').value.trim(),
      bitola: document.getElementById('crud-conduto-bitola').value.trim(),
      dn: parseFloat(document.getElementById('crud-conduto-dn').value),
      au: parseFloat(document.getElementById('crud-conduto-au').value)
    };
    customDb.condutos.push(conduto);
    saveCustomDbAndReload();
  });

  
  // Export DB
  document.getElementById('crud-btn-export').addEventListener('click', () => {
    const exportData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      ...customDb
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Infracalc_Base_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
  });
  
  // Import DB
  document.getElementById('crud-file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        
        // Detect if it's the old format / active customDb format or the original db.json format
        if (imported.version === "2.0" || (Array.isArray(imported.cabos) && Array.isArray(imported.condutos))) {
          // Direct format
          customDb = {
            cabos: imported.cabos || [],
            condutos: imported.condutos || []
          };
          saveCustomDbAndReload();
        } else if (imported.cabos && imported.condutos && imported.iz) {
          // It's the original db.json hierarchical format
          customDb = convertDbJsonToCustomDb(imported);
          saveCustomDbAndReload();
        } else {
          alert("Arquivo JSON inválido. Verifique o formato do arquivo.");
        }
      } catch(err) {
        alert("Erro ao processar o arquivo importado.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  });
  
  // Load Default DB
  const btnDefault = document.getElementById('crud-btn-default');
  if (btnDefault) {
    btnDefault.addEventListener('click', async () => {
      if (confirm('Deseja carregar a base de dados padrão? Isso substituirá sua base atual.')) {
        try {
          const response = await fetch('/db.json');
          if (!response.ok) throw new Error('Não foi possível carregar db.json');
          const data = await response.json();
          customDb = convertDbJsonToCustomDb(data);
          saveCustomDbAndReload();
        } catch (err) {
          alert("Erro ao carregar a base de dados padrão.");
          console.error(err);
        }
      }
    });
  }
  
  renderCrudTables();
}

function renderCrudTables() {
  // Cabos
  const listCabos = document.getElementById('crud-list-cabos');
  if (!listCabos) return;
  listCabos.innerHTML = '';
  if (customDb.cabos.length === 0) {
     listCabos.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum cabo personalizado cadastrado.</td></tr>';
  } else {
     customDb.cabos.forEach(c => {
       const tr = document.createElement('tr');
       tr.innerHTML = `
         <td><span class="badge ${c.cat === 'energia' ? 'btn-primary' : 'btn-success'}">${c.cat === 'energia' ? 'Força/Potência' : 'Sinal/Controle'}</span></td>
         <td class="bold">${c.tipo}</td>
         <td>${c.sec}</td>
         <td>${c.de}</td>
         <td>
           <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="deleteCustomEntry('cabos', '${c.id}')">Excluir</button>
         </td>
       `;
       listCabos.appendChild(tr);
     });
  }
  
  // Condutos
  const listCondutos = document.getElementById('crud-list-condutos');
  listCondutos.innerHTML = '';
  if (customDb.condutos.length === 0) {
     listCondutos.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum eletroduto personalizado cadastrado.</td></tr>';
  } else {
     customDb.condutos.forEach(c => {
       const tr = document.createElement('tr');
       tr.innerHTML = `
         <td><span class="badge btn-primary">${c.familia}</span></td>
         <td class="bold">${c.bitola}</td>
         <td>${c.dn}</td>
         <td>${c.au}</td>
         <td>
           <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="deleteCustomEntry('condutos', '${c.id}')">Excluir</button>
         </td>
       `;
       listCondutos.appendChild(tr);
     });
  }

}

window.deleteCustomEntry = function(type, id) {
  if (confirm('Deseja realmente excluir este item personalizado?')) {
    customDb[type] = customDb[type].filter(item => item.id !== id);
    saveCustomDbAndReload();
  }
};

function saveCustomDbAndReload() {
  localStorage.setItem('customDb', JSON.stringify(customDb));
  // Not using window.location.reload() to avoid screen flashing.
  // Instead, reload the page which now has logic to restore the exact tab in DOMContentLoaded
  window.location.reload();
}
