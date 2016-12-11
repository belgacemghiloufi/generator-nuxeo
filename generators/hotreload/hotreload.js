let _ = require('lodash');
let exists = require('path-exists').sync;
let fs = require('fs');
let path = require('path');

const TXT_START = '## GENERATOR-NUXEO STUFF - DO NOT EDIT';
const TXT_END = '## GENERATOR-NUXEO STUFF - END';

function readFile(filePath) {
  // Volontarly Silent not existing file
  return exists(filePath) ? fs.readFileSync(filePath, {
    encoding: 'UTF-8'
  }) : '';
}

module.exports = {
  _computeClassesFolder: function(module) {
    return path.join(this.destinationRoot(), module, this.options.classesFolder);
  },

  _cleanDevBundlesFileContent: function(content) {
    return content.replace(new RegExp(`${TXT_START}(?:\n|.)*${TXT_END}\n?`), '');
  },

  _isFullyGeneratedFile: function() {
    const file = this._buildDevBundlesPath(this._getDistributionPath());
    return this._cleanDevBundlesFileContent(readFile(file)).trim().length === 0;
  },

  _buildDevBundlesPath: function(root) {
    if (!root) {
      throw new Error(`Cannot resolve distribution path: ${root}.`);
    }

    return path.join(root, 'nxserver', 'dev.bundles');
  },

  _buildBundlesList: function(type, modules) {
    if (_.isArray(type)) {
      return this._buildBundlesList('bundle', type);
    }

    return _(modules).map((m) => {
      return `${type}:${this._computeClassesFolder(m)}`;
    }).join('\n');
  },

  _isModuleReady: function(module) {
    const modulePath = this._computeClassesFolder(module);
    return exists(modulePath);
  },

  _renderDevBundlesContent: function(pModules) {
    let modules = pModules || [];

    // XXX Resolve module type: bundle,library,seam,resourceBundleFragment
    return `${TXT_START}\n${this._buildBundlesList(modules)}\n${TXT_END}\n`;
  },

  _getDevBuildsPath: function() {
    return this._buildDevBundlesPath(this._getDistributionPath());
  },

  _generateDevBundleContent: function(modules) {
    let devBundlesFile = this._getDevBuildsPath();
    let content = readFile(devBundlesFile);
    return this._cleanDevBundlesFileContent(content) + this._renderDevBundlesContent(modules);
  }
};
