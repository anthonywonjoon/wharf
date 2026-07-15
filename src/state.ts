// Controls the states of the blocks through the schemas
// Does NOT edit any of the dom on the page, just structures and modifies the data from the schema

import { DOCKER_SCHEMA } from './schema'
import type {  DockerInstructionType, BlockFields } from './schema'

export interface Block {
    id: number;
    type: DockerInstructionType;
    fields: BlockFields;
}

let blocks: Block[] = [];
let _uid = 1;

export function getBlocks(): Block[] {
    return blocks;
}

/* Creates a block, returns that block */
function makeBlock(type: DockerInstructionType): Block {
    const schema = DOCKER_SCHEMA[type];
    
    const fields: BlockFields = {};
    if (schema.kv) {
        fields.pairs = (schema.kvDefault ?? []).map(p => ({ ...p}));
    } else {
        (schema.fields ?? []).forEach(f => { fields[f.key] = f.default; });
    }

    return { id: _uid++, type, fields }
}

/* Add a block to the deck, returns the added Block */
export function addBlock(type: DockerInstructionType, atIndex: number | null = null): Block {
    const block = makeBlock(type);
    if (atIndex === null) {
        blocks.push(block);
    } else {
        blocks.splice(atIndex, 0, block)
    }

    return block;
}

/* Removes a block from the deck */
export function removeBlock(id: number): void {
    blocks = blocks.filter(b => b.id !== id)
}

/* Moves a block on the deck */
export function moveBlock(id: number, direction: -1 | 1): void {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) { return; }
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= blocks.length) { return; }
    const [b] = blocks.splice(idx, 1);
    blocks.splice(newIdx, 0, b);
}

/* Reorders the block order in the deck */
export function reorderBlocks(draggedId: number, targetId: number): void {
    const from = blocks.findIndex(b => b.id === draggedId);
    const to = blocks.findIndex(b => b.id === targetId);
    if (from === 1 || to === -1 || from === to) { return; }
    const [b] = blocks.splice(from, 1);
    blocks.splice(to, 0, b);
}

/** Section for saved/loading shared blocks and perhaps AI implementation in the future */
export interface PortableBlock {
    type: string;
    fields: BlockFields;
}

/* Loads blocks from a PortableBlock onto the deck */
export function loadBlocks(newBlocks: PortableBlock[]): void {
    blocks = newBlocks.map(b => ({
        id: _uid++,
        type: b.type as DockerInstructionType,
        fields: b.fields
    }))
}

/* Clears the deck of all blocks */
export function clearBlocks(): void {
    blocks = []
}

/* Serialize block for sharing, returns the serialized block*/
export function serializeBlocks(): string {
    const portable: PortableBlock[] = blocks.map(b => ({
        type: b.type,
        fields: b.fields
    }));

    return btoa(encodeURIComponent(JSON.stringify(portable)));
}

/* Unserializes a shared block, then loads it */
export function deserializeBlocks(str: string): void {
    let parsed: unknown;
    try {
        parsed = JSON.parse(decodeURIComponent(atob(str)));
    } catch {
        throw new Error("That link looks corrupted - could not read the config");
    }

    if (!Array.isArray(parsed)) {
        throw new Error("That link looks corrupted - could not read the config");
    }

    const valid = parsed.filter((b): b is PortableBlock => 
        !!b &&
        typeof b === 'object' &&
        typeof (b as Record<string, unknown>).type === 'string' &&
        (b as Record<string, unknown>).type as string in DOCKER_SCHEMA
    );

    loadBlocks(valid);
}

