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

This Adapter connects iobroker to the Cloudrain Smart Irrigation System
See https://cloudrain.com/.

The irrigation system consists of at least one controller.
Each irrigation controller can control different zones (valves).
Both reading current irrigation status and manual start/stop of irrigation for each zone is possible.

You might start/stop irrigations through the App and monitor the changes.

### Configuration
- Insert your Cloudrain Username + Password in the Instance Configuration
- The Cloudrain API is polled at regular intervals for updates. 
Set this Data Request Interval according to your irrigation cycles.

### Object Tree Value Description

For each Zone, the Read-Only Values are
- irrigating : boolean value indicating wether the irrigation is currently running
- startTime : the start time (HH:MM) of the current irrigation cycle or --:-- if no irrigation is running
- plannedEndTime : the planned end time (HH:MM) of the current irrigation cycle or --:-- if no irrigation is running
- duration : the total duration of the current irrigation cycle in seconds
- remainingSeconds : the remaining duration of the current irrigation cycle in seconds

Write-Values
- startIrrigation - set a duration value in seconds to immediatly start an irrigation cycle, set a 0 to stop a currently running cycle

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
- Updated Documentation

### 0.0.7 (2021-11-08)
- Updated Documentation

### 0.0.6 (2021-11-08)
- Updated Documentation

### 0.0.5 (2021-11-08)
- Implemented info.connection to indicate valid Cloudrain access token
- Removed Boilerplate Code and Refactored some Stuff
- Implemented Start / Stop irrigation 
- Updated Documentation

### 0.0.3 (2021-11-07)
npm release script hazzle

### 0.0.2 (2021-11-07)
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
