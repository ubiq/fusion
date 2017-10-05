const _ = global._;
const Windows = require('./windows');
const Settings = require('./settings');
const log = require('./utils/logger').create('updateChecker');
const got = require('got');
const semver = require('semver');


/**
 * Check for updates to the app.
 * @return {[type]} [description]
 */
const check = exports.check = () => {
    log.info('Check for update...');

    let str = null;

    switch (Settings.uiMode) {  // eslint-disable-line default-case
    case 'mist':
        str = 'fusion';		// we need to search for Fusion in the release:name
        break;
    case 'fusion':
        str = 'fusion';
        break;
    case 'wallet':
        str = 'wallet';
        break;
    }

    return got('https://api.github.com/repos/ubiq/fusion/releases', {
        timeout: 3000,
        json: true,
    })
    .then((res) => {
        const releases = _.filter(res.body, (release) => {
            // as at v0.9.1 the 'release.name' does not contain the words Mist, Fusion or Wallet
            // as a result the new version check fails. All fusion releases to date have the word
            // 'Version' in the release.name .. so we can search for that and check will succeed.
            // If future release names include the words 'Fusion' and 'Wallet' then the below hack
            // can be removed. Refer to the naming returned by the ethereum/mist/releases API call
            // eg. "name": "Ethereum Wallet and Mist 0.9.1",
            return (
                !_.get(release, 'draft')
                && _.get(release, 'name', '').toLowerCase().indexOf(str) >= 0
                || _.get(release, 'name', '').indexOf('Version') >= 0	// nasty workaround for fusion
            );
        });

        if (!releases.length) {
            log.debug('No releases available to check against.');

            return;
        }

        const latest = releases[0];

        if (semver.gt(latest.tag_name, Settings.appVersion)) {
            log.info(`App (${Settings.appVersion}) is out of date. New ${latest.tag_name} found.`);

            return {
                name: latest.name,
                version: latest.tag_name,
                url: latest.html_url,
            };
        }

        log.info('App is up-to-date.');
    })
    .catch((err) => {
        log.error('Error checking for update', err);
    });
};


function showWindow(options) {
    log.debug('Show update checker window');

    return Windows.createPopup('updateAvailable', _.extend({
        useWeb3: false,
        electronOptions: {
            width: 580,
            height: 250,
            alwaysOnTop: true,
            resizable: false,
            maximizable: false,
        },
    }, options));
}


exports.run = () => {
    check().then((update) => {
        if (update) {
            showWindow({
                sendData: {
                    uiAction_checkUpdateDone: update,
                },
            });
        }
    }).catch((err) => {
        log.error(err);
    });
};


exports.runVisibly = () => {
    const wnd = showWindow({
        sendData: 'uiAction_checkUpdateInProgress',
    });

    wnd.on('ready', () => {
        check().then((update) => {
            wnd.send({
                uiAction_checkUpdateDone: update,
            });
        }).catch((err) => {
            log.error(err);

            wnd.send('uiAction_checkUpdateDone');
        });
    });
};
