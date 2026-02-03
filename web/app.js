const API_URL = '/api';

// State
let collectionTree = [];
let collectionMap = {}; // id -> node
let defaultCollection = "";

// DOM Elements
const elRootSelect = document.getElementById('root-select');
const elTreeRoot = document.getElementById('tree-root');
const elBtnExport = document.getElementById('btn-export');
const elStatusText = document.getElementById('status-text');
const elOutputPathInput = document.getElementById('output-path-input');
const elBrowseFolderBtn = document.getElementById('browse-folder-btn');

// AI Function Elements
const elAIFunctionSelect = document.getElementById('ai-function-select');
const elBtnRunAI = document.getElementById('btn-run-ai');
const elThresholdSlider = document.getElementById('similarity-threshold');
const elThresholdValue = document.getElementById('threshold-value');
const elClusteringAlgorithm = document.getElementById('clustering-algorithm');
const elBatchTasksOption = document.getElementById('batch-tasks-option');
const elAIOptionsContainer = document.getElementById('ai-options-container');

// Tab Navigation Elements
const elExportTabBtn = document.getElementById('export-tab-btn');
const elAITabBtn = document.getElementById('ai-tab-btn');
const elExportView = document.getElementById('export-view');
const elAIView = document.getElementById('ai-view');

// Batch task checkboxes
const elBatchAutoTag = document.getElementById('batch-auto-tag');
const elBatchClassifyField = document.getElementById('batch-classify-field');
const elBatchDuplicateDetection = document.getElementById('batch-duplicate-detection');
const elBatchContentCluster = document.getElementById('batch-content-cluster');

// Init
document.addEventListener('DOMContentLoaded', async () => {
    await fetchData();
    setupEventListeners();
});

function setupEventListeners() {
    // AI function selector
    elAIFunctionSelect.addEventListener('change', handleAIFunctionChange);
    
    // Threshold slider
    elThresholdSlider.addEventListener('input', () => {
        elThresholdValue.textContent = parseFloat(elThresholdSlider.value).toFixed(2);
    });
    
    // Run AI button
    elBtnRunAI.addEventListener('click', runAIAction);
    
    // Tab Navigation Events
    elExportTabBtn?.addEventListener('click', () => {
        switchToTab('export');
    });
    
    elAITabBtn?.addEventListener('click', () => {
        switchToTab('ai');
    });
}

function switchToTab(tabName) {
    // Update active tab buttons
    elExportTabBtn.classList.toggle('active', tabName === 'export');
    elAITabBtn.classList.toggle('active', tabName === 'ai');
    
    // Show appropriate view
    elExportView.classList.toggle('active', tabName === 'export');
    elAIView.classList.toggle('active', tabName === 'ai');
}

function handleAIFunctionChange() {
    const selectedFunction = elAIFunctionSelect.value;
    
    // Show/hide relevant options
    document.getElementById('threshold-option').style.display = 
        (selectedFunction === 'duplicate-detection' || selectedFunction === 'batch-process') ? 'block' : 'none';
    
    document.getElementById('algorithm-option').style.display = 
        (selectedFunction === 'content-cluster' || selectedFunction === 'batch-process') ? 'block' : 'none';
    
    document.getElementById('batch-tasks-option').style.display = 
        selectedFunction === 'batch-process' ? 'block' : 'none';
}

async function fetchData() {
    try {
        const res = await fetch(`${API_URL}/collections`);
        const data = await res.json();

        collectionTree = data.tree;
        defaultCollection = data.default_collection;

        if (data.output_root) {
            elOutputPathInput.value = data.output_root;
        }

        // Build Map and Links
        initTreeData(collectionTree);

        // Populate Select
        renderSelect();

        // Select default if exists
        if (defaultCollection) {
            const defaultNode = Object.values(collectionMap).find(n => n.name === defaultCollection);
            if (defaultNode) {
                elRootSelect.value = defaultNode.id;
                renderTreeView(defaultNode.id);
            }
        }
    } catch (e) {
        console.error(e);
        elStatusText.textContent = "Error connecting to server.";
        elStatusText.style.color = "red";
    }
}

function initTreeData(nodes) {
    const traverse = (node, parent) => {
        collectionMap[node.id] = node;
        node.parent = parent;
        node.state = {
            checked: false,
            indeterminate: false
        };
        // Hold ref to checkbox DOM for quick updates
        node.domCheckbox = null;

        if (node.children) {
            node.children.forEach(child => traverse(child, node));
        }
    };
    nodes.forEach(n => traverse(n, null));
}

function renderSelect() {
    elRootSelect.innerHTML = '<option value="" disabled selected>Select a Root Collection</option>';
    collectionTree.forEach(node => {
        const opt = document.createElement('option');
        opt.value = node.id;
        opt.textContent = node.name;
        elRootSelect.appendChild(opt);
    });

    elRootSelect.addEventListener('change', (e) => {
        renderTreeView(e.target.value);
    });
}

function renderTreeView(rootId) {
    elTreeRoot.innerHTML = '';
    const rootNode = collectionMap[rootId];
    if (!rootNode) return;

    if (!rootNode.children || rootNode.children.length === 0) {
        elTreeRoot.innerHTML = '<div class="tree-node" style="padding:1rem; color:#777;">No sub-collections. Export will include all direct items.</div>';
        return;
    }

    const ul = document.createElement('div');
    rootNode.children.forEach(child => {
        ul.appendChild(createTreeNode(child));
    });
    elTreeRoot.appendChild(ul);
}

function createTreeNode(node) {
    const container = document.createElement('div');
    container.className = 'tree-node';

    const content = document.createElement('div');
    content.className = 'node-content';

    const hasChildren = node.children && node.children.length > 0;

    // Toggle Icon
    const toggle = document.createElement('div');
    toggle.className = 'toggle-icon';
    toggle.textContent = hasChildren ? '▶' : '•';

    // Checkbox
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = node.state.checked;
    cb.indeterminate = node.state.indeterminate;
    node.domCheckbox = cb; // Bind DOM

    // Event Listeners
    if (hasChildren) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const childContainer = container.querySelector('.children-container');
            if (childContainer) {
                const isHidden = childContainer.style.display === 'none';
                childContainer.style.display = isHidden ? 'block' : 'none';
                toggle.textContent = isHidden ? '▼' : '▶';
            }
        });
    }

    cb.addEventListener('change', () => {
        handleCheckboxChange(node, cb.checked);
    });

    content.appendChild(toggle);
    content.appendChild(cb);

    // Label
    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = node.name;
    label.addEventListener('click', () => {
        if (hasChildren) toggle.click();
        else cb.click();
    });
    content.appendChild(label);

    container.appendChild(content);

    // Recursion
    if (hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'children-container';
        childrenContainer.style.display = 'none'; // Default collapsed
        node.children.forEach(child => {
            childrenContainer.appendChild(createTreeNode(child));
        });
        container.appendChild(childrenContainer);
    }

    return container;
}

// --- State Management ---

function handleCheckboxChange(node, isChecked) {
    // 1. Update self and children (Cascade Down)
    updateStateDown(node, isChecked);

    // 2. Update parents (Bubble Up)
    let curr = node.parent;
    while (curr) {
        updateStateFromChildren(curr);
        curr = curr.parent;
    }
}

function updateStateDown(node, isChecked) {
    node.state.checked = isChecked;
    node.state.indeterminate = false;
    updateDom(node);

    if (node.children) {
        node.children.forEach(child => updateStateDown(child, isChecked));
    }
}

function updateStateFromChildren(node) {
    if (!node.children || node.children.length === 0) return;

    const allChecked = node.children.every(c => c.state.checked);
    // Unchecked includes indeterminate being false
    const allUnchecked = node.children.every(c => !c.state.checked && !c.state.indeterminate);

    if (allChecked) {
        node.state.checked = true;
        node.state.indeterminate = false;
    } else if (allUnchecked) {
        node.state.checked = false;
        node.state.indeterminate = false;
    } else {
        node.state.checked = false;
        node.state.indeterminate = true;
    }
    updateDom(node);
}

function updateDom(node) {
    if (node.domCheckbox) {
        node.domCheckbox.checked = node.state.checked;
        node.domCheckbox.indeterminate = node.state.indeterminate;
    }
}

// --- Util ---
function sanitize(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// --- Export Logic ---

function buildMask(node) {
    // If explicitly checked, return {} (Include All/Leaf)
    if (node.state.checked) {
        return {};
    }

    // If completely unchecked (and not indeterminate), return null (Exclude)
    if (!node.state.checked && !node.state.indeterminate) {
        return null;
    }

    // If Mixed/Indeterminate, must have children to define
    if (node.children) {
        const mask = {};
        let count = 0;
        node.children.forEach(child => {
            const childMask = buildMask(child);
            if (childMask !== null) {
                // Key MUST be sanitized to match file system / backend logic
                mask[sanitize(child.name)] = childMask;
                count++;
            }
        });
        return count > 0 ? mask : null;
    }

    return null;
}

elBtnExport.addEventListener('click', async () => {
    const rootId = elRootSelect.value;
    if (!rootId) {
        alert("Please select a Root Collection first.");
        return;
    }

    const rootNode = collectionMap[rootId];

    // Build mask from children
    const mask = {};
    let hasSelection = false;

    if (rootNode.children) {
        rootNode.children.forEach(child => {
            const m = buildMask(child);
            if (m !== null) {
                mask[sanitize(child.name)] = m;
                hasSelection = true;
            }
        });
    }

    if (!hasSelection && rootNode.children && rootNode.children.length > 0) {
        // Warning: Exporting Empty?
        // Actually, existing logic: if mask is empty dict, it acts as Export All (Leaf). 
        // But here mask IS empty dict.
        // If we send {}, backend sees "FrontEnd config is active" (path_mask is not None).
        // Then inside `_process_collection`:
        // if path_mask (which is {}) -> `filter_children = False` -> Exports everything!

        // This is tricky. 
        // If I configure the backend manually: `build_path_mask` returns `None` if folder doesn't exist.
        // If folder exists but is empty? `_scan_dir` returns `{}`.
        // If `{}` -> Export All.

        // So `mask = {}` means Export All.
        // We want Export Selection.
        // If Selection is Empty, we likely want Export Nothing (or user error).

        // Solution:
        // Use a Magic Key or Flag to indicate "Empty Filter"? 
        // Or simply: Do not call export if nothing selected?

        if (!confirm("No sub-collections selected. Proceeding will export EVERYTHING in this root collection (default behavior for empty filter). Are you sure?")) {
            return;
        }
    }

    elStatusText.textContent = "Processing...";
    elBtnExport.disabled = true;

    try {
        const payload = {
            root_collection: rootNode.name,
            mask: mask,
            output_root: elOutputPathInput.value
        };

        const res = await fetch(`${API_URL}/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            elStatusText.textContent = "✅ " + result.message;
            elStatusText.className = "status-text success";
        } else {
            throw new Error(result.detail || "Unknown error");
        }
    } catch (e) {
        elStatusText.textContent = "❌ " + e.message;
        elStatusText.className = "status-text error";
    } finally {
        elBtnExport.disabled = false;
    }
});

elBrowseFolderBtn.addEventListener('click', async () => {
    elBrowseFolderBtn.disabled = true;
    elBrowseFolderBtn.textContent = '⏳ Opening...';
    
    try {
        const res = await fetch(`${API_URL}/browse-folder`, {
            method: 'POST'
        });
        
        const result = await res.json();
        
        if (res.ok && result.path) {
            elOutputPathInput.value = result.path;
        }
    } catch (e) {
        console.error('Error browsing folder:', e);
        elStatusText.textContent = "❌ Failed to open folder dialog";
        elStatusText.className = "status-text error";
    } finally {
        elBrowseFolderBtn.disabled = false;
        elBrowseFolderBtn.textContent = '📁 Browse';
    }
});

// --- AI Function Logic ---

async function runAIAction() {
    const rootId = elRootSelect.value;
    if (!rootId) {
        alert("Please select a Root Collection first.");
        return;
    }
    
    const selectedFunction = elAIFunctionSelect.value;
    const rootNode = collectionMap[rootId];
    
    elStatusText.textContent = `Running ${selectedFunction}...`;
    elBtnRunAI.disabled = true;
    
    try {
        let payload = {
            collection_id: rootId,
            options: {}
        };
        
        // Add function-specific options
        if (selectedFunction === 'duplicate-detection' || selectedFunction === 'batch-process') {
            payload.options.threshold = parseFloat(elThresholdSlider.value);
        }
        
        if (selectedFunction === 'content-cluster' || selectedFunction === 'batch-process') {
            payload.options.algorithm = elClusteringAlgorithm.value;
        }
        
        if (selectedFunction === 'batch-process') {
            // Collect selected batch tasks
            const batchTasks = [];
            if (elBatchAutoTag.checked) batchTasks.push('auto-tag');
            if (elBatchClassifyField.checked) batchTasks.push('classify-field');
            if (elBatchDuplicateDetection.checked) batchTasks.push('duplicate-detection');
            if (elBatchContentCluster.checked) batchTasks.push('content-cluster');
            
            if (batchTasks.length === 0) {
                alert("Please select at least one task for batch processing.");
                return;
            }
            
            payload.tasks = batchTasks;
        }
        
        let endpoint;
        switch(selectedFunction) {
            case 'auto-tag':
                endpoint = `${API_URL}/ai/auto-tag`;
                break;
            case 'classify-field':
                endpoint = `${API_URL}/ai/classify-field`;
                break;
            case 'duplicate-detection':
                endpoint = `${API_URL}/ai/duplicate-detection`;
                break;
            case 'content-cluster':
                endpoint = `${API_URL}/ai/content-cluster`;
                break;
            case 'batch-process':
                endpoint = `${API_URL}/ai/process-batch`;
                break;
            default:
                throw new Error(`Unknown AI function: ${selectedFunction}`);
        }
        
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        
        if (res.ok) {
            elStatusText.textContent = `✅ ${selectedFunction} completed successfully!`;
            elStatusText.className = "status-text success";
            
            // Log detailed results to console for user inspection
            console.log(`AI ${selectedFunction} results:`, result);
            
            // Display summary based on function type
            if (result.results) {
                if (selectedFunction === 'duplicate-detection') {
                    const duplicateCount = result.results.duplicate_pairs || 0;
                    elStatusText.textContent += ` Found ${duplicateCount} potential duplicates.`;
                } else if (selectedFunction === 'content-cluster') {
                    const clusterCount = result.results.total_clusters || 0;
                    const itemCount = result.results.total_items || 0;
                    elStatusText.textContent += ` Created ${clusterCount} clusters from ${itemCount} items.`;
                } else if (selectedFunction === 'batch-process') {
                    elStatusText.textContent += ` Processed ${Object.keys(result.results).length} different tasks.`;
                } else {
                    const processedCount = result.results.processed_count || 0;
                    elStatusText.textContent += ` Processed ${processedCount} items.`;
                }
            }
        } else {
            throw new Error(result.detail || "AI operation failed");
        }
    } catch (e) {
        elStatusText.textContent = `❌ ${e.message}`;
        elStatusText.className = "status-text error";
    } finally {
        elBtnRunAI.disabled = false;
    }
}