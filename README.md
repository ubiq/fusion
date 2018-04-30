# Fusion Browser

The Fusion browser is the tool of choice to browse and use Ðapps.

For the Fusion API see the [MISTAPI.md](MISTAPI.md).

Please note that this repository is the Electron host for the Meteor based wallet dapp whose repository is located here: https://github.com/ubiq/meteor-dapp-wallet.

## Help and troubleshooting

In order to get help regarding Fusion or Ubiq Wallet, please follow:

1.  Please check the [Fusion troubleshooting guide](https://github.com/ubiq/fusion/wiki).
1.  Go to the [Ubiq Discord](https://discordapp.com/invite/HF6vEGF) to connect with the community for instant help.
1.  Search for [similar issues](https://github.com/ubiq/fusion/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Canonical%22) and potential help.
1.  Or create a [new issue](https://github.com/ubiq/fusion/issues).

## How to contribute

Contributions via Pull Requests are so welcome. You can see where to help looking for issues with the [Enhancement](https://github.com/ubiq/fusion/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Enhancement%22) or [Bug](https://github.com/ubiq/fusion/issues?q=is%3Aopen+is%3Aissue+label%3A%22Type%3A+Bug%22) labels. We can help guiding you towards the solution.

## Installation

If you want to install the app from a pre-built version on the [release page](https://github.com/ubiq/fusion/releases),

you can simply run the executeable after download.

For updating simply download the new version and copy it over the old one (keep a backup of the old one if you want to be sure).

### Linux .zip installs

In order to install from .zip files, please install `libgconf2-4` first:

```bash
apt-get install libgconf2-4
```

### Config folder

The data folder for Mist is stored in other places:

* Windows `%APPDATA%\Fusion`
* macOS `~/Library/Application\ Support/Fusion`
* Linux `~/.config/Fusion`

## Development

For development, a Meteor server will need to be started to assist with live reload and CSS injection.
Once a Fusion version is released the Meteor frontend part is bundled using the `meteor-build-client` npm package to create pure static files.

### Dependencies

To run fusion in development you need:

* [Node.js](https://nodejs.org) `v7.x` (use the prefered installation method for your OS)
* [Meteor](https://www.meteor.com/install) javascript app framework
* [Yarn](https://yarnpkg.com/) package manager
* [Electron](http://electron.atom.io/) `v1.8.4` cross platform desktop app framework
* [Gulp](http://gulpjs.com/) build and automation system

Install the latter ones via:

```bash
$ curl https://install.meteor.com/ | sh
$ curl -o- -L https://yarnpkg.com/install.sh | bash
$ yarn global add electron@1.8.4
$ yarn global add gulp
```

### Initialisation

Now you're ready to initialise Fusion for development:

```bash
$ git clone https://github.com/ubiq/fusion.git
$ cd fusion
$ yarn
```

To update Fusion in the future, run:

```bash
$ cd fusion
$ git pull
$ yarn
```

### Run Fusion

For development we start the interface with a Meteor server for autoreload etc.
_Start the interface in a separate terminal window:_

```bash
$ cd fusion/interface && meteor --no-release-check
```

In the original window you can then start Fusion with:

```bash
$ cd fusion
$ yarn dev:electron
```

_NOTE: client-binaries (e.g. [gubiq](https://github.com/ubiq/go-ubiq)) specified in [clientBinaries.json](https://github.com/ethereum/mist/blob/master/clientBinaries.json) will be checked during every startup and downloaded if out-of-date, binaries are stored in the [config folder](#config-folder)_

_NOTE: use `--help` to display available options, e.g. `--loglevel debug` (or `trace`) for verbose output_

### Run the Wallet

Start the wallet app for development, _in a separate terminal window:_

```bash
$ cd fusion/interface && meteor --no-release-check
```

In another terminal:

```bash
$ cd my/path/meteor-dapp-wallet/app && meteor --port 3050
```

In the original window you can then start Fusion using wallet mode:

```bash
$ cd fusion
$ yarn dev:electron --mode wallet
```

### Connecting to node via HTTP instead of IPC

This is useful if you have a node running on another machine, though note that
it's less secure than using the default IPC method.

```bash
$ yarn dev:electron --rpc http://localhost:8588
```

### Passing options to Gubiq

You can pass command-line options directly to Gubiq by prefixing them with `--node-` in
the command-line invocation:

```bash
$ yarn dev:electron --mode mist --node-rpcport 19343 --node-networkid 2
```

The `--rpc` Fusion option is a special case. If you set this to an IPC socket file
path then the `--ipcpath` option automatically gets set, i.e.:

```bash
$ yarn dev:electron --rpc /my/gubiq.ipc
```

...is the same as doing...

```bash
$ yarn dev:electron --rpc /my/gubiq.ipc --node-ipcpath /my/gubiq.ipc
```

### Creating a local private net

See this guide to quickly set up a local private network on your computer:
https://gist.github.com/evertonfraga/9d65a9f3ea399ac138b3e40641accf23

### Using Fusion with a privatenet

To run a private network you will need to set the IPC path, network id and data
folder:

```bash
$ yarn dev:electron --rpc ~/Library/Ubiq/gubiq.ipc --node-networkid 1234 --node-datadir ~/Library/Ubiq/privatenet
```

_NOTE: since `ipcpath` is also a Fusion option you do not need to also include a
`--node-ipcpath` option._

You can also launch `gubiq` separately with the same options prior starting
Fusion.


### Deployment

Our build system relies on [gulp](http://gulpjs.com/) and [electron-builder](https://github.com/electron-userland/electron-builder/).

#### Dependencies

[meteor-build-client](https://github.com/frozeman/meteor-build-client) bundles the [meteor](https://www.meteor.com/)-based interface. Install it via:

```bash
$ npm install -g meteor-build-client
```

Furthermore cross-platform builds require additional [`electron-builder` dependencies](https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build#linux). On macOS those are:

Windows deps:

```bash
$ brew install wine --without-x11 mono makensis
```

Linux deps:

```bash
$ brew install gnu-tar libicns graphicsmagick xz
```

#### Generate packages

To generate the binaries for Fusion run:

```bash
$ gulp
```

To generate the Ubiq Wallet (this will pack the one Ðapp from https://github.com/ubiq/meteor-dapp-wallet):

```bash
$ gulp --wallet
```

The generated binaries will be under `dist_mist/release` or `dist_wallet/release`.

##### platform

To build binaries for specific platforms (default: all available) use the following flags:

```bash
$ gulp --mac      # mac
$ gulp --linux    # linux
$ gulp --win      # windows
```

##### walletSource

With the `walletSource` you can specify the Wallet branch to use, default is `develop`:

    $ gulp --wallet --walletSource develop

Options are:

* `develop`
* `local` Will try to build the wallet from [mist/]../meteor-dapp-wallet/app

_Note: applicable only when combined with `--wallet`_

##### skipTasks

When building a binary, you can optionally skip some tasks — generally for testing purposes.

```bash
$ gulp --mac --skipTasks=bundling-interface,release-dist
```

##### Checksums

Spits out the MD5 checksums of distributables.

It expects installer/zip files to be in the generated folders e.g. `dist_mist/release`

```bash
$ gulp checksums [--wallet]
```

## Testing

Tests are ran using [Spectron](https://github.com/electron/spectron/), a webdriver.io runner built for Electron.

First make sure to build Mist with:

```bash
$ gulp
```

Then run the tests:

```bash
$ gulp test
```

_Note: Integration tests are not yet supported on Windows._
