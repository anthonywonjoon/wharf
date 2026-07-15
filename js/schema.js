// Data for the Dockerfile components
// Does not make any transformations to the DOM, just data

const DOCKER_SCHEMA = {

    FROM: {
        label: 'FROM',
        desc: 'Base image',
        fields: [
            { key: 'image', label: 'image', type: 'text', default: 'node', placeholder: 'node' },
            { key: 'tag', label: 'tag', type: 'text', default: '20-alpine', placeholder: '20-alpine' },
            { key: 'as', label: 'as (optional)', type: 'text', default: '', placeholder: 'build' }
        ],
        render(f) {
            let line = `FROM ${f.image || 'scratch'}${f.tag ? ':' + f.tag : ''}`;
            if (f.as) { line += ` AS ${f.as}` };
            return line;
        }
    },

    ARG: {
        label: 'ARG',
        desc: 'Build-time variable',
        fields: [
            { key: 'name', label: 'name', type: 'text', default: 'NODE_ENV', placeholder: 'NODE_ENV' },
            { key: 'value', label: 'default (optional)', type: 'text', default: 'production', placeholder: 'production' },
        ],
        render(f) {
            return `ARG ${f.name || 'NAME'}${f.value ? '=' + f.value : ''}`;
        }
    },

    WORKDIR: {
        label: 'WORKDIR',
        desc: 'Working directory',
        fields: [
            { key: 'path', label: 'path', type: 'text', default: '/app', placeholder: '/app' }
        ],
        render(f) {
            return `WORKDIR ${f.path || '/app'}`;
        }
    },

    COPY: {
        label: 'COPY',
        desc: 'copy files into image',
        fields: [
        { key: 'src', label: 'source', type: 'text', default: '.', placeholder: '.' },
        { key: 'dest', label: 'destination', type: 'text', default: '.', placeholder: '.' },
        ],
        render(f) {
        return `COPY ${f.src || '.'} ${f.dest || '.'}`;
        }
    },

    ADD: {
        label: 'ADD',
        desc: 'add files / remote URLs',
        fields: [
        { key: 'src', label: 'source / URL', type: 'text', default: '', placeholder: 'https://example.com/file.tar.gz' },
        { key: 'dest', label: 'destination', type: 'text', default: '/tmp/', placeholder: '/tmp/' },
        ],
        render(f) {
        return `ADD ${f.src || ''} ${f.dest || '/'}`;
        }
    },

    RUN: {
        label: 'RUN',
        desc: 'execute a command',
        fields: [
        { key: 'command', label: 'command', type: 'textarea', default: 'npm install', placeholder: 'npm install' },
        ],
        render(f) {
        return `RUN ${f.command || 'echo "no command"'}`;
        }
    },

    ENV: {
        label: 'ENV',
        desc: 'environment variables',
        kv: true,
        kvDefault: [{ key: 'NODE_ENV', value: 'production' }],
        render(f) {
        if (!f.pairs || !f.pairs.length) return 'ENV';
        return f.pairs.filter(p => p.key).map(p => `ENV ${p.key}=${p.value || ''}`).join('\n');
        }
    },

    EXPOSE: {
        label: 'EXPOSE',
        desc: 'expose a port',
        fields: [
        { key: 'port', label: 'port', type: 'text', default: '3000', placeholder: '3000' },
        { key: 'proto', label: 'protocol', type: 'select', options: ['tcp', 'udp'], default: 'tcp' },
        ],
        render(f) {
        return `EXPOSE ${f.port || '3000'}${f.proto && f.proto !== 'tcp' ? '/' + f.proto : ''}`;
        }
    },

    VOLUME: {
        label: 'VOLUME',
        desc: 'mount point',
        fields: [
        { key: 'path', label: 'path', type: 'text', default: '/data', placeholder: '/data' },
        ],
        render(f) {
        return `VOLUME ["${f.path || '/data'}"]`;
        }
    },

    USER: {
        label: 'USER',
        desc: 'run-as user',
        fields: [
        { key: 'user', label: 'user', type: 'text', default: 'node', placeholder: 'node' },
        ],
        render(f) {
        return `USER ${f.user || 'node'}`;
        }
    },

    LABEL: {
        label: 'LABEL',
        desc: 'image metadata',
        kv: true,
        kvDefault: [{ key: 'maintainer', value: 'you@example.com' }],
        render(f) {
        if (!f.pairs || !f.pairs.length) return 'LABEL';
        return f.pairs.filter(p => p.key).map(p => `LABEL ${p.key}="${p.value || ''}"`).join('\n');
        }
    },

    ENTRYPOINT: {
        label: 'ENTRYPOINT',
        desc: 'fixed startup command',
        fields: [
        { key: 'command', label: 'command', type: 'text', default: 'node', placeholder: 'node' },
        { key: 'form', label: 'form', type: 'select', options: ['exec', 'shell'], default: 'exec' },
        ],
        render(f) {
        if (!f.command) return 'ENTRYPOINT []';
        const parts = f.command.trim().split(/\s+/);
        if (f.form === 'shell') return `ENTRYPOINT ${f.command}`;
        return `ENTRYPOINT [${parts.map(p => `"${p}"`).join(', ')}]`;
        }
    },

    CMD: {
        label: 'CMD',
        desc: 'default command',
        fields: [
        { key: 'command', label: 'command', type: 'text', default: 'server.js', placeholder: 'server.js' },
        { key: 'form', label: 'form', type: 'select', options: ['exec', 'shell'], default: 'exec' },
        ],
        render(f) {
        if (!f.command) return 'CMD []';
        const parts = f.command.trim().split(/\s+/);
        if (f.form === 'shell') return `CMD ${f.command}`;
        return `CMD [${parts.map(p => `"${p}"`).join(', ')}]`;
        }
    },
};

// Order for the palette
const DOCKER_ORDER = [
    'FROM', 'ARG', 'WORKDIR', 'COPY', 'ADD', 'RUN', 'ENV', 'EXPOSE', 'VOLUME', 'USER', 'LABEL', 'ENTRYPOINT', 'CMD'
];