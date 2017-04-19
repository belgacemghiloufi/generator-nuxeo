const maven = require('../../utils/maven');
const settings = require('../../utils/maven-settings');
const path = require('path');
const fs = require('fs-extra');

const STUDIO_SERVER = 'nuxeo-studio';
const HF_RELEASES = 'hotfix-releases';
const HF_SNAPSHOTS = 'hotfix-snapshots';
const MAVEN_GAV = 'maven:gav';

module.exports = {
  _saveSettingsAnswers: function (updateSettings = false, force = false) {
    this._mvnSettings = {
      updateSettings,
      force
    };
  },

  _getMavenGav: function () {
    return this.config.get(MAVEN_GAV);
  },
  _setMavenGav: function (value) {
    this.config.set(MAVEN_GAV, value);
  },

  _addDependency: function (gav) {
    // add GAV to the root pom.xml
    const targetPom = path.join(this.destinationRoot(), 'pom.xml');
    const pom = maven.open(this.fs.read(targetPom));
    pom.addDependency(gav);
    pom.save(this.fs, targetPom);

    // Add the dependecy to each jar modules; and without the version as
    // it is hanlded by the dependency management
    const [groupId, artifactId] = gav.split(':');
    const cgav = `${groupId}:${artifactId}`;
    this._setMavenGav(cgav);

    // add dependency for each modules - only if it's a bom
    pom.modules().map((elt) => {
      const fp = path.join(this.destinationRoot(), elt, 'pom.xml');
      return {
        fp,
        pom: maven.open()
      };
    }).filter((m) => {
      // Skip Modules that do not produces a jar
      return m.pom.packaging() === 'jar';
    }).forEach((m) => {
      m.pom.addDependency(cgav);
      m.pom.save(this.fs, m.fp);
    });
  },

  _removeDependency: function (g) {
    const gav = g || this._getMavenGav();
    if (!gav) {
      return;
    }

    const targetPom = path.join(this.destinationRoot(), 'pom.xml');
    const pom = maven.open(this.fs.read(targetPom));
    pom.removeDependency(gav);
    this.log.info(`Removing: ${gav}`);
    pom.save(this.fs, targetPom);

    // remove dependency for each modules - only if it's a bom
    pom.modules().map((elt) => {
      const fp = path.join(this.destinationRoot(), elt, 'pom.xml');
      return {
        fp,
        pom: maven.open(this.fs.read(fp))
      };
    }).forEach((m) => {
      m.pom.removeDependency(gav);
      m.pom.save(this.fs, m.fp);
    });
  },

  _hasCredentials: function () {
    return settings.open().containsServer(STUDIO_SERVER);
  },

  _canAddCredentials: function () {
    return !!this._mvnSettings.updateSettings;
  },

  _addConnectCredentials: function (username, password) {
    const ms = settings.open();

    ms.addServer([HF_SNAPSHOTS, username, password].join(':'));
    ms.addServer([HF_RELEASES, username, password].join(':'));
    ms.addServer([STUDIO_SERVER, username, password].join(':'), this._mvnSettings.force);

    ms.save(this.fs);
  },

  _containsPom: function (folder) {
    const f = folder || this.destinationRoot();
    const p = path.join(f, 'pom.xml');

    return fs.existsSync(p);
  },

  _getSettingsPath: function () {
    return path.normalize(settings.locateFile());
  }
};
