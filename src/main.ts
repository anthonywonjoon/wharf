
import { addBlock } from './state';
import { renderPalette, renderAll, wireOutputActions } from './ui';
import './style.css';

function seedDefaultBlocks(): void {
  addBlock('FROM');
  addBlock('WORKDIR');
  addBlock('COPY');
  addBlock('RUN');
  addBlock('EXPOSE');
  addBlock('CMD');
}

function init(): void {
  seedDefaultBlocks();
  renderPalette();      
  wireOutputActions(); 
  renderAll();           
}

init();