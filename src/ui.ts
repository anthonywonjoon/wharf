import { getBlocks, addBlock, removeBlock, moveBlock, reorderBlocks, type Block } from './state'
import { DOCKER_SCHEMA, DOCKER_ORDER, type DockerInstructionType, type FieldDef, type KVPair } from './schema'

// Helper function for finding elements in DOM
function el<T extends HTMLElement>(id: string): T {
    const found = document.getElementById(id);
    if (!found) { throw new Error(`Expected an element with id="${id}" in index.html`); }
    return found as T;
}

// ---------- functions for palette ----------

export function renderPalette(): void {
    const list = el<HTMLElement>('palette-list');
    list.innerHTML = '';

    DOCKER_ORDER.forEach((type: DockerInstructionType) => {
        const schema = DOCKER_SCHEMA[type];
        const item = document.createElement('div');

        item.className = 'palette-item';
        item.draggable = true;
        item.title = schema.desc;
        item.innerHTML = `<span><span class="tag">${schema.label}</span></span><span class="plus">+</span>`;

        item.addEventListener('dragstart', (e: DragEvent) => {
            e.dataTransfer?.setData('text/plain', 'palette:' + type);
            if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'copy'; }
        });

        item.addEventListener('click', () => {
            addBlock(type);
            renderAll();
        });

        list.appendChild(item);
    });
}

// Create the field boxes for the blocks
function buildFieldEl(block: Block, fieldDef: FieldDef): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'field' + (fieldDef.type === 'textarea' ? ' grow' : '');

    const label = document.createElement('label');
    label.textContent = fieldDef.label;
    wrap.appendChild(label);

    let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const currentValue = block.fields[fieldDef.key];
    const stringValue = typeof currentValue === 'string' ? currentValue: '';

    // if type == select, render out all the options and append them to the element
    if (fieldDef.type === 'select') {
        const select = document.createElement('select');
        (fieldDef.options ?? []).forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            if (stringValue === opt) { o.selected = true; }
            select.appendChild(o);
        });
        input = select;
    } else if (fieldDef.type === 'textarea') { // else if type == textarea, render out a text area (multi-line, resizable textbox)
        const textarea = document.createElement('textarea');
        textarea.rows = 1;
        textarea.value = stringValue;
        textarea.placeholder = fieldDef.placeholder ?? '';
        input = textarea;
    } else { // else, render out as a text input area (single line string)
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = stringValue;
        textInput.placeholder = fieldDef.placeholder ?? '';
        input = textInput;
    }

    const commit = () => {
        block.fields[fieldDef.key] = input.value;
        renderOutput();
    };
    input.addEventListener('input', commit);
    input.addEventListener('change', commit);

    // adds in \ when user presses 'Enter' in the textarea for RUN so that command knows theres another line
    if (fieldDef.shellContinuation && input instanceof HTMLTextAreaElement) {
        const textarea = input;
        textarea.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key !== 'Enter' || e.shiftKey) return;
            e.preventDefault();

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            const before = textarea.value.slice(0, start).replace(/[ \t]+$/, '');
            const after = textarea.value.slice(end);
            const insertion = ' \\\n';

            textarea.value = before + insertion + after;
            const newCursor = before.length + insertion.length;
            textarea.selectionStart = textarea.selectionEnd = newCursor;

            commit();
        });
    }

    wrap.appendChild(input);
    return wrap;
}

// Build the Key Value elements for instructions like ENV and LABEL (which do not have a 'set' amount of pieces so better to have KV rather than a named property)
function buildKvEl(block: Block): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'field grow';

    const label = document.createElement('label');
    label.textContent = 'key / value pairs';
    wrap.appendChild(label);

    const pairs: KVPair[] = block.fields.pairs ?? [];

    pairs.forEach((pair, i) => {
        const row = document.createElement('div');
        row.className = 'kv-row';

        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.placeholder = 'KEY';
        keyInput.value = pair.key;
        keyInput.style.minWidth = '90px';
        keyInput.addEventListener('input', () => {
        pair.key = keyInput.value;
        renderOutput();
        });

        const valInput = document.createElement('input');
        valInput.type = 'text';
        valInput.placeholder = 'value';
        valInput.value = pair.value;
        valInput.style.flex = '1';
        valInput.addEventListener('input', () => {
        pair.value = valInput.value;
        renderOutput();
        });

        const rm = document.createElement('button');
        rm.className = 'kv-remove';
        rm.textContent = '×';
        rm.title = 'remove pair';
        rm.addEventListener('click', () => {
        pairs.splice(i, 1);
        renderCanvas();
        renderOutput();
        });

        row.appendChild(keyInput);
        row.appendChild(valInput);
        row.appendChild(rm);
        wrap.appendChild(row);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'kv-add';
    addBtn.textContent = '+ add pair';
    addBtn.addEventListener('click', () => {
        pairs.push({ key: '', value: '' });
        block.fields.pairs = pairs;
        renderCanvas();
        renderOutput();
    });
    wrap.appendChild(addBtn);

    return wrap;
}

// ---------- functions for canvas ----------

export function renderCanvas(): void {
    const canvas = el<HTMLDivElement>('canvas');
    canvas.innerHTML = '';

    // drop zone behavior onto canvas (new block onto canvas, not reordering/onto existing block)
    canvas.ondragover = (e: DragEvent) => {
        e.preventDefault();
        canvas.classList.add('canvas-drop-active');
    };

    canvas.ondragleave = () => canvas.classList.remove('canvas-drop-active'); // when dragged item leaves canvas without dropping, remove highlight

    // capture actual drop, reads string stashed in dataTransfer
    canvas.ondrop = (e: DragEvent) => {
        e.preventDefault();
        canvas.classList.remove('canvas-drop-active');
        const data = e.dataTransfer?.getData('text/plain') ?? '';
        if (data.startsWith('palette:')) { // only handles drops from the palette, not from the existing deck
            const type = data.split(':')[1] as DockerInstructionType;
            addBlock(type);
            renderAll();
        }
    };

    const blocks = getBlocks();

    // if no blocks, show placeholder
    if (blocks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `<div class="crate"></div><div>The deck is empty.<br>Drag a block here to start building.</div>`;
        canvas.appendChild(empty);
        el<HTMLSpanElement>('block-count').textContent = '0 layers';
        return;
    }

    // updates counter element with N layers, handles singular vs plural
    el<HTMLSpanElement>('block-count').textContent = blocks.length + (blocks.length === 1 ? 'layer' : ' layers');

    // Build a DOM element for each block in the deck
    blocks.forEach((block, idx) => {
        const schema = DOCKER_SCHEMA[block.type];

        const blockEl = document.createElement('div');
        blockEl.className = 'block';
        blockEl.draggable = true;
        blockEl.dataset.id = String(block.id);
        
        // drag handler for reordering (one block onto another)
        blockEl.addEventListener('dragstart', (e: DragEvent) => {
            blockEl.classList.add('dragging');
            e.dataTransfer?.setData('text/plain', 'reorder' + block.id);
            if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; }
        });

        blockEl.addEventListener('dragend', () => blockEl.classList.remove('dragging')); // drag finished, remove dimming
        blockEl.addEventListener('dragover', (e: DragEvent) => e.preventDefault()); // makes it so block is a valid drop target (for reordering)
        blockEl.addEventListener('drop', (e: DragEvent) => { // handles if block was dropped onto this block, reordering (from existing block from deck or palette)
            e.preventDefault();
            e.stopPropagation();
            const data = e.dataTransfer?.getData('text/plain') ?? '';

            if (data.startsWith('reorder')) {
                const draggedId = parseInt(data.split(':')[1], 10);
                reorderBlocks(draggedId, block.id);
                renderAll();
            } else if (data.startsWith('palette')) {
                const type = data.split(':')[1] as DockerInstructionType;
                const targetIdx = getBlocks().findIndex(b => b.id === block.id);
                addBlock(type, targetIdx === -1 ? null : targetIdx);
                renderAll();
            }
        });

        /* create modules in the block */

        const indexEl = document.createElement('div');
        indexEl.className = 'block-index';
        indexEl.textContent = String(idx + 1);
        blockEl.appendChild(indexEl);

        const body = document.createElement('div');
        body.className = 'block-body';

        const topRow = document.createElement('div');
        topRow.className = 'block-toprow';
        topRow.innerHTML = `<span><span class="block-tag">${schema.label}</span> <span class="block-desc">${schema.desc}</span></span>`;

        const actions = document.createElement('div');
        actions.className = 'block-actions';

        const upBtn = document.createElement('button');
        upBtn.className = 'icon-btn';
        upBtn.title = 'move up';
        upBtn.textContent = '↑';
        upBtn.addEventListener('click', () => { moveBlock(block.id, -1); renderAll(); });

        const downBtn = document.createElement('button');
        downBtn.className = 'icon-btn';
        downBtn.title = 'move down';
        downBtn.textContent = '↓';
        downBtn.addEventListener('click', () => { moveBlock(block.id, 1); renderAll(); });

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.title = 'remove block';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => { removeBlock(block.id); renderAll(); });

        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
        actions.appendChild(delBtn);
        topRow.appendChild(actions);
        body.appendChild(topRow);

        const fieldsWrap = document.createElement('div');
        fieldsWrap.className = 'block-fields';
        if (schema.kv) { // if instruction uses KV, build using KV function
            fieldsWrap.appendChild(buildKvEl(block));
        } else { // else build using normal field function
            (schema.fields ?? []).forEach(fd => fieldsWrap.appendChild(buildFieldEl(block, fd)));
        }

        body.appendChild(fieldsWrap);

        blockEl.appendChild(body);
        canvas.appendChild(blockEl);
    });
}

// ---------- functions for output ----------

export function generateDockerfile(): string {
    return getBlocks().map(b => DOCKER_SCHEMA[b.type].render(b.fields)).join('\n');
}

export function renderOutput(): void {
    const text = generateDockerfile();
    const out = el<HTMLDivElement>('dockerfile-output');

    if (!text) {
        out.innerHTML = '<span class="ln-empty"># Your Dockerfile will appear here as you add blocks to the deck.</span>';
        el<HTMLSpanElement>('line-count').textContent = '0 lines';
        return;
    }

    const lines = text.split('\n');
    el<HTMLSpanElement>('line-count').textContent = lines.length + (lines.length === 1 ? ' line' : ' lines');

    out.innerHTML = lines.map(line => {
        const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const m = escaped.match(/^([A-Z]+)(\s|$)/);
        if (m) { return `<span class="kw">${m[1]}</span>${escaped.slice(m[1].length)}`; }
        return escaped;
    }).join('\n');
}

export function renderAll(): void {
    renderCanvas();
    renderOutput();
}

// ---------- functions for output actions ----------

export function wireOutputActions(): void {
    el<HTMLButtonElement>('copy-btn').addEventListener('click', () => {
        const btn = el<HTMLButtonElement>('copy-btn');
        navigator.clipboard.writeText(generateDockerfile()).then(() => {
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = original;
                btn.classList.remove('copied');
            }, 1400);
        });
    });

    el<HTMLButtonElement>('download-btn').addEventListener('click', () => {
        const blob = new Blob([generateDockerfile()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Dockerfile';
        document.body.appendChild(a)
        a.click();
        document.body.removeChild(a)
        URL.revokeObjectURL(url);
    });
}