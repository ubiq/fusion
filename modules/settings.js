const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const packageJson = require('../package.json');
const _ = require('./utils/underscore');


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
        version: {
            alias: 'v',
            demand: false,
            requiresArg: false,
            nargs: 0,
            describe: 'Display Fusion version.',
            group: 'Fusion options:',
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

        break;
    }
}

// some options are shared
if (argv.ipcpath) {
    argv.nodeOptions.push('--ipcpath', argv.ipcpath);
}


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
        const dbFileName = (this.inAutoTestMode) ? 'mist.test.lokidb' : 'mist.lokidb';
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
        return this.uiMode === 'mist' ? 'Fusion' : 'Ethereum Wallet';
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

    get gethPath() {
        return argv.gubiqpath;
    }
    /*
    get ethPath() {
        return argv.ethpath;
    }
    */
    get rpcMode() {
        return (argv.rpc && argv.rpc.indexOf('.ipc') < 0) ? 'http' : 'ipc';
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

    get nodeOptions() {
        return argv.nodeOptions;
    }

    loadUserData(path) {
        const fullPath = this.constructUserDataPath(path);

        this._log.trace('Load user data', fullPath);

      // check if the file exists
        try {
            fs.accessSync(fullPath, fs.R_OK);
        } catch (err) {
            return null;
        }

      // try to read it
        try {
            return fs.readFileSync(fullPath, { encoding: 'utf8' });
        } catch (err) {
            this._log.warn(`File not readable: ${fullPath}`, err);
        }

        return null;
    }


    saveUserData(path2, data) {
        if (!data) return; // return so we dont write null, or other invalid data

        const fullPath = this.constructUserDataPath(path2);

        try {
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
