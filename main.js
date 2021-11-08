"use strict";


/*
 * Created with @iobroker/create-adapter v2.0.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const util = require('util');
const request = require("request");
const { resolve } = require("path");
const { rejects } = require("assert");
const { default: SelectInput } = require("@material-ui/core/Select/SelectInput");
// Load your modules here, e.g.:
// const fs = require("fs");

class Cloudrain extends utils.Adapter {

    static cloudRainClientId = "939c77e3-3f10-11ec-9174-03e164aff1e5";
    static cloudRainClientSecret = "939c8343-3f10-11ec-b4ad-03e164aff1e5";
    cloudRainZones = {};
    mainLoopIntervalID = 0;
    cloudRainAccessToken = '';
    cloudRainRefreshToken = '';
    cloudRainTokenExpireIn = 0;
    cloudRainTokenValid = false;

    /**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "cloudrain",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize adapter

		this.log.info("config Username: " + this.config.Username);
		// this.log.info("config Password: " + this.config.Password);
		// this.log.info("config PasswordRepeat: " + this.config.PasswordRepeat);
		this.log.info("config Data Request Interval [s]: " + this.config.RequestInterval);

		await this.getCloudRainToken();
        this.debugLogConnectionState();

        if (this.getConnected()) {
            await this.createOrUpdateCloudRainControllers();
		    await this.createOrUpdateCloudRainZones();
            this.initIrrigationStatusLoop();
            this.log.debug("Init successful");
        } else {
            this.log.warn("Unable to Connect to Cloudrain API. Make sure Username and Password are correct and https://api.cloudrain.com/v1/ is reachable from your Network.");
            this.log.warn("No further retries. Restart the adapter manually.");
        }
        
		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
//		this.subscribeStates("testVariable");
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates("lights.*");
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates("*");

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		// await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		// await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		// await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync("admin", "iobroker");
		this.log.info("check user admin pw iobroker: " + result);

		result = await this.checkGroupAsync("admin", "admin");
		this.log.info("check group user admin group admin: " + result);
	}

	// newMethod() {
	// 	return this;
	// }

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			if (this.mainLoopIntervalID != 0) {
                this.log.debug("clearing Interval " + this.mainLoopIntervalID);
                clearInterval( this.mainLoopIntervalID);
            }

			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

	debugLogConnectionState(){

        this.log.debug(`cloudRainTokenValid: ${this.getConnected()}` );
        this.log.debug(`cloudRainAccessToken: ${this.cloudRainAccessToken}`);
        this.log.debug(`cloudRainRefreshToken: ${this.cloudRainRefreshToken}`);
        this.log.debug(`cloudRainTokenExpireIn: ${this.cloudRainTokenExpireIn}`);
    }

	async getCloudRainToken(){

        if (this.getConnected()) return true;

		const options = {
			"method": "POST",
			"url": "https://api.cloudrain.com/v1/token",
			"headers": {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			form: {
				"grant_type": "password",
				"client_id": Cloudrain.cloudRainClientId,
				"client_secret": Cloudrain.cloudRainClientSecret,
				"username": this.config.Username,
				"password": this.config.Password,
				"scope": "read start_irrigation"
			}
		};
        const requestPromise = util.promisify(request);
        try {
            const response = await requestPromise(options);
			const resp = JSON.parse(response.body);
            if (resp.token_type && resp.token_type == "Bearer" ){
                this.cloudRainAccessToken   = resp.access_token;
                this.cloudRainRefreshToken  = resp.refresh_token;
                this.cloudRainTokenExpireIn = resp.expires_in;
                if (this.cloudRainAccessToken && this.cloudRainRefreshToken) {
                    this.setConnected(true);
                    this.log.debug("Cloudrain Token generation successful.");
                }
            } else {
                this.log.warn(`Get Cloudrain Token failed. StatusCode: ${response.statusCode} Body: ${response.body}`);
            }
        }        
        catch (error) {
            this.setConnected(false);
                this.log.error("Get Cloudrain Token request failed. Check network connection.");
        }
	}
    async createOrUpdateCloudRainControllers(){

        await this.getCloudRainToken();
        if (!this.getConnected())  return false;

		const options = {
            "method": "GET",
            "url": "https://api.cloudrain.com/v1/controllers",
            "headers": {
              "Authorization": "Bearer "+ this.cloudRainAccessToken
            }
          };
        const requestPromise = util.promisify(request);
        try {
            const response = await requestPromise(options);
            if (response.statusCode == 200){
			    const resp = JSON.parse(response.body);
                const userControllers = resp.userControllers;
                userControllers.forEach((controller) => {
                    this.log.debug(`Controller found: controllerId: ${controller.controllerId} controllerName: ${controller.controllerName}`);
                    this.setObjectNotExistsAsync(controller.controllerId, {
                        type: "device",
                        common: {
                            name: controller.controllerName                            
                        },
                        native: {},
                    });
                });
            } else {
                this.setConnected(false);
                this.log.warn(`Get Cloudrain Controllers failed. StatusCode: ${response.statusCode} Body: ${response.body}`);
            }
        }        
        catch (error) {
                this.setConnected(false);
                this.log.error("Get Cloudrain Controllers request failed. Check network connection.");
        }
	}


    async createOrUpdateCloudRainZones(){

        await this.getCloudRainToken();
        if (!this.getConnected())  return false;

		const options = {
            "method": "GET",
            "url": "https://api.cloudrain.com/v1/zones",
            "headers": {
              "Authorization": "Bearer "+ this.cloudRainAccessToken
            }
          };
        const requestPromise = util.promisify(request);
        try {
            const response = await requestPromise(options);
            if (response.statusCode == 200){
			    const resp = JSON.parse(response.body);
                this.cloudRainZones = resp.userZones;
                this.cloudRainZones.forEach((zone) => {
                    this.log.debug(`Zone found: zone: ${zone.zoneId} zoneName: ${zone.zoneName} controllerId: ${zone.controllerId} controllerName: ${zone.controllerName} `);
                    this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId, {
                        type: "channel",
                        common: {
                            name: zone.zoneName                            
                        },
                        native: {},
                    }).then(() => {
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".irrigating" , {
                            type: "state",
                            common: {
                                name: "irrigating",
                                type: "boolean",
                                role: "indicator.state",
                                read: true,
                                write: true,
                            },
                            native: {},
                        });
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".startTime" , {
                            type: "state",
                            common: {
                                name: "startTime",
                                type: "string",
                                role: "level",
                                read: true,
                                write: false,
                            },
                            native: {},
                        });
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".plannedEndTime" , {
                            type: "state",
                            common: {
                                name: "plannedEndTime",
                                type: "string",
                                role: "level",
                                read: true,
                                write: true,
                            },
                            native: {},
                        });
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".duration" , {
                            type: "state",
                            common: {
                                name: "duration",
                                type: "number",
                                unit: "seconds",
                                role: "value",
                                read: true,
                                write: true,
                            },
                            native: {},
                        });
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".remainingSeconds" , {
                            type: "state",
                            common: {
                                name: "remainingSeconds",
                                type: "number",
                                unit: "seconds",
                                role: "value",
                                read: true,
                                write: true,
                            },
                            native: {},
                        });
    
                    });

                });
            } else {
                this.setConnected(false);
                this.log.warn(`Get Cloudrain Zones failed. StatusCode: ${response.statusCode} Body: ${response.body}`);
                
            }
        }        
        catch (error) {
            this.setConnected(false);
            this.log.error("Get Cloudrain Zones request failed.  Check network connection.");
        }
	}

    async updateIrrigationStatus() {
        this.log.debug(` updateIrrigationStatus`);
        await this.getCloudRainToken();
        if (!this.getConnected())  return;

		const options = {
            "method": "GET",
            "url": "https://api.cloudrain.com/v1/irrigations",
            "headers": {
              "Authorization": "Bearer "+ this.cloudRainAccessToken
            }
          };
        const requestPromise = util.promisify(request);
        try {
            const response = await requestPromise(options);
            if (response.statusCode == 200){
			    const currentlyRunningZones = JSON.parse(response.body).currentlyRunningZones;
                // reset all non-running zones
                this.cloudRainZones.forEach((zone) => {
                    let found = false;
                    currentlyRunningZones.forEach((currentZone) => {    
                        if (currentZone.zoneId == zone.zoneId) found = true;
                    });
                    if (!found) {
                        this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".irrigating",       { val: false, ack: true });
                        this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".startTime",        { val: "--:--", ack: true });
                        this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".plannedEndTime",   { val: "--:--", ack: true });
                        this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".duration",         { val: 0, ack: true });
                        this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".remainingSeconds", { val: 0, ack: true });
                        }
                });
                // update all running zones
                currentlyRunningZones.forEach((zone) => {
                    this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".irrigating",           { val: true, ack: true });
                    this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".startTime",            { val: zone.startTime, ack: true });
                    this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".plannedEndTime",       { val: zone.plannedEndTime, ack: true });
                    this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".duration",             { val: zone.duration, ack: true });
                    this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".remainingSeconds",     { val: zone.remainingSeconds, ack: true });
                });

            } else {
                this.setConnected(false);
                this.log.warn(`Get Cloudrain irrigations failed. StatusCode: ${response.statusCode} Body: ${response.body}`);
            }
        }        
        catch (error) {
            this.setConnected(false);
            this.log.error("Get Cloudrain irrigations request failed. Check network connection.");
        }

    }

    async initIrrigationStatusLoop() {

        this.mainLoopIntervalID = this.setInterval(() => {
            this.updateIrrigationStatus();
            }, this.config.RequestInterval*1000);
            
    }
    getConnected() {
        return this.cloudRainTokenValid;
    }
    setConnected(newCloudRainTokenState) {
        if (this.cloudRainTokenValid !== newCloudRainTokenState) {
            this.cloudRainTokenValid = newCloudRainTokenState;
            this.setStateAsync('info.connection', newCloudRainTokenState, true);
        }
    }
    
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Cloudrain(options);
} else {
	// otherwise start the instance directly
	new Cloudrain();
}