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
// Load your modules here, e.g.:
// const fs = require("fs");

class Cloudrain extends utils.Adapter {

    static cloudRainClientId = "939c77e3-3f10-11ec-9174-03e164aff1e5";
    static cloudRainClientSecret = "939c8343-3f10-11ec-b4ad-03e164aff1e5";
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
		// Initialize your adapter here

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.info("config Username: " + this.config.Username);
		this.log.info("config Password: " + this.config.Password);
		this.log.info("config PasswordRepeat: " + this.config.PasswordRepeat);
		this.log.info("config Data Request Interval [s]: " + this.config.RequestInterval);

		await this.getCloudRainToken();

        this.debugLogConnectionState();

        if (this.cloudRainTokenValid) {
		    await this.createOrUpdateCloudRainZones();
        }
        
		this.log.debug("Init done");
		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		await this.setObjectNotExistsAsync("testVariable", {
			type: "state",
			common: {
				name: "testVariable",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		this.subscribeStates("testVariable");
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates("lights.*");
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates("*");

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)
		await this.setStateAsync("testVariable", true);

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		await this.setStateAsync("testVariable", { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync("admin", "iobroker");
		this.log.info("check user admin pw iobroker: " + result);

		result = await this.checkGroupAsync("admin", "admin");
		this.log.info("check group user admin group admin: " + result);
	}

	newMethod() {
		return this;
	}

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
			// clearInterval(interval1);

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

        this.log.debug(`cloudRainTokenValid: ${this.cloudRainTokenValid}` );
        this.log.debug(`cloudRainAccessToken: ${this.cloudRainAccessToken}`);
        this.log.debug(`cloudRainRefreshToken: ${this.cloudRainRefreshToken}`);
        this.log.debug(`cloudRainTokenExpireIn: ${this.cloudRainTokenExpireIn}`);
    }

	async getCloudRainToken(){

        if (this.cloudRainTokenValid == true) return true;

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
                    this.cloudRainTokenValid = true;
                    this.log.debug("Cloudrain Token generation successful. Token valid:" + this.cloudRainTokenValid);
                }
            } else {
                this.log.warn(`Get Cloudrain Token failed. StatusCode: ${response.statusCode} Body: ${response.body}`);
            }
        }        
        catch (error) {
                this.cloudRainTokenValid = false;
                this.log.error("Get Cloudrain Token request failed badly.");
        }
	}

    async createOrUpdateCloudRainZones(){
        this.log.debug("ToDo: Fetch and Update Cloud Rain Zones");
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