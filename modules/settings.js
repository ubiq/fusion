const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const packageJson = require('../package.json');
const _ = require('./utils/underscore');
const lodash = require('lodash');


// try loading in config file
const defaultConfig = {
    mode: 'mist',
    production: false,
};
try {
    _.extend(defaultConfig, require('../config.json'));
} catch (err) {
}


const argv = require('yargs')
    .usage('Usage: $0 [Fusion options] [Node options]')
    .option({
        mode: {
            alias: 'm',
            demand: false,
            default: defaultConfig.mode,
            describe: 'App UI mode: wallet, mist.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Fusion options:',
        },
        node: {
            demand: false,
            default: null,
            describe: 'Node to use: gubiq, eth',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Fusion options:',
        },
        network: {
            demand: false,
            default: null,
            describe: 'Network to connect to: main, test',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Fusion options:',
        },
        rpc: {
            demand: false,
            describe: 'Path to node IPC socket file OR HTTP RPC hostport (if IPC socket file then --node-ipcpath will be set with this value).',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Fusion options:',
        },
        /*swarmurl: {
            demand: false,
            default: 'http://localhost:8500',
            describe: 'URL serving the Swarm HTTP API. If null, Fusion will open a local node.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Fusion options:',
        },*/
        gubiqpath: {
            demand: false,
            describe: 'Path to Gubiq executable to use instead of default.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Fusion options:',
        },/*
        ethpath: {
            demand: false,
            describe: 'Path to Eth executable to use instead of default.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Fusion options:',
        },*/
        'ignore-gpu-blacklist': {
            demand: false,
            describe: 'Ignores GPU blacklist (needed for some Linux installations).',
            requiresArg: false,
            nargs: 0,
            type: 'boolean',
            group: 'Fusion options:',
        },
        'reset-tabs': {
            demand: false,
            describe: 'Reset Fusion tabs to their default settings.',
            requiresArg: false,
            nargs: 0,
            type: 'boolean',
            group: 'Fusion options:',
        },
        logfile: {
            demand: false,
            describe: 'Logs will be written to this file in addition to the console.',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Fusion options:',
        },
        loglevel: {
            demand: false,
            default: 'info',
            describe: 'Minimum logging threshold: info, debug, error, trace (shows all logs, including possible passwords over IPC!).',
            requiresArg: true,
            nargs: 1,
            type: 'string',
            group: 'Fusion options:',
        },
        /*syncmode: {
            demand: false,
            requiresArg: true,
            describe: 'Geth synchronization mode: [fast|light|full]',
            nargs: 1,
            type: 'string',
            group: 'Fusion options:',
        },*/
        version: {
            alias: 'v',
            demand: false,
            requiresArg: false,
            nargs: 0,
            describe: 'Display Fusion version.',
            group: 'Fusion options:',
            type: 'boolean',
        },
        skiptimesynccheck: {
            demand: false,
            requiresArg: false,
            nargs: 0,
            describe: 'Disable checks for the presence of automatic time sync on your OS.',
            group: 'Mist options:',
            type: 'boolean',
        },
        '': {
            describe: 'To pass options to the underlying node (e.g. Gubiq) use the --node- prefix, e.g. --node-datadir',
            group: 'Node options:',
        },
    })
    .help('h')
    .alias('h', 'help')
    .parse(process.argv.slice(1));

argv.nodeOptions = [];

for (const optIdx in argv) {
    if (optIdx.indexOf('node-') === 0) {
        argv.nodeOptions.push(`--${optIdx.substr(5)}`);

        if (argv[optIdx] !== true) {
            argv.nodeOptions.push(argv[optIdx]);
        }
    }
}

// some options are shared
if (argv.ipcpath) {
    argv.nodeOptions.push('--ipcpath', argv.ipcpath);
}
/*
if (argv.nodeOptions && argv.nodeOptions.syncmode) {
    argv.push('--syncmode', argv.nodeOptions.syncmode);
}*/

class Settings {
    init() {
        logger.setup(argv);

        this._log = logger.create('Settings');
    }

    get userDataPath() {
    // Application Aupport/Fusion
        return app.getPath('userData');
    }

    get dbFilePath() {
        const dbFileName = (this.inAutoTestMode) ? 'fusion.test.lokidb' : 'fusion.lokidb';
        return path.join(this.userDataPath, dbFileName);
    }

    get appDataPath() {
    // Application Support/
        return app.getPath('appData');
    }

    get userHomePath() {
        return app.getPath('home');
    }

    get cli() {
        return argv;
    }

    get appVersion() {
        return packageJson.version;
    }

    get appName() {
        return this.uiMode === 'mist' ? 'Fusion' : 'Ubiq Wallet';
    }

    get appLicense() {
        return packageJson.license;
    }

    get uiMode() {
        return (_.isString(argv.mode)) ? argv.mode.toLowerCase() : argv.mode;
    }

    get inProductionMode() {
        return defaultConfig.production;
    }

    get inAutoTestMode() {
        return !!process.env.TEST_MODE;
    }
    /*
    get swarmURL() {
        return argv.swarmurl;
    }
    */
    get gethPath() {
        return argv.gubiqpath;
    }
    /*
    get ethPath() {
        return argv.ethpath;
    }
    */
    get rpcMode() {
        if (argv.rpc && argv.rpc.indexOf('http') === 0)
            return 'http';
        if (argv.rpc && argv.rpc.indexOf('ws:') === 0) {
            this._log.warn('Websockets are not yet supported by Fusion, using default IPC connection');
            argv.rpc = null;
            return 'ipc';
        } else
            return 'ipc';
    }

    get rpcConnectConfig() {
        if (this.rpcMode === 'ipc') {
            return {
                path: this.rpcIpcPath,
            };
        }

        return {
            hostPort: this.rpcHttpPath,
        };
    }

    get rpcHttpPath() {
        return (this.rpcMode === 'http') ? argv.rpc : null;
    }

    get rpcIpcPath() {
        let ipcPath = (this.rpcMode === 'ipc') ? argv.rpc : null;

        if (ipcPath) {
            return ipcPath;
        }

        ipcPath = this.userHomePath;

        if (process.platform === 'darwin') {
            ipcPath += '/Library/Ubiq/gubiq.ipc';
        } else if (process.platform === 'freebsd' ||
       process.platform === 'linux' ||
       process.platform === 'sunos') {
            ipcPath += '/.ubiq/gubiq.ipc';
        } else if (process.platform === 'win32') {
            ipcPath = '\\\\.\\pipe\\gubiq.ipc';
        }

        this._log.debug(`IPC path: ${ipcPath}`);

        return ipcPath;
    }

    get nodeType() {
        return argv.node;
    }

    get network() {
        return argv.network;
    }
    /*
    get syncmode() {
        return argv.syncmode;
    }
    */
    get nodeOptions() {
        return argv.nodeOptions;
    }

    get language() {
        return this.loadConfig('ui.i18n');
    }

    set language(langCode) {
        this.saveConfig('ui.i18n', langCode);
    }

    get skiptimesynccheck() {
        return argv.skiptimesynccheck;
    }

    initConfig() {
        global.config.insert({
            ui: {
                i18n: i18n.getBestMatchedLangCode(app.getLocale())
            }
        });
    }

    saveConfig(key, value) {
        let obj = global.config.get(1);

        if (!obj) {
            this.initConfig();
            obj = global.config.get(1);
        }

        if (lodash.get(obj, key) !== value) {
            lodash.set(obj, key, value);
            global.config.update(obj);

            this._log.debug(`Settings: saveConfig('${key}', '${value}')`);
            this._log.trace(global.config.data);
        }
    }

    loadConfig(key) {
        const obj = global.config.get(1);

        if (!obj) {
            this.initConfig();
            return this.loadConfig(key);
        }

        this._log.trace(`Settings: loadConfig('${key}') = '${lodash.get(obj, key)}'`);

        return lodash.get(obj, key);
    }

    loadUserData(path2) {
        const fullPath = this.constructUserDataPath(path2);

        this._log.trace('Load user data', fullPath);

      // check if the file exists
        try {
            fs.accessSync(fullPath, fs.R_OK);
        } catch (err) {
            return null;
        }

      // try to read it
        try {
            const data = fs.readFileSync(fullPath, { encoding: 'utf8' });
            this._log.debug(`Reading "${data}" from ${fullPath}`);
            return data;
        } catch (err) {
            this._log.warn(`File not readable: ${fullPath}`, err);
        }

        return null;
    }


    saveUserData(path2, data) {
        if (!data) return; // return so we dont write null, or other invalid data

        const fullPath = this.constructUserDataPath(path2);

        try {
            this._log.debug(`Saving "${data}" to ${fullPath}`);
            fs.writeFileSync(fullPath, data, { encoding: 'utf8' });
        } catch (err) {
            this._log.warn(`Unable to write to ${fullPath}`, err);
        }
    }


    constructUserDataPath(filePath) {
        return path.join(this.userDataPath, filePath);
    }

}

module.exports = new Settings();
