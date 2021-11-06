![Logo](admin/cloudrain.png)
# ioBroker.cloudrain

[![NPM version](https://img.shields.io/npm/v/iobroker.cloudrain.svg)](https://www.npmjs.com/package/iobroker.cloudrain)
[![Downloads](https://img.shields.io/npm/dm/iobroker.cloudrain.svg)](https://www.npmjs.com/package/iobroker.cloudrain)
![Number of Installations](https://iobroker.live/badges/cloudrain-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/cloudrain-stable.svg)
[![Dependency Status](https://img.shields.io/david/hendrikhoffmann/iobroker.cloudrain.svg)](https://david-dm.org/hendrikhoffmann/iobroker.cloudrain)

[![NPM](https://nodei.co/npm/iobroker.cloudrain.png?downloads=true)](https://nodei.co/npm/iobroker.cloudrain/)

**Tests:** ![Test and Release](https://github.com/hendrikhoffmann/ioBroker.cloudrain/workflows/Test%20and%20Release/badge.svg)

## cloudrain adapter for ioBroker

NOTE: This is Work in Progress and nothing works so far :)

This Adapter connects iobroker to the Cloudrain Smart Irrigation System

## Developer manual
This section is intended for the developer. It can be deleted later

### Getting started

You are almost done, only a few steps left:
1. Clone the repository from GitHub to a directory on your PC:
	```bash
	git clone https://github.com/hendrikhoffmann/ioBroker.cloudrain
	```

1. Head over to [main.js](main.js) and start programming!

### Best Practices
We've collected some [best practices](https://github.com/ioBroker/ioBroker.repositories#development-and-coding-best-practices) regarding ioBroker development and coding in general. If you're new to ioBroker or Node.js, you should
check them out. If you're already experienced, you should also take a look at them - you might learn something new :)

### Scripts in `package.json`
Several npm scripts are predefined for your convenience. You can run them using `npm run <scriptname>`
| Script name | Description |
|-------------|-------------|
| `build:parcel` | Compile the React sources. |
| `watch:parcel` | Compile the React sources and watch for changes. |
| `test:js` | Executes the tests you defined in `*.test.js` files. |
| `test:package` | Ensures your `package.json` and `io-package.json` are valid. |
| `test:unit` | Tests the adapter startup with unit tests (fast, but might require module mocks to work). |
| `test:integration` | Tests the adapter startup with an actual instance of ioBroker. |
| `test` | Performs a minimal test run on package files and your tests. |
| `check` | Performs a type-check on your code (without compiling anything). |
| `lint` | Runs `ESLint` to check your code for formatting errors and potential bugs. |
| `release` | Creates a new release, see [`@alcalzone/release-script`](https://github.com/AlCalzone/release-script#usage) for more details. |

### Writing tests
When done right, testing code is invaluable, because it gives you the 
confidence to change your code while knowing exactly if and when 
something breaks. A good read on the topic of test-driven development 
is https://hackernoon.com/introduction-to-test-driven-development-tdd-61a13bc92d92. 
Although writing tests before the code might seem strange at first, but it has very 
clear upsides.

The template provides you with basic tests for the adapter startup and package files.
It is recommended that you add your own tests into the mix.

### Publishing the adapter
Using GitHub Actions, you can enable automatic releases on npm whenever you push a new git tag that matches the form 
`v<major>.<minor>.<patch>`. We **strongly recommend** that you do. The necessary steps are described in `.github/workflows/test-and-release.yml`.

Since you installed the release script, you can create a new
release simply by calling:
```bash
npm run release
```
Additional command line options for the release script are explained in the
[release-script documentation](https://github.com/AlCalzone/release-script#command-line).

To get your adapter released in ioBroker, please refer to the documentation 
of [ioBroker.repositories](https://github.com/ioBroker/ioBroker.repositories#requirements-for-adapter-to-get-added-to-the-latest-repository).

### Test the adapter manually with dev-server
Please use `dev-server` to test and debug your adapter.

You may install and start `dev-server` by calling from your dev directory:
```bash
npm install --global @iobroker/dev-server
dev-server setup
dev-server watch
```

Please refer to the [`dev-server` documentation](https://github.com/ioBroker/dev-server#readme) for more details.

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

### **WORK IN PROGRESS**
* (hendrikhoffmann) initial release

## License
MIT License

Copyright (c) 2021 hendrikhoffmann <hhoffmann@web.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
