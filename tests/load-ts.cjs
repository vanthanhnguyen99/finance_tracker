const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

exports.createLoader = function createLoader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
    }).outputText;
    const localRequire = (id) => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id.startsWith('@/')) return id.endsWith('.mjs') ? require(path.resolve(root, id.slice(2))) : load(id.slice(2) + '.ts');
      if (id.startsWith('.') && id.endsWith('.mjs')) return require(path.resolve(path.dirname(absolute), id));
      if (id.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(absolute), id)) + '.ts');
      return require(id);
    };
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
};
